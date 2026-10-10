export interface BatchStock {
  id: string;
  quantity: number;
  expiryDate: Date;
}

export interface BatchAllocation {
  batchId: string;
  quantity: number;
}

// BR-08 FEFO: lô hết hạn sớm hơn xuất trước. Xuất thủ công lấy cả lô cận date / hết hạn (để hủy hàng)
export const allocateByExpiry = (
  batches: BatchStock[],
  required: number,
): { allocations: BatchAllocation[]; shortfall: number } => {
  const sorted = batches
    .filter((b) => b.quantity > 0)
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

  const allocations: BatchAllocation[] = [];
  let remaining = required;
  for (const batch of sorted) {
    if (remaining === 0) break;
    const take = Math.min(batch.quantity, remaining);
    allocations.push({ batchId: batch.id, quantity: take });
    remaining -= take;
  }
  return { allocations, shortfall: remaining };
};

// Giá vốn bình quân gia quyền: (tồn cũ × giá cũ + nhập mới × giá nhập) / (tồn cũ + nhập mới)
export const weightedAverageCost = (
  currentQuantity: number,
  currentCost: number,
  addedQuantity: number,
  addedCost: number,
): number => {
  const oldQuantity = Math.max(currentQuantity, 0);
  const totalQuantity = oldQuantity + addedQuantity;
  if (totalQuantity <= 0) {
    return addedCost;
  }
  const cost = (oldQuantity * currentCost + addedQuantity * addedCost) / totalQuantity;
  return Math.round(cost * 100) / 100;
};
