import { Brand as PrismaBrand, Prisma } from '@prisma/client';
import { BrandEntity } from '../../domain/entities/brand.entity';

export class BrandMapper {
  static toDomain(raw: PrismaBrand): BrandEntity {
    return new BrandEntity({
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      logoUrl: raw.logoUrl,
      bannerUrl: raw.bannerUrl,
      description: raw.description,
      countryOfOrigin: raw.countryOfOrigin,
      websiteUrl: raw.websiteUrl,
      sortOrder: raw.sortOrder,
      isFeatured: raw.isFeatured,
      isActive: raw.isActive,
      metaTitle: raw.metaTitle,
      metaDescription: raw.metaDescription,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(entity: BrandEntity): Prisma.BrandUncheckedCreateInput {
    return {
      name: entity.name,
      slug: entity.slug,
      logoUrl: entity.logoUrl,
      bannerUrl: entity.bannerUrl,
      description: entity.description,
      countryOfOrigin: entity.countryOfOrigin,
      websiteUrl: entity.websiteUrl,
      sortOrder: entity.sortOrder,
      isFeatured: entity.isFeatured,
      isActive: entity.isActive,
      metaTitle: entity.metaTitle,
      metaDescription: entity.metaDescription,
    };
  }
}
