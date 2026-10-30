import { Prisma } from '@prisma/client';
import { startOfVnToday } from '@core/utils/expiry-policy.util';
import { allocateByExpiry } from '../../domain/services/stock-calculation';
import { NewBatchInfo, TakeStockFailure } from '../../domain/repositories/stock-movement.types';

type Tx = Prisma.TransactionClient;

export interface StockReference {
  type: string;
  referenceType: string;
  referenceId: string;
  note?: string | null;
  createdBy: string;
}

export interface StockAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  supplierId: string | null;
  manufactureDate: Date | null;
  quantity: number;
}

export type TakeStockResult =
  | { ok: true; allocations: StockAllocation[]; quantity: number; reservedQuantity: number }
  | { ok: false; reason: TakeStockFailure; available?: number };

export type PutStockResult =
  | {
      ok: true;
      batchId: string | null;
      batchNumber: string | null;
      quantity: number;
      reservedQuantity: number;
    }
  | { ok: false; reason: 'BATCH_NOT_FOUND' | 'BATCH_EXPIRY_MISMATCH' };

interface LockedBatch {
  id: string;
  batch_number: string;
  quantity: number;
  expiry_date: Date;
  manufacture_date: Date | null;
  supplier_id: string | null;
}

// Neon ở xa, phiếu nhiều dòng dễ vượt hạn 5 giây mặc định của Prisma
export const STOCK_TX_OPTIONS = { timeout: 20000 };

export const lockInventoryRow = async (tx: Tx, storeId: string, productVariantId: string) => {
  const rows = await tx.$queryRaw<{ quantity: number; reserved_quantity: number }[]>`
    SELECT quantity, reserved_quantity FROM inventory
    WHERE store_id = ${storeId}::uuid AND product_variant_id = ${productVariantId}::uuid
    FOR UPDATE`;
  return rows[0];
};

// Trừ tồn một biến thể: chọn lô FEFO (hoặc lô chỉ định), không lấn phần giữ chỗ cho đơn online (BR-15).
// sellableOnly bỏ qua lô đã hết hạn (chuyển kho); xuất hủy thì lấy cả lô hết hạn.
export const takeStock = async (
  tx: Tx,
  params: {
    storeId: string;
    productVariantId: string;
    quantity: number;
    batchId?: string | null;
    sellableOnly?: boolean;
    ref: StockReference;
  },
): Promise<TakeStockResult> => {
  const { storeId, productVariantId, quantity: need, ref } = params;
  const current = await lockInventoryRow(tx, storeId, productVariantId);
  if (!current || current.quantity < need) {
    return { ok: false, reason: 'NO_STOCK', available: current?.quantity ?? 0 };
  }
  if (current.quantity - need < current.reserved_quantity) {
    return {
      ok: false,
      reason: 'RESERVED_CONFLICT',
      available: current.quantity - current.reserved_quantity,
    };
  }

  const batches = await tx.$queryRaw<LockedBatch[]>`
    SELECT id, batch_number, quantity, expiry_date, manufacture_date, supplier_id
    FROM batches
    WHERE store_id = ${storeId}::uuid AND product_variant_id = ${productVariantId}::uuid
    ORDER BY id
    FOR UPDATE`;

  let allocations: StockAllocation[] = [];
  const toAllocation = (b: LockedBatch, qty: number): StockAllocation => ({
    batchId: b.id,
    batchNumber: b.batch_number,
    expiryDate: b.expiry_date,
    manufactureDate: b.manufacture_date,
    supplierId: b.supplier_id,
    quantity: qty,
  });

  if (params.batchId) {
    const batch = batches.find((b) => b.id === params.batchId);
    if (!batch) return { ok: false, reason: 'BATCH_NOT_FOUND' };
    if (batch.quantity < need) {
      return { ok: false, reason: 'BATCH_SHORTAGE', available: batch.quantity };
    }
    allocations = [toAllocation(batch, need)];
  } else if (batches.length > 0) {
    const active = await tx.batch.findMany({
      where: {
        id: { in: batches.map((b) => b.id) },
        isActive: true,
        ...(params.sellableOnly ? { expiryDate: { gt: startOfVnToday() } } : {}),
      },
      select: { id: true },
    });
    const activeIds = new Set(active.map((b) => b.id));
    const candidates = batches
      .filter((b) => activeIds.has(b.id))
      .map((b) => ({ id: b.id, quantity: b.quantity, expiryDate: b.expiry_date }));
    const { allocations: picked, shortfall } = allocateByExpiry(candidates, need);
    if (shortfall > 0) {
      return { ok: false, reason: 'BATCH_SHORTAGE', available: need - shortfall };
    }
    allocations = picked.map((a) => toAllocation(batches.find((b) => b.id === a.batchId)!, a.quantity));
  }
  // Hàng nhập trước khi có quản lý lô thì chỉ có tồn tổng, trừ thẳng tồn tổng

  for (const a of allocations) {
    await tx.batch.update({ where: { id: a.batchId }, data: { quantity: { decrement: a.quantity } } });
  }
  const updated = await tx.inventory.update({
    where: { storeId_productVariantId: { storeId, productVariantId } },
    data: { quantity: { decrement: need } },
  });

  const lines = allocations.length
    ? allocations.map((a) => ({ batchId: a.batchId as string | null, quantity: -a.quantity }))
    : [{ batchId: null, quantity: -need }];
  await tx.inventoryTransaction.createMany({
    data: lines.map((l) => ({
      storeId,
      productVariantId,
      batchId: l.batchId,
      transactionType: ref.type,
      quantity: l.quantity,
      referenceType: ref.referenceType,
      referenceId: ref.referenceId,
      note: ref.note ?? null,
      createdBy: ref.createdBy,
    })),
  });

  return {
    ok: true,
    allocations,
    quantity: updated.quantity,
    reservedQuantity: updated.reservedQuantity,
  };
};

// Cộng tồn: vào lô chỉ định, vào lô theo số lô (tạo mới nếu chưa có), hoặc chỉ tồn tổng khi biến thể chưa quản lý lô
export const putStock = async (
  tx: Tx,
  params: {
    storeId: string;
    productVariantId: string;
    quantity: number;
    batchId?: string | null;
    newBatch?: NewBatchInfo | null;
    isRestock?: boolean;
    ref: StockReference;
  },
): Promise<PutStockResult> => {
  const { storeId, productVariantId, quantity, ref } = params;
  const where = { storeId, productVariantId };
  let batchId: string | null = null;
  let batchNumber: string | null = null;

  if (params.batchId) {
    const batch = await tx.batch.findFirst({ where: { ...where, id: params.batchId } });
    if (!batch) return { ok: false, reason: 'BATCH_NOT_FOUND' };
    await tx.batch.update({ where: { id: batch.id }, data: { quantity: { increment: quantity } } });
    batchId = batch.id;
    batchNumber = batch.batchNumber;
  } else if (params.newBatch) {
    const info = params.newBatch;
    const existing = await tx.batch.findUnique({
      where: { storeId_productVariantId_batchNumber: { ...where, batchNumber: info.batchNumber } },
    });
    if (existing && existing.expiryDate.getTime() !== info.expiryDate.getTime()) {
      return { ok: false, reason: 'BATCH_EXPIRY_MISMATCH' };
    }
    const saved = existing
      ? await tx.batch.update({
          where: { id: existing.id },
          data: { quantity: { increment: quantity } },
        })
      : await tx.batch.create({
          data: {
            ...where,
            batchNumber: info.batchNumber,
            quantity,
            expiryDate: info.expiryDate,
            manufactureDate: info.manufactureDate ?? null,
            supplierId: info.supplierId ?? null,
          },
        });
    batchId = saved.id;
    batchNumber = saved.batchNumber;
  }

  const lastRestockAt = params.isRestock ? new Date() : undefined;
  const updated = await tx.inventory.upsert({
    where: { storeId_productVariantId: where },
    update: { quantity: { increment: quantity }, lastRestockAt },
    create: { ...where, quantity, lastRestockAt },
  });
  await tx.inventoryTransaction.create({
    data: {
      ...where,
      batchId,
      transactionType: ref.type,
      quantity,
      referenceType: ref.referenceType,
      referenceId: ref.referenceId,
      note: ref.note ?? null,
      createdBy: ref.createdBy,
    },
  });
  return {
    ok: true,
    batchId,
    batchNumber,
    quantity: updated.quantity,
    reservedQuantity: updated.reservedQuantity,
  };
};
