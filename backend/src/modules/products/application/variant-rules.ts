import { ConflictException } from '@nestjs/common';
import { IProductVariantRepository } from '../domain/repositories/product-variant.repository.interface';

export async function assertVariantCodesUnique(
  variantRepository: IProductVariantRepository,
  codes: { sku?: string; barcode?: string | null },
  excludeVariantId?: string,
): Promise<void> {
  if (codes.sku) {
    const sameSku = await variantRepository.findBySku(codes.sku);
    if (sameSku && sameSku.id !== excludeVariantId) {
      throw new ConflictException(`SKU biến thể "${codes.sku}" đã tồn tại`);
    }
  }
  if (codes.barcode) {
    const sameBarcode = await variantRepository.findByBarcode(codes.barcode);
    if (sameBarcode && sameBarcode.id !== excludeVariantId) {
      throw new ConflictException(`Mã vạch "${codes.barcode}" đã được biến thể khác sử dụng`);
    }
  }
}
