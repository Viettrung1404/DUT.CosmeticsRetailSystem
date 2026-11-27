import { ProductVariantEntity } from '../entities/product-variant.entity';
import { VariantOptionValues } from '../entities/product.entity';

export const PRODUCT_VARIANT_REPOSITORY = Symbol('IProductVariantRepository');

export interface IProductVariantRepository {
  findById(id: string): Promise<ProductVariantEntity | null>;
  findByProduct(productId: string): Promise<ProductVariantEntity[]>;
  findBySku(sku: string): Promise<ProductVariantEntity | null>;
  findByBarcode(barcode: string): Promise<ProductVariantEntity | null>;
  findByOptions(productId: string, options: VariantOptionValues): Promise<ProductVariantEntity | null>;
  create(variant: ProductVariantEntity): Promise<ProductVariantEntity>;
  update(variant: ProductVariantEntity): Promise<ProductVariantEntity>;
}
