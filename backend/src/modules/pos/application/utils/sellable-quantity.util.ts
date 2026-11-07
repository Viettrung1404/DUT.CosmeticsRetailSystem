import { PosVariantStock, PosVariantView } from '../../domain/entities/pos-lookup.entity';

// Bán được = tồn - đang giữ chỗ - lô đã hết hạn (BR-05, BR-15)
export const toVariantView = (stock: PosVariantStock): PosVariantView => ({
  ...stock,
  sellableQuantity: Math.max(0, stock.onHand - stock.reserved - stock.expiredQuantity),
});
