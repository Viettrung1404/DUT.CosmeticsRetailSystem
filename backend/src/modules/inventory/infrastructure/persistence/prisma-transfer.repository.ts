import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  ITransferRepository,
  TransferLineInput,
  TransferListFilter,
  TransferMoveResult,
  TransferView,
} from '../../domain/repositories/transfer.repository.interface';
import { StockFailure } from '../../domain/repositories/stock-movement.types';
import { nextDocumentCode } from '@infrastructure/database/document-code.util';
import { STOCK_TX_OPTIONS, putStock, takeStock } from './stock-ledger';

const INCLUDE = {
  fromStore: { select: { name: true } },
  toStore: { select: { name: true } },
  requester: { select: { fullName: true } },
  items: {
    include: {
      variant: { select: { sku: true, product: { select: { name: true } } } },
      batch: { select: { batchNumber: true, expiryDate: true } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.InventoryTransferInclude;

type Row = Prisma.InventoryTransferGetPayload<{ include: typeof INCLUDE }>;

const toView = (r: Row): TransferView => ({
  id: r.id,
  transferCode: r.transferCode,
  fromStoreId: r.fromStoreId,
  fromStoreName: r.fromStore.name,
  toStoreId: r.toStoreId,
  toStoreName: r.toStore.name,
  status: r.status,
  note: r.note,
  requestedBy: r.requestedBy,
  requestedByName: r.requester?.fullName ?? null,
  approvedBy: r.approvedBy,
  shippedBy: r.shippedBy,
  receivedBy: r.receivedBy,
  shippedAt: r.shippedAt,
  receivedAt: r.receivedAt,
  createdAt: r.createdAt,
  items: r.items.map((i) => ({
    id: i.id,
    productVariantId: i.productVariantId,
    sku: i.variant.sku,
    productName: i.variant.product.name,
    batchId: i.batchId,
    batchNumber: i.batch?.batchNumber ?? null,
    expiryDate: i.batch?.expiryDate ?? null,
    quantityRequested: i.quantityRequested,
    quantityApproved: i.quantityApproved,
    quantityShipped: i.quantityShipped,
    quantityReceived: i.quantityReceived,
    lossQuantity: i.lossQuantity ?? i.quantityShipped - i.quantityReceived,
    lossReason: i.lossReason,
  })),
});

class MoveAbort extends Error {
  constructor(
    readonly reason: StockFailure,
    readonly available?: number,
    readonly sku?: string,
  ) {
    super(reason);
  }
}

@Injectable()
export class PrismaTransferRepository implements ITransferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMissingVariants(ids: string[]): Promise<string[]> {
    const found = await this.prisma.productVariant.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const set = new Set(found.map((v) => v.id));
    return ids.filter((id) => !set.has(id));
  }

  create(data: {
    fromStoreId: string;
    toStoreId: string;
    note: string | null;
    requestedBy: string;
    items: TransferLineInput[];
  }): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.inventoryTransfer.create({
        data: {
          transferCode: await nextDocumentCode(tx, 'TRF'),
          fromStoreId: data.fromStoreId,
          toStoreId: data.toStoreId,
          status: 'DRAFT',
          note: data.note,
          requestedBy: data.requestedBy,
          items: {
            create: data.items.map((i) => ({
              productVariantId: i.productVariantId,
              quantityRequested: i.quantity,
            })),
          },
        },
      });
      return created.id;
    });
  }

  replaceDraft(id: string, note: string | null | undefined, items?: TransferLineInput[]): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryTransfer.updateMany({
        where: { id, status: 'DRAFT' },
        data: note !== undefined ? { note } : { updatedAt: new Date() },
      });
      if (!updated.count) return false;
      if (items) {
        await tx.inventoryTransferItem.deleteMany({ where: { transferId: id } });
        await tx.inventoryTransferItem.createMany({
          data: items.map((i) => ({
            transferId: id,
            productVariantId: i.productVariantId,
            quantityRequested: i.quantity,
          })),
        });
      }
      return true;
    });
  }

  changeStatus(
    id: string,
    from: string[],
    to: string,
    data: { approvedBy?: string; approvedQuantities?: Map<string, number> } = {},
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryTransfer.updateMany({
        where: { id, status: { in: from } },
        data: { status: to, approvedBy: data.approvedBy },
      });
      if (!updated.count) return false;
      for (const [itemId, quantity] of data.approvedQuantities ?? []) {
        await tx.inventoryTransferItem.update({
          where: { id: itemId },
          data: { quantityApproved: quantity },
        });
      }
      return true;
    });
  }

  ship(id: string, shippedBy: string): Promise<TransferMoveResult> {
    return this.move(async (tx) => {
      const transfer = await this.lock(tx, id, 'APPROVED');
      const ref = {
        type: 'TRANSFER_OUT',
        referenceType: 'TRANSFER',
        referenceId: id,
        note: transfer.transfer_code,
        createdBy: shippedBy,
      };
      const items = await tx.inventoryTransferItem.findMany({
        where: { transferId: id },
        include: { variant: { select: { sku: true } } },
      });
      for (const item of items) {
        const approved = item.quantityApproved ?? item.quantityRequested;
        if (approved <= 0) continue;
        const taken = await takeStock(tx, {
          storeId: transfer.from_store_id,
          productVariantId: item.productVariantId,
          quantity: approved,
          sellableOnly: true,
          ref,
        });
        if (!taken.ok) throw new MoveAbort(taken.reason, taken.available, item.variant.sku);

        const [first, ...rest] = taken.allocations;
        const restTotal = rest.reduce((s, a) => s + a.quantity, 0);
        // Một dòng phiếu chỉ giữ một lô: lấy từ nhiều lô thì tách dòng, tổng số yêu cầu/duyệt giữ nguyên
        await tx.inventoryTransferItem.update({
          where: { id: item.id },
          data: first
            ? {
                batchId: first.batchId,
                quantityShipped: first.quantity,
                quantityApproved: first.quantity,
                quantityRequested: item.quantityRequested - restTotal,
              }
            : { quantityShipped: approved, quantityApproved: approved },
        });
        for (const a of rest) {
          await tx.inventoryTransferItem.create({
            data: {
              transferId: id,
              productVariantId: item.productVariantId,
              batchId: a.batchId,
              quantityRequested: a.quantity,
              quantityApproved: a.quantity,
              quantityShipped: a.quantity,
            },
          });
        }
      }
      await tx.inventoryTransfer.update({
        where: { id },
        data: { status: 'SHIPPED', shippedBy, shippedAt: new Date() },
      });
    });
  }

  receive(
    id: string,
    receivedBy: string,
    lines: Map<string, { quantityReceived: number; lossReason: string | null }>,
  ): Promise<TransferMoveResult> {
    return this.move(async (tx) => {
      const transfer = await this.lock(tx, id, 'SHIPPED');
      const ref = {
        type: 'TRANSFER_IN',
        referenceType: 'TRANSFER',
        referenceId: id,
        note: transfer.transfer_code,
        createdBy: receivedBy,
      };
      const items = await tx.inventoryTransferItem.findMany({
        where: { transferId: id, quantityShipped: { gt: 0 } },
        include: { batch: true },
      });
      for (const item of items) {
        const line = lines.get(item.id);
        const received = line?.quantityReceived ?? item.quantityShipped;
        if (received > 0) {
          const put = await putStock(tx, {
            storeId: transfer.to_store_id,
            productVariantId: item.productVariantId,
            quantity: received,
            newBatch: item.batch
              ? {
                  batchNumber: item.batch.batchNumber,
                  expiryDate: item.batch.expiryDate,
                  manufactureDate: item.batch.manufactureDate,
                  supplierId: item.batch.supplierId,
                }
              : null,
            isRestock: true,
            ref,
          });
          if (!put.ok) throw new MoveAbort(put.reason);
        }
        await tx.inventoryTransferItem.update({
          where: { id: item.id },
          data: { quantityReceived: received, lossReason: line?.lossReason ?? null },
        });
      }
      await tx.inventoryTransfer.update({
        where: { id },
        data: { status: 'RECEIVED', receivedBy, receivedAt: new Date() },
      });
    });
  }

  async findById(id: string): Promise<TransferView | null> {
    const row = await this.prisma.inventoryTransfer.findUnique({ where: { id }, include: INCLUDE });
    return row ? toView(row) : null;
  }

  async findMany(filter: TransferListFilter): Promise<{ items: TransferView[]; total: number }> {
    const where: Prisma.InventoryTransferWhereInput = {
      status: filter.status,
      ...(filter.storeIds
        ? {
            OR: [{ fromStoreId: { in: filter.storeIds } }, { toStoreId: { in: filter.storeIds } }],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventoryTransfer.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.inventoryTransfer.count({ where }),
    ]);
    return { items: rows.map(toView), total };
  }

  private async lock(tx: Prisma.TransactionClient, id: string, expected: string) {
    const rows = await tx.$queryRaw<
      { status: string; from_store_id: string; to_store_id: string; transfer_code: string }[]
    >`SELECT status, from_store_id, to_store_id, transfer_code FROM inventory_transfers
      WHERE id = ${id}::uuid FOR UPDATE`;
    if (rows[0]?.status !== expected) throw new MoveAbort('STATUS_CHANGED');
    return rows[0];
  }

  private async move(work: (tx: Prisma.TransactionClient) => Promise<void>): Promise<TransferMoveResult> {
    try {
      await this.prisma.$transaction(work, STOCK_TX_OPTIONS);
      return { ok: true };
    } catch (error) {
      if (error instanceof MoveAbort) {
        return { ok: false, reason: error.reason, available: error.available, sku: error.sku };
      }
      throw error;
    }
  }
}
