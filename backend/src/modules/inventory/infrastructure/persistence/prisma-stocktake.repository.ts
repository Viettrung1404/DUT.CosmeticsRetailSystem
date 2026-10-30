import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  IStocktakeRepository,
  StocktakeCountInput,
  StocktakeView,
  StocktakeWriteResult,
} from '../../domain/repositories/stocktake.repository.interface';
import { STOCK_TX_OPTIONS, nextDocumentCode, putStock, takeStock } from './stock-ledger';

type Tx = Prisma.TransactionClient;

const INCLUDE = {
  store: { select: { name: true } },
  creator: { select: { fullName: true } },
  completer: { select: { fullName: true } },
  items: {
    include: {
      variant: { select: { sku: true, product: { select: { name: true } } } },
      batch: { select: { batchNumber: true } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.StocktakeInclude;

type Row = Prisma.StocktakeGetPayload<{ include: typeof INCLUDE }>;

const toView = (r: Row): StocktakeView => ({
  id: r.id,
  stocktakeCode: r.stocktakeCode,
  storeId: r.storeId,
  storeName: r.store.name,
  status: r.status,
  totalVarianceValue: Number(r.totalVarianceValue),
  note: r.note,
  createdBy: r.createdBy,
  createdByName: r.creator?.fullName ?? null,
  completedBy: r.completedBy,
  completedByName: r.completer?.fullName ?? null,
  completedAt: r.completedAt,
  createdAt: r.createdAt,
  items: r.items.map((i) => ({
    id: i.id,
    productVariantId: i.productVariantId,
    sku: i.variant.sku,
    productName: i.variant.product.name,
    batchId: i.batchId,
    batchNumber: i.batch?.batchNumber ?? null,
    systemQuantity: i.systemQuantity,
    actualQuantity: i.actualQuantity,
    varianceQuantity: i.varianceQuantity ?? i.actualQuantity - i.systemQuantity,
    unitCost: Number(i.unitCost),
    varianceReason: i.varianceReason,
    note: i.note,
  })),
});

class WriteAbort extends Error {
  constructor(readonly result: Exclude<StocktakeWriteResult, { ok: true }>) {
    super(result.reason);
  }
}

@Injectable()
export class PrismaStocktakeRepository implements IStocktakeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { storeId: string; note: string | null; createdBy: string }): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.stocktake.create({
        data: {
          stocktakeCode: await nextDocumentCode(tx, 'STK'),
          storeId: data.storeId,
          status: 'DRAFT',
          note: data.note,
          createdBy: data.createdBy,
        },
      });
      return created.id;
    });
  }

  recordCounts(id: string, storeId: string, items: StocktakeCountInput[]): Promise<StocktakeWriteResult> {
    return this.write(async (tx) => {
      await this.lock(tx, id, ['DRAFT', 'IN_PROGRESS']);
      for (const item of items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.productVariantId },
          select: { sku: true, costPrice: true },
        });
        if (!variant) throw new WriteAbort({ ok: false, reason: 'VARIANT_NOT_FOUND' });
        const batchId = item.batchId ?? null;
        let systemQuantity: number;
        if (batchId) {
          const batch = await tx.batch.findFirst({
            where: { id: batchId, storeId, productVariantId: item.productVariantId },
            select: { quantity: true },
          });
          if (!batch) throw new WriteAbort({ ok: false, reason: 'BATCH_NOT_FOUND', sku: variant.sku });
          systemQuantity = batch.quantity;
        } else {
          // Biến thể đã quản lý lô thì phải đếm theo từng lô để tồn kho = tổng các lô
          const batchCount = await tx.batch.count({
            where: { storeId, productVariantId: item.productVariantId },
          });
          if (batchCount > 0) throw new WriteAbort({ ok: false, reason: 'BATCH_REQUIRED', sku: variant.sku });
          const row = await tx.inventory.findUnique({
            where: { storeId_productVariantId: { storeId, productVariantId: item.productVariantId } },
            select: { quantity: true },
          });
          systemQuantity = row?.quantity ?? 0;
        }

        const existing = await tx.stocktakeItem.findFirst({
          where: { stocktakeId: id, productVariantId: item.productVariantId, batchId },
          select: { id: true },
        });
        const counted = {
          actualQuantity: item.actualQuantity,
          varianceReason: item.varianceReason ?? null,
          note: item.note ?? null,
        };
        if (existing) {
          await tx.stocktakeItem.update({ where: { id: existing.id }, data: counted });
        } else {
          await tx.stocktakeItem.create({
            data: {
              stocktakeId: id,
              productVariantId: item.productVariantId,
              batchId,
              systemQuantity,
              unitCost: variant.costPrice ?? 0,
              ...counted,
            },
          });
        }
      }
      await tx.stocktake.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
    });
  }

  complete(id: string, completedBy: string): Promise<StocktakeWriteResult> {
    return this.write(async (tx) => {
      const header = await this.lock(tx, id, ['IN_PROGRESS']);
      const items = await tx.stocktakeItem.findMany({
        where: { stocktakeId: id },
        include: { variant: { select: { sku: true } } },
      });
      let totalVariance = 0;
      for (const item of items) {
        const variance = item.actualQuantity - item.systemQuantity;
        if (variance === 0) continue;
        totalVariance += variance * Number(item.unitCost);
        const ref = {
          type: 'ADJUST',
          referenceType: 'STOCKTAKE',
          referenceId: id,
          note: header.stocktake_code,
          createdBy: completedBy,
        };
        if (variance < 0) {
          const taken = await takeStock(tx, {
            storeId: header.store_id,
            productVariantId: item.productVariantId,
            quantity: -variance,
            batchId: item.batchId,
            ref,
          });
          if (!taken.ok) {
            throw new WriteAbort({ ...taken, sku: item.variant.sku });
          }
        } else {
          const put = await putStock(tx, {
            storeId: header.store_id,
            productVariantId: item.productVariantId,
            quantity: variance,
            batchId: item.batchId,
            ref,
          });
          if (!put.ok) throw new WriteAbort({ ok: false, reason: put.reason, sku: item.variant.sku });
        }
      }
      await tx.stocktake.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedBy,
          completedAt: new Date(),
          totalVarianceValue: Math.round(totalVariance * 100) / 100,
        },
      });
    });
  }

  async cancel(id: string): Promise<boolean> {
    const result = await this.prisma.stocktake.updateMany({
      where: { id, status: { in: ['DRAFT', 'IN_PROGRESS'] } },
      data: { status: 'CANCELLED' },
    });
    return result.count > 0;
  }

  async findById(id: string): Promise<StocktakeView | null> {
    const row = await this.prisma.stocktake.findUnique({ where: { id }, include: INCLUDE });
    return row ? toView(row) : null;
  }

  async findMany(filter: { skip: number; take: number; storeIds?: string[]; status?: string }) {
    const where: Prisma.StocktakeWhereInput = {
      storeId: filter.storeIds ? { in: filter.storeIds } : undefined,
      status: filter.status,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.stocktake.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.stocktake.count({ where }),
    ]);
    return { items: rows.map(toView), total };
  }

  private async lock(tx: Tx, id: string, expected: string[]) {
    const rows = await tx.$queryRaw<{ status: string; store_id: string; stocktake_code: string }[]>`
      SELECT status, store_id, stocktake_code FROM stocktakes WHERE id = ${id}::uuid FOR UPDATE`;
    if (!rows[0] || !expected.includes(rows[0].status)) {
      throw new WriteAbort({ ok: false, reason: 'STATUS_CHANGED' });
    }
    return rows[0];
  }

  private async write(work: (tx: Tx) => Promise<void>): Promise<StocktakeWriteResult> {
    try {
      await this.prisma.$transaction(work, STOCK_TX_OPTIONS);
      return { ok: true };
    } catch (error) {
      if (error instanceof WriteAbort) return error.result;
      throw error;
    }
  }
}
