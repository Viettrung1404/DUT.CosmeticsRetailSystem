import { Category as PrismaCategory, Prisma } from '@prisma/client';
import { CategoryEntity } from '../../domain/entities/category.entity';

export type PrismaCategoryWithChildren = PrismaCategory & {
  children?: PrismaCategoryWithChildren[];
};

export class CategoryMapper {
  static toDomain(raw: PrismaCategoryWithChildren): CategoryEntity {
    return new CategoryEntity({
      id: raw.id,
      parentId: raw.parentId,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      imageUrl: raw.imageUrl,
      sortOrder: raw.sortOrder,
      isActive: raw.isActive,
      metaTitle: raw.metaTitle,
      metaDescription: raw.metaDescription,
      children: raw.children?.map((c) => CategoryMapper.toDomain(c)) ?? [],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(entity: CategoryEntity): Prisma.CategoryUncheckedCreateInput {
    return {
      parentId: entity.parentId ?? null,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      imageUrl: entity.imageUrl,
      sortOrder: entity.sortOrder,
      isActive: entity.isActive,
      metaTitle: entity.metaTitle,
      metaDescription: entity.metaDescription,
    };
  }
}
