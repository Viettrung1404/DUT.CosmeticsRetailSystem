import { findStockShortages, formatShortages } from '../stock-check.util';

const item = (productVariantId: string, quantity: number) => ({
  productVariantId,
  productName: `SP ${productVariantId}`,
  variantName: '50ml',
  quantity,
});

describe('findStockShortages', () => {
  it('đơn online đã giữ hàng: không tính trùng phần giữ của chính đơn', () => {
    // Kho có 5, đang giữ 2 (chính là 2 cái của đơn này) → vẫn đủ
    const shortages = findStockShortages(
      [item('v1', 2)],
      [{ productVariantId: 'v1', quantity: 5, reservedQuantity: 2 }],
      true,
    );
    expect(shortages).toEqual([]);
  });

  it('tồn thực tế bị giảm sau khi đặt (kiểm kê hụt) → báo thiếu', () => {
    // Giữ 5 (đơn này 3 + đơn khác 2) nhưng kho chỉ còn 4 → phần cho đơn này còn 2
    const shortages = findStockShortages(
      [item('v1', 3)],
      [{ productVariantId: 'v1', quantity: 4, reservedQuantity: 5 }],
      true,
    );
    expect(shortages).toEqual([
      { productName: 'SP v1', variantName: '50ml', required: 3, available: 2 },
    ]);
  });

  it('đơn chưa giữ hàng: so thẳng với tồn khả dụng', () => {
    const shortages = findStockShortages(
      [item('v1', 3)],
      [{ productVariantId: 'v1', quantity: 5, reservedQuantity: 3 }],
      false,
    );
    expect(shortages[0]).toMatchObject({ required: 3, available: 2 });
  });

  it('chưa có dòng tồn kho tại cửa hàng → thiếu toàn bộ', () => {
    expect(findStockShortages([item('v9', 1)], [], true)).toEqual([
      { productName: 'SP v9', variantName: '50ml', required: 1, available: 0 },
    ]);
  });

  it('cùng biến thể xuất hiện ở hai dòng thì cộng dồn số lượng', () => {
    const shortages = findStockShortages(
      [item('v1', 2), item('v1', 2)],
      [{ productVariantId: 'v1', quantity: 3, reservedQuantity: 0 }],
      false,
    );
    expect(shortages[0]).toMatchObject({ required: 4, available: 3 });
  });

  it('formatShortages ghép thông báo dễ đọc', () => {
    expect(
      formatShortages([{ productName: 'Kem', variantName: '50ml', required: 3, available: 1 }]),
    ).toBe('Kem (50ml): cần 3, còn 1');
  });
});
