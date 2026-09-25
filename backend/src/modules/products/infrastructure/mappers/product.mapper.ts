import {
  Product as PrismaProduct,
  ProductVariant as PrismaProductVariant,
  ProductImage as PrismaProductImage,
  ProductIngredient as PrismaProductIngredient,
  ProductTag as PrismaProductTag,
  Brand as PrismaBrand,
  Category as PrismaCategory,
} from '@prisma/client';
import {
  ProductEntity,
  ProductImageProps,
  ProductVariantProps,
} from '../../domain/entities/product.entity';

/** Prisma Product with eagerly-loaded relations */
export type ProductWithRelations = PrismaProduct & {
  variants?: PrismaProductVariant[];
  images?: PrismaProductImage[];
  ingredients?: PrismaProductIngredient[];
  tags?: PrismaProductTag[];
  brand?: PrismaBrand | null;
  category?: PrismaCategory | null;
};

/** Product persistence data (excluding auto-generated fields) */
export interface ProductPersistenceData {
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
  /** Converts Prisma persistence data to Domain Entity */
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
      brandName: raw.brand?.name ?? null,
      categoryName: raw.category?.name,
      categorySlug: raw.category?.slug,
      isCategoryActive: raw.category ? raw.category.isActive : true,
      isBrandActive: raw.brand ? raw.brand.isActive : true,
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
      images: raw.images?.map((img: PrismaProductImage) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        altText: img.altText,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
        productVariantId: img.productVariantId,
      })),
      ingredients: raw.ingredients?.map((pi: PrismaProductIngredient) => ({
        id: pi.id,
        ingredientName: pi.ingredientName,
        percentage: pi.percentage,
        isKeyIngredient: pi.isKeyIngredient,
      })),
      tags: raw.tags?.map((pt: PrismaProductTag) => pt.tagName),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /** Converts Domain Entity to persistence data */
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

  static variantToPersistence(v: ProductVariantProps) {
    return {
      sku: v.sku,
      barcode: v.barcode ?? null,
      option1Value: v.option1Value ?? null,
      option2Value: v.option2Value ?? null,
      option3Value: v.option3Value ?? null,
      price: v.price,
      costPrice: v.costPrice,
      weight: v.weight ?? null,
      unit: v.unit ?? null,
      isActive: v.isActive ?? true,
    };
  }

  static imageToPersistence(img: ProductImageProps) {
    return {
      imageUrl: img.imageUrl,
      altText: img.altText ?? null,
      sortOrder: img.sortOrder,
      isPrimary: img.isPrimary,
    };
  }
}
