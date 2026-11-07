import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { nextDocumentCode } from '@infrastructure/database/document-code.util';
import {
  IInventoryRepository,
  InventoryListFilter,
  InventoryListItem,
  PurchaseOrderSnapshot,
  ReceiptCommand,
  ReceiptResult,
  StockConsistencyRow,
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

  async findConsistencyRows(storeIds?: string[]): Promise<StockConsistencyRow[]> {
    if (storeIds && storeIds.length === 0) {
      return [];
    }
    const storeFilter = storeIds
      ? Prisma.sql`WHERE k.store_id = ANY(${storeIds}::uuid[])`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        store_id: string;
        store_code: string;
        store_name: string;
        variant_id: string;
        sku: string;
        product_name: string;
        quantity: number | null;
        reserved_quantity: number | null;
        batch_count: number;
        active_qty: number;
        inactive_qty: number;
        negative_batches: number;
        ledger_count: number;
        ledger_qty: number;
      }[]
    >`
      WITH keys AS (
        SELECT store_id, product_variant_id FROM inventory
        UNION
        SELECT store_id, product_variant_id FROM batches
      ),
      b AS (
        SELECT store_id, product_variant_id,
               COUNT(*)::int AS batch_count,
               COALESCE(SUM(quantity) FILTER (WHERE is_active), 0)::int AS active_qty,
               COALESCE(SUM(quantity) FILTER (WHERE NOT is_active), 0)::int AS inactive_qty,
               COUNT(*) FILTER (WHERE quantity < 0)::int AS negative_batches
        FROM batches GROUP BY store_id, product_variant_id
      ),
      t AS (
        SELECT store_id, product_variant_id,
               COUNT(*)::int AS ledger_count,
               COALESCE(SUM(quantity), 0)::int AS ledger_qty
        FROM inventory_transactions GROUP BY store_id, product_variant_id
      )
      SELECT k.store_id, s.code AS store_code, s.name AS store_name,
             k.product_variant_id AS variant_id, v.sku, p.name AS product_name,
             i.quantity, i.reserved_quantity,
             COALESCE(b.batch_count, 0) AS batch_count,
             COALESCE(b.active_qty, 0) AS active_qty,
             COALESCE(b.inactive_qty, 0) AS inactive_qty,
             COALESCE(b.negative_batches, 0) AS negative_batches,
             COALESCE(t.ledger_count, 0) AS ledger_count,
             COALESCE(t.ledger_qty, 0) AS ledger_qty
      FROM keys k
      JOIN stores s ON s.id = k.store_id
      JOIN product_variants v ON v.id = k.product_variant_id
      JOIN products p ON p.id = v.product_id
      LEFT JOIN inventory i ON i.store_id = k.store_id AND i.product_variant_id = k.product_variant_id
      LEFT JOIN b ON b.store_id = k.store_id AND b.product_variant_id = k.product_variant_id
      LEFT JOIN t ON t.store_id = k.store_id AND t.product_variant_id = k.product_variant_id
      ${storeFilter}
      ORDER BY s.code, p.name, v.sku`;

    return rows.map((r) => ({
      store: { id: r.store_id, code: r.store_code, name: r.store_name },
      variant: { id: r.variant_id, sku: r.sku, productName: r.product_name },
      quantity: r.quantity ?? 0,
      reservedQuantity: r.reserved_quantity ?? 0,
      hasInventoryRow: r.quantity !== null,
      batchCount: r.batch_count,
      activeBatchQuantity: r.active_qty,
      inactiveBatchQuantity: r.inactive_qty,
      negativeBatchCount: r.negative_batches,
      ledgerCount: r.ledger_count,
      ledgerQuantity: r.ledger_qty,
    }));
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

      const totalCost = command.lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptCode: await nextDocumentCode(tx, 'GRN'),
          purchaseOrderId: command.purchaseOrderId,
          supplierId: command.supplierId,
          storeId: command.storeId,
          deliveredBy: command.deliveredBy,
          receivedBy: command.receivedBy,
          receivedDate: command.receivedDate,
          totalCost: Math.round(totalCost * 100) / 100,
          invoiceNumber: command.invoiceNumber,
          invoiceDate: command.invoiceDate,
          invoiceAmount: command.invoiceAmount,
          note: command.note,
        },
      });

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
            referenceType: 'GRN',
            referenceId: receipt.id,
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

      return { ok: true, poStatus, batchIds, receiptCode: receipt.receiptCode };
    }, TX_OPTIONS).catch((error): ReceiptResult => {
      if (error instanceof BatchExpiryMismatch) {
        return { ok: false, reason: 'BATCH_EXPIRY_MISMATCH', batchNumber: error.batchNumber };
      }
      throw error;
    });
  }

  findInventoryRow(id: string) {
    return this.prisma.inventory.findUnique({
      where: { id },
      select: { id: true, storeId: true, maxQuantity: true },
    });
  }

  updateThresholds(id: string, minQuantity: number, maxQuantity: number | null) {
    return this.prisma.inventory.update({
      where: { id },
      data: { minQuantity, maxQuantity },
      select: { id: true, minQuantity: true, maxQuantity: true },
    });
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
