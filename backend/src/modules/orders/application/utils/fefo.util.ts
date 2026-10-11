export interface FefoBatch {
  id: string;
  quantity: number;
  expiryDate: Date;
}

export interface FefoAllocation {
  batchId: string;
  quantity: number;
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// BR-04: hàng còn hạn dưới 3 tháng là "cận date", không xuất cho đơn online (hạn tính theo ngày Việt Nam)
export const minExpiryForOnline = (now: Date): Date => {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth() + 3, vn.getUTCDate()));
};

// BR-08 FEFO: lô hết hạn sớm hơn xuất trước
export const allocateFefo = (
  batches: FefoBatch[],
  required: number,
  minExpiry: Date,
): { allocations: FefoAllocation[]; shortfall: number } => {
  const eligible = batches
    .filter((b) => b.quantity > 0 && b.expiryDate.getTime() >= minExpiry.getTime())
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

  const allocations: FefoAllocation[] = [];
  let remaining = required;
  for (const batch of eligible) {
    if (remaining === 0) break;
    const take = Math.min(batch.quantity, remaining);
    allocations.push({ batchId: batch.id, quantity: take });
    remaining -= take;
  }

  return { allocations, shortfall: remaining };
};
