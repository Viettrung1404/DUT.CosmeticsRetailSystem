export interface StockCheckItem {
  productVariantId: string;
  productName: string;
  variantName: string;
  quantity: number;
}

export interface StockCheckInventory {
  productVariantId: string;
  quantity: number;
  reservedQuantity: number;
}

export interface StockShortage {
  productName: string;
  variantName: string;
  required: number;
  available: number;
}

// Đơn online đã giữ hàng lúc đặt (reserved_quantity gồm cả phần của chính đơn này),
// nên phải trừ phần của đơn ra trước khi so, nếu không sẽ bị tính trùng
export const findStockShortages = (
  items: StockCheckItem[],
  inventories: StockCheckInventory[],
  reservedByThisOrder: boolean,
): StockShortage[] => {
  const required = new Map<string, StockCheckItem>();
  for (const item of items) {
    const existing = required.get(item.productVariantId);
    required.set(
      item.productVariantId,
      existing ? { ...existing, quantity: existing.quantity + item.quantity } : { ...item },
    );
  }

  const shortages: StockShortage[] = [];
  for (const item of required.values()) {
    const inv = inventories.find((i) => i.productVariantId === item.productVariantId);
    const reservedByOthers = inv
      ? inv.reservedQuantity - (reservedByThisOrder ? item.quantity : 0)
      : 0;
    const available = inv ? inv.quantity - reservedByOthers : 0;

    if (available < item.quantity) {
      shortages.push({
        productName: item.productName,
        variantName: item.variantName,
        required: item.quantity,
        available: Math.max(available, 0),
      });
    }
  }
  return shortages;
};

export const formatShortages = (shortages: StockShortage[]): string =>
  shortages
    .map((s) => `${s.productName} (${s.variantName}): cần ${s.required}, còn ${s.available}`)
    .join('; ');
