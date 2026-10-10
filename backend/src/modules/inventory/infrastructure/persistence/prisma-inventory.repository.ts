import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  AdjustmentCommand,
  AdjustmentResult,
  IInventoryRepository,
  InventoryListFilter,
  InventoryListItem,
  PurchaseOrderSnapshot,
  ReceiptCommand,
  ReceiptResult,
  StoreInfo,
} from '../../domain/repositories/inventory.repository.interface';
import { allocateByExpiry, weightedAverageCost } from '../../domain/services/stock-calculation';

type Tx = Prisma.TransactionClient;

const RECEIVABLE_STATUSES = ['SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'];
// Neon ở xa, phiếu nhiều dòng dễ vượt hạn 5 giây mặc định của Prisma
const TX_OPTIONS = { timeout: 15000 };

const optionLabel = (values: (string | null)[]): string | null => {
  const parts = values.filter((v): v is string => !!v);
  return parts.length ? parts.join(' / ') : null;
};

@Injectable()
export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStore(storeId: string): Promise<StoreInfo | null> {
    return this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, code: true, name: true, type: true, isActive: true },
    });
  }

  async variantExists(productVariantId: string): Promise<boolean> {
    const count = await this.prisma.productVariant.count({ where: { id: productVariantId } });
    return count > 0;
  }

  async findMany(filter: InventoryListFilter): Promise<{ items: InventoryListItem[]; total: number }> {
    const statusWhere: Prisma.InventoryWhereInput =
      filter.status === 'LOW_STOCK'
        ? { quantity: { lte: this.prisma.inventory.fields.minQuantity } }
        : filter.status === 'OUT_OF_STOCK'
          ? { availableQuantity: { lte: 0 } }
          : filter.status === 'IN_STOCK'
            ? { availableQuantity: { gt: 0 } }
            : {};

    const where: Prisma.InventoryWhereInput = {
      ...statusWhere,
      storeId: filter.storeIds ? { in: filter.storeIds } : undefined,
      variant: {
        product: { categoryId: filter.categoryId, brandId: filter.brandId },
      },
      OR: filter.search
        ? [
            { variant: { sku: { contains: filter.search, mode: 'insensitive' } } },
            { variant: { barcode: filter.search } },
            { variant: { product: { name: { contains: filter.search, mode: 'insensitive' } } } },
          ]
        : undefined,
    };

    const [rows, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          store: { select: { id: true, code: true, name: true } },
          variant: {
            select: {
              id: true,
              sku: true,
              barcode: true,
              option1Value: true,
              option2Value: true,
              option3Value: true,
              product: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ store: { code: 'asc' } }, { variant: { sku: 'asc' } }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    const expiries = rows.length
      ? await this.prisma.batch.groupBy({
          by: ['storeId', 'productVariantId'],
          where: {
            storeId: { in: [...new Set(rows.map((r) => r.storeId))] },
            productVariantId: { in: [...new Set(rows.map((r) => r.productVariantId))] },
            isActive: true,
            quantity: { gt: 0 },
          },
          _min: { expiryDate: true },
        })
      : [];
    const expiryOf = new Map(
      expiries.map((e) => [`${e.storeId}:${e.productVariantId}`, e._min.expiryDate]),
    );

    const items = rows.map((r) => ({
      id: r.id,
      store: r.store,
      variant: {
        id: r.variant.id,
        sku: r.variant.sku,
        barcode: r.variant.barcode,
        optionLabel: optionLabel([r.variant.option1Value, r.variant.option2Value, r.variant.option3Value]),
        productId: r.variant.product.id,
        productName: r.variant.product.name,
      },
      quantity: r.quantity,
      reservedQuantity: r.reservedQuantity,
      availableQuantity: r.availableQuantity ?? r.quantity - r.reservedQuantity,
      minQuantity: r.minQuantity,
      nearestExpiryDate: expiryOf.get(`${r.storeId}:${r.productVariantId}`) ?? null,
      updatedAt: r.updatedAt,
    }));
    return { items, total };
  }

  async findPurchaseOrder(id: string): Promise<PurchaseOrderSnapshot | null> {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { store: { select: { type: true } }, items: true },
    });
    if (!po) {
      return null;
    }
    return {
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      storeId: po.storeId,
      storeType: po.store.type,
      supplierId: po.supplierId,
      items: po.items.map((i) => ({
        id: i.id,
        productVariantId: i.productVariantId,
        quantityOrdered: i.quantityOrdered,
        quantityReceived: i.quantityReceived,
        unitCost: Number(i.unitCost),
      })),
    };
  }

  applyReceipt(command: ReceiptCommand): Promise<ReceiptResult> {
    return this.prisma.$transaction(async (tx): Promise<ReceiptResult> => {
      const locked = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM purchase_orders WHERE id = ${command.purchaseOrderId}::uuid FOR UPDATE`;
      if (!locked.length || !RECEIVABLE_STATUSES.includes(locked[0].status)) {
        return { ok: false, reason: 'STATUS_CHANGED' };
      }

      const poItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: command.purchaseOrderId },
      });
      for (const item of poItems) {
        const receiving = command.lines
          .filter((l) => l.purchaseOrderItemId === item.id)
          .reduce((sum, l) => sum + l.quantity, 0);
        if (item.quantityReceived + receiving > item.quantityOrdered) {
          return { ok: false, reason: 'OVER_RECEIVED' };
        }
      }

      await this.updateCostPrices(tx, command);

      const batchIds: string[] = [];
      for (const line of command.lines) {
        const batch = await tx.batch.findUnique({
          where: {
            storeId_productVariantId_batchNumber: {
              storeId: command.storeId,
              productVariantId: line.productVariantId,
              batchNumber: line.batchNumber,
            },
          },
        });
        if (batch && batch.expiryDate.getTime() !== line.expiryDate.getTime()) {
          // Hủy cả transaction để không có dòng nào được ghi dở
          throw new BatchExpiryMismatch(line.batchNumber);
        }

        const savedBatch = batch
          ? await tx.batch.update({
              where: { id: batch.id },
              data: { quantity: { increment: line.quantity }, isActive: true },
            })
          : await tx.batch.create({
              data: {
                productVariantId: line.productVariantId,
                storeId: command.storeId,
                batchNumber: line.batchNumber,
                quantity: line.quantity,
                manufactureDate: line.manufactureDate,
                expiryDate: line.expiryDate,
                supplierId: command.supplierId,
                purchaseOrderId: command.purchaseOrderId,
              },
            });
        batchIds.push(savedBatch.id);

        await this.incrementInventory(tx, command.storeId, line.productVariantId, line.quantity, true);
        await tx.inventoryTransaction.create({
          data: {
            storeId: command.storeId,
            productVariantId: line.productVariantId,
            batchId: savedBatch.id,
            transactionType: 'IN',
            quantity: line.quantity,
            referenceType: 'PO',
            referenceId: command.purchaseOrderId,
            note: command.note,
            createdBy: command.receivedBy,
          },
        });
        await tx.purchaseOrderItem.update({
          where: { id: line.purchaseOrderItemId },
          data: { quantityReceived: { increment: line.quantity } },
        });
      }

      const after = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: command.purchaseOrderId },
        select: { quantityOrdered: true, quantityReceived: true },
      });
      const fullyReceived = after.every((i) => i.quantityReceived >= i.quantityOrdered);
      const poStatus = fullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
      await tx.purchaseOrder.update({
        where: { id: command.purchaseOrderId },
        data: { status: poStatus, receivedDate: fullyReceived ? command.receivedDate : undefined },
      });

      return { ok: true, poStatus, batchIds };
    }, TX_OPTIONS).catch((error): ReceiptResult => {
      if (error instanceof BatchExpiryMismatch) {
        return { ok: false, reason: 'BATCH_EXPIRY_MISMATCH', batchNumber: error.batchNumber };
      }
      throw error;
    });
  }

  applyAdjustment(command: AdjustmentCommand): Promise<AdjustmentResult> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ quantity: number; reserved_quantity: number }[]>`
        SELECT quantity, reserved_quantity FROM inventory
        WHERE store_id = ${command.storeId}::uuid AND product_variant_id = ${command.productVariantId}::uuid
        FOR UPDATE`;
      const current = rows[0];

      if (command.quantity < 0) {
        return this.applyDecrease(tx, command, current);
      }
      return this.applyIncrease(tx, command);
    }, TX_OPTIONS);
  }

  private async applyDecrease(
    tx: Tx,
    command: AdjustmentCommand,
    current: { quantity: number; reserved_quantity: number } | undefined,
  ): Promise<AdjustmentResult> {
    const need = -command.quantity;
    if (!current || current.quantity < need) {
      return { ok: false, reason: 'NO_STOCK', available: current?.quantity ?? 0 };
    }
    // Không xuất lấn vào phần đang giữ chỗ cho đơn online (BR-15)
    if (current.quantity - need < current.reserved_quantity) {
      return {
        ok: false,
        reason: 'RESERVED_CONFLICT',
        available: current.quantity - current.reserved_quantity,
      };
    }

    const where = { storeId: command.storeId, productVariantId: command.productVariantId };
    let allocations: { batchId: string; batchNumber: string; quantity: number }[] = [];

    if (command.batchId) {
      const batch = await tx.batch.findFirst({ where: { ...where, id: command.batchId } });
      if (!batch) {
        return { ok: false, reason: 'BATCH_NOT_FOUND' };
      }
      if (batch.quantity < need) {
        return { ok: false, reason: 'BATCH_SHORTAGE', available: batch.quantity };
      }
      allocations = [{ batchId: batch.id, batchNumber: batch.batchNumber, quantity: need }];
    } else {
      const batches = await tx.batch.findMany({ where: { ...where, isActive: true } });
      const hasAnyBatch = batches.length > 0 || (await tx.batch.count({ where })) > 0;
      // Hàng nhập trước khi có quản lý lô thì chỉ có tồn tổng, trừ thẳng tồn tổng
      if (hasAnyBatch) {
        const { allocations: picked, shortfall } = allocateByExpiry(batches, need);
        if (shortfall > 0) {
          return { ok: false, reason: 'BATCH_SHORTAGE', available: need - shortfall };
        }
        allocations = picked.map((a) => ({
          ...a,
          batchNumber: batches.find((b) => b.id === a.batchId)!.batchNumber,
        }));
      }
    }

    for (const a of allocations) {
      await tx.batch.update({ where: { id: a.batchId }, data: { quantity: { decrement: a.quantity } } });
    }
    const updated = await tx.inventory.update({
      where: { storeId_productVariantId: where },
      data: { quantity: { decrement: need } },
    });

    const transactions = allocations.length
      ? allocations.map((a) => ({ batchId: a.batchId, quantity: -a.quantity }))
      : [{ batchId: null, quantity: -need }];
    await tx.inventoryTransaction.createMany({
      data: transactions.map((t) => ({
        ...where,
        batchId: t.batchId,
        transactionType: 'ADJUST',
        quantity: t.quantity,
        note: command.reason,
        createdBy: command.createdBy,
      })),
    });

    return {
      ok: true,
      quantity: updated.quantity,
      reservedQuantity: updated.reservedQuantity,
      allocations,
    };
  }

  private async applyIncrease(tx: Tx, command: AdjustmentCommand): Promise<AdjustmentResult> {
    const where = { storeId: command.storeId, productVariantId: command.productVariantId };
    let batchId: string;
    let batchNumber: string;

    if (command.batchId) {
      const batch = await tx.batch.findFirst({ where: { ...where, id: command.batchId } });
      if (!batch) {
        return { ok: false, reason: 'BATCH_NOT_FOUND' };
      }
      await tx.batch.update({
        where: { id: batch.id },
        data: { quantity: { increment: command.quantity } },
      });
      batchId = batch.id;
      batchNumber = batch.batchNumber;
    } else {
      const newBatch = command.newBatch!;
      const existing = await tx.batch.findUnique({
        where: { storeId_productVariantId_batchNumber: { ...where, batchNumber: newBatch.batchNumber } },
      });
      if (existing && existing.expiryDate.getTime() !== newBatch.expiryDate.getTime()) {
        return { ok: false, reason: 'BATCH_EXPIRY_MISMATCH' };
      }
      const saved = existing
        ? await tx.batch.update({
            where: { id: existing.id },
            data: { quantity: { increment: command.quantity } },
          })
        : await tx.batch.create({
            data: {
              ...where,
              batchNumber: newBatch.batchNumber,
              quantity: command.quantity,
              expiryDate: newBatch.expiryDate,
              manufactureDate: newBatch.manufactureDate,
            },
          });
      batchId = saved.id;
      batchNumber = saved.batchNumber;
    }

    const updated = await this.incrementInventory(
      tx,
      command.storeId,
      command.productVariantId,
      command.quantity,
      false,
    );
    await tx.inventoryTransaction.create({
      data: {
        ...where,
        batchId,
        transactionType: 'ADJUST',
        quantity: command.quantity,
        note: command.reason,
        createdBy: command.createdBy,
      },
    });

    return {
      ok: true,
      quantity: updated.quantity,
      reservedQuantity: updated.reservedQuantity,
      allocations: [{ batchId, batchNumber, quantity: command.quantity }],
    };
  }

  private incrementInventory(
    tx: Tx,
    storeId: string,
    productVariantId: string,
    quantity: number,
    isRestock: boolean,
  ) {
    const lastRestockAt = isRestock ? new Date() : undefined;
    return tx.inventory.upsert({
      where: { storeId_productVariantId: { storeId, productVariantId } },
      update: { quantity: { increment: quantity }, lastRestockAt },
      create: { storeId, productVariantId, quantity, lastRestockAt },
    });
  }

  // Giá vốn tính trên tổng tồn toàn chuỗi của biến thể, trước khi cộng hàng mới
  private async updateCostPrices(tx: Tx, command: ReceiptCommand): Promise<void> {
    const variantIds = [...new Set(command.lines.map((l) => l.productVariantId))];
    for (const variantId of variantIds) {
      const [variant, stock] = await Promise.all([
        tx.productVariant.findUnique({ where: { id: variantId }, select: { costPrice: true } }),
        tx.inventory.aggregate({ where: { productVariantId: variantId }, _sum: { quantity: true } }),
      ]);
      let quantity = stock._sum.quantity ?? 0;
      let cost = Number(variant?.costPrice ?? 0);
      for (const line of command.lines.filter((l) => l.productVariantId === variantId)) {
        cost = weightedAverageCost(quantity, cost, line.quantity, line.unitCost);
        quantity += line.quantity;
      }
      await tx.productVariant.update({ where: { id: variantId }, data: { costPrice: cost } });
    }
  }
}

class BatchExpiryMismatch extends Error {
  constructor(readonly batchNumber: string) {
    super(`Batch ${batchNumber} expiry mismatch`);
  }
}
