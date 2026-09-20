import {
  Product as PrismaProduct,
  ProductVariant as PrismaProductVariant,
} from '@prisma/client';
import { ProductEntity } from '../../domain/entities/product.entity';

/** Prisma Product kèm các quan hệ đã eager-load */
type ProductWithRelations = PrismaProduct & {
  variants?: PrismaProductVariant[];
};

/** Dữ liệu Product để lưu/cập nhật (không bao gồm các trường auto-generated) */
interface ProductPersistenceData {
  id?: string;
  categoryId: string;
  brandId?: string | null;
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  shortDescription?: string | null;
  basePrice: number;
  salePrice?: number | null;
  option1Name?: string | null;
  option2Name?: string | null;
  option3Name?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
}

export class ProductMapper {
  /**
   * Chuyển đổi dữ liệu từ Prisma (persistence) sang Domain Entity
   */
  static toDomain(raw: ProductWithRelations): ProductEntity {
    return new ProductEntity({
      id: raw.id,
      categoryId: raw.categoryId,
      brandId: raw.brandId,
      name: raw.name,
      slug: raw.slug,
      sku: raw.sku,
      description: raw.description,
      shortDescription: raw.shortDescription,
      basePrice: Number(raw.basePrice),
      salePrice: raw.salePrice ? Number(raw.salePrice) : null,
      option1Name: raw.option1Name,
      option2Name: raw.option2Name,
      option3Name: raw.option3Name,
      isActive: raw.isActive,
      isFeatured: raw.isFeatured,
      avgRating: Number(raw.avgRating ?? 0),
      totalReviews: raw.totalReviews ?? 0,
      totalSold: raw.totalSold ?? 0,
      metaTitle: raw.metaTitle,
      metaDescription: raw.metaDescription,
      metaKeywords: raw.metaKeywords,
      variants: raw.variants?.map((v: PrismaProductVariant) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        price: Number(v.price),
        costPrice: Number(v.costPrice),
        weight: v.weight ? Number(v.weight) : null,
        unit: v.unit,
        stockQuantity: v.stockQuantity ?? 0,
        option1Value: v.option1Value,
        option2Value: v.option2Value,
        option3Value: v.option3Value,
        isActive: v.isActive,
      })),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Chuyển đổi Domain Entity sang dữ liệu Prisma để lưu trữ
   */
  static toPersistence(entity: ProductEntity): ProductPersistenceData {
    return {
      id: entity.id,
      categoryId: entity.categoryId,
      brandId: entity.brandId,
      name: entity.name,
      slug: entity.slug,
      sku: entity.sku,
      description: entity.description,
      shortDescription: entity.shortDescription,
      basePrice: entity.basePrice,
      salePrice: entity.salePrice,
      option1Name: entity.option1Name,
      option2Name: entity.option2Name,
      option3Name: entity.option3Name,
      isActive: entity.isActive,
      isFeatured: entity.isFeatured,
      metaTitle: entity.metaTitle,
      metaDescription: entity.metaDescription,
      metaKeywords: entity.metaKeywords,
    };
  }
}


