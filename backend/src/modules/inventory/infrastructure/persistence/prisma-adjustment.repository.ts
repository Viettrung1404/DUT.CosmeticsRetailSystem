import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  AdjustmentLineInput,
  AdjustmentListFilter,
  AdjustmentView,
  ApplyAdjustmentResult,
  IAdjustmentRepository,
} from '../../domain/repositories/adjustment.repository.interface';
import { StockFailure } from '../../domain/repositories/stock-movement.types';
import { nextDocumentCode } from '@infrastructure/database/document-code.util';
import { STOCK_TX_OPTIONS, putStock, takeStock } from './stock-ledger';

type Tx = Prisma.TransactionClient;

const INCLUDE = {
  store: { select: { name: true } },
  creator: { select: { fullName: true } },
  approver: { select: { fullName: true } },
  items: {
    include: {
      variant: { select: { sku: true, product: { select: { name: true } } } },
      batch: { select: { batchNumber: true, expiryDate: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.InventoryAdjustmentInclude;

type Row = Prisma.InventoryAdjustmentGetPayload<{ include: typeof INCLUDE }>;

const toView = (r: Row): AdjustmentView => ({
  id: r.id,
  adjustmentCode: r.adjustmentCode,
  storeId: r.storeId,
  storeName: r.store.name,
  status: r.status,
  reason: r.reason,
  reviewNote: r.reviewNote,
  createdBy: r.createdBy,
  createdByName: r.creator?.fullName ?? null,
  approvedBy: r.approvedBy,
  approvedByName: r.approver?.fullName ?? null,
  approvedAt: r.approvedAt,
  createdAt: r.createdAt,
  items: r.items.map((i) => ({
    id: i.id,
    productVariantId: i.productVariantId,
    sku: i.variant.sku,
    productName: i.variant.product.name,
    batchId: i.batchId,
    batchNumber: i.batch?.batchNumber ?? i.batchNumber,
    expiryDate: i.batch?.expiryDate ?? i.expiryDate,
    quantity: i.quantity,
  })),
});

// Lỗi nghiệp vụ giữa chừng: ném ra để hủy cả giao dịch, bắt lại ở ngoài thành kết quả
class StockAbort extends Error {
  constructor(
    readonly reason: StockFailure,
    readonly available?: number,
  ) {
    super(reason);
  }
}

@Injectable()
export class PrismaAdjustmentRepository implements IAdjustmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    storeId: string;
    reason: string;
    createdBy: string;
    applyNow: boolean;
    lines: AdjustmentLineInput[];
  }): Promise<ApplyAdjustmentResult> {
    return this.run(async (tx) => {
      const code = await nextDocumentCode(tx, 'ADJ');
      const header = await tx.inventoryAdjustment.create({
        data: {
          adjustmentCode: code,
          storeId: data.storeId,
          status: data.applyNow ? 'APPROVED' : 'PENDING',
          reason: data.reason,
          createdBy: data.createdBy,
          approvedBy: data.applyNow ? data.createdBy : null,
          approvedAt: data.applyNow ? new Date() : null,
        },
      });
      for (const line of data.lines) {
        let batchId = line.batchId ?? null;
        if (data.applyNow) {
          const put = await putStock(tx, {
            storeId: data.storeId,
            productVariantId: line.productVariantId,
            quantity: line.quantity,
            batchId,
            newBatch: line.newBatch,
            ref: this.ref(header.id, data.reason, data.createdBy),
          });
          if (!put.ok) throw new StockAbort(put.reason);
          batchId = put.batchId;
        }
        await tx.inventoryAdjustmentItem.create({
          data: {
            adjustmentId: header.id,
            productVariantId: line.productVariantId,
            batchId,
            quantity: line.quantity,
            batchNumber: line.newBatch?.batchNumber ?? null,
            expiryDate: line.newBatch?.expiryDate ?? null,
            manufactureDate: line.newBatch?.manufactureDate ?? null,
          },
        });
      }
      return header.id;
    });
  }

  async approve(id: string, approvedBy: string, note: string | null): Promise<ApplyAdjustmentResult> {
    return this.run(async (tx) => {
      const locked = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM inventory_adjustments WHERE id = ${id}::uuid FOR UPDATE`;
      if (locked[0]?.status !== 'PENDING') throw new StockAbort('STATUS_CHANGED');

      const header = await tx.inventoryAdjustment.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });
      for (const item of header.items) {
        const ref = this.ref(id, header.reason, approvedBy);
        if (item.quantity < 0) {
          const taken = await takeStock(tx, {
            storeId: header.storeId,
            productVariantId: item.productVariantId,
            quantity: -item.quantity,
            batchId: item.batchId,
            ref,
          });
          if (!taken.ok) throw new StockAbort(taken.reason, taken.available);
        } else {
          const put = await putStock(tx, {
            storeId: header.storeId,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            batchId: item.batchId,
            newBatch: item.batchNumber
              ? {
                  batchNumber: item.batchNumber,
                  expiryDate: item.expiryDate!,
                  manufactureDate: item.manufactureDate,
                }
              : null,
            ref,
          });
          if (!put.ok) throw new StockAbort(put.reason);
        }
      }
      await tx.inventoryAdjustment.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy, approvedAt: new Date(), reviewNote: note },
      });
      return id;
    });
  }

  async close(
    id: string,
    status: 'REJECTED' | 'CANCELLED',
    userId: string,
    note: string | null,
  ): Promise<boolean> {
    const result = await this.prisma.inventoryAdjustment.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status,
        reviewNote: note,
        ...(status === 'REJECTED' ? { approvedBy: userId, approvedAt: new Date() } : {}),
      },
    });
    return result.count > 0;
  }

  async findById(id: string): Promise<AdjustmentView | null> {
    const row = await this.prisma.inventoryAdjustment.findUnique({ where: { id }, include: INCLUDE });
    return row ? toView(row) : null;
  }

  async findMany(filter: AdjustmentListFilter): Promise<{ items: AdjustmentView[]; total: number }> {
    const where: Prisma.InventoryAdjustmentWhereInput = {
      storeId: filter.storeIds ? { in: filter.storeIds } : undefined,
      status: filter.status,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventoryAdjustment.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.inventoryAdjustment.count({ where }),
    ]);
    return { items: rows.map(toView), total };
  }

  async currentStock(storeId: string, productVariantId: string) {
    const row = await this.prisma.inventory.findUnique({
      where: { storeId_productVariantId: { storeId, productVariantId } },
      select: { quantity: true, reservedQuantity: true },
    });
    return { quantity: row?.quantity ?? 0, reserved: row?.reservedQuantity ?? 0 };
  }

  private ref(id: string, reason: string, createdBy: string) {
    return { type: 'ADJUST', referenceType: 'ADJUSTMENT', referenceId: id, note: reason, createdBy };
  }

  private async run(work: (tx: Tx) => Promise<string>): Promise<ApplyAdjustmentResult> {
    try {
      const id = await this.prisma.$transaction(work, STOCK_TX_OPTIONS);
      return { ok: true, adjustment: (await this.findById(id))! };
    } catch (error) {
      if (error instanceof StockAbort) {
        return { ok: false, reason: error.reason, available: error.available };
      }
      throw error;
    }
  }
}
