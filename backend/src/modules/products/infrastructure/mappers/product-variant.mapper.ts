import { ProductVariant as PrismaProductVariant, Prisma } from '@prisma/client';
import { ProductVariantEntity } from '../../domain/entities/product-variant.entity';

export class ProductVariantMapper {
  static toDomain(raw: PrismaProductVariant): ProductVariantEntity {
    return new ProductVariantEntity({
      id: raw.id,
      productId: raw.productId,
      sku: raw.sku,
      barcode: raw.barcode,
      option1Value: raw.option1Value,
      option2Value: raw.option2Value,
      option3Value: raw.option3Value,
      price: Number(raw.price),
      costPrice: Number(raw.costPrice),
      weight: raw.weight == null ? null : Number(raw.weight),
      unit: raw.unit,
      stockQuantity: raw.stockQuantity,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(entity: ProductVariantEntity): Prisma.ProductVariantUncheckedCreateInput {
    return {
      productId: entity.productId,
      sku: entity.sku,
      barcode: entity.barcode ?? null,
      option1Value: entity.option1Value ?? null,
      option2Value: entity.option2Value ?? null,
      option3Value: entity.option3Value ?? null,
      price: entity.price,
      costPrice: entity.costPrice,
      weight: entity.weight ?? null,
      unit: entity.unit ?? null,
      isActive: entity.isActive,
    };
  }
}
