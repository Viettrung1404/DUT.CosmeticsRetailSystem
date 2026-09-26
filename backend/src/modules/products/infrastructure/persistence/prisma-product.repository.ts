import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  AdminProductListFilter,
  IProductRepository,
  ProductChildrenUpdate,
  ProductSuggestionItem,
} from '../../domain/repositories/product.repository.interface';
import { ProductEntity, ProductImageProps } from '../../domain/entities/product.entity';
import { ProductMapper } from '../mappers/product.mapper';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { ProductFilterDto, ProductSortBy } from '../../presentation/dtos/product-filter.dto';
import { ElasticsearchProductService } from '../search/elasticsearch-product.service';
import { Prisma } from '@prisma/client';

export const productIncludeConfig = {
  variants: true,
  images: {
    orderBy: { sortOrder: 'asc' as const },
  },
  brand: true,
  category: true,
  ingredients: true,
  tags: true,
};

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly esService?: ElasticsearchProductService,
  ) {}

  async findById(id: string): Promise<ProductEntity | null> {
    const raw = await this.prisma.product.findUnique({
      where: { id },
      include: productIncludeConfig,
    });

    return raw ? ProductMapper.toDomain(raw) : null;
  }

  async findBySlug(slug: string): Promise<ProductEntity | null> {
    const raw = await this.prisma.product.findUnique({
      where: { slug },
      include: productIncludeConfig,
    });

    return raw ? ProductMapper.toDomain(raw) : null;
  }

  async findAll(options: PageOptionsDto): Promise<{ items: ProductEntity[]; total: number }> {
    const [rawItems, total] = await Promise.all([
      this.prisma.product.findMany({
        skip: options.skip,
        take: options.limit,
        orderBy: { createdAt: (options.order?.toLowerCase() as 'asc' | 'desc') || 'desc' },
        include: productIncludeConfig,
      }),
      this.prisma.product.count(),
    ]);

    return {
      items: rawItems.map((item) => ProductMapper.toDomain(item)),
      total,
    };
  }

  async findFiltered(filter: ProductFilterDto): Promise<{ items: ProductEntity[]; total: number }> {
    let categoryCondition: Prisma.ProductWhereInput['categoryId'];
    if (filter.categoryId) {
      categoryCondition = { in: await this.collectCategoryIds(filter.categoryId) };
    }

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      category: { isActive: true },
      AND: [
        ...(filter.brandId
          ? [{ brand: { id: filter.brandId, isActive: true } }]
          : [
              {
                OR: [
                  { brandId: null },
                  { brand: { isActive: true } },
                ],
              },
            ]),
        ...(categoryCondition ? [{ categoryId: categoryCondition }] : []),
      ],
      ...((filter.minPrice !== undefined || filter.maxPrice !== undefined) && {
        basePrice: {
          ...(filter.minPrice !== undefined && { gte: filter.minPrice }),
          ...(filter.maxPrice !== undefined && { lte: filter.maxPrice }),
        },
      }),
      ...(filter.rating !== undefined && {
        avgRating: { gte: filter.rating },
      }),
      ...(filter.tag && {
        tags: {
          some: { tagName: { contains: filter.tag, mode: 'insensitive' } },
        },
      }),
    };

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (filter.sortBy) {
      case ProductSortBy.PRICE_ASC:
        orderBy = { basePrice: 'asc' };
        break;
      case ProductSortBy.PRICE_DESC:
        orderBy = { basePrice: 'desc' };
        break;
      case ProductSortBy.BESTSELLER:
        orderBy = { totalSold: 'desc' };
        break;
      case ProductSortBy.RATING:
        orderBy = { avgRating: 'desc' };
        break;
      case ProductSortBy.NEWEST:
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [rawItems, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: filter.skip,
        take: filter.limit,
        orderBy,
        include: productIncludeConfig,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rawItems.map((item) => ProductMapper.toDomain(item)),
      total,
    };
  }

  async search(query: string, options: PageOptionsDto): Promise<{ items: ProductEntity[]; total: number }> {
    // 1. Attempt Elasticsearch search first
    if (this.esService) {
      const esResult = await this.esService.search(query, options.skip, options.limit);
      if (esResult !== null) {
        if (esResult.ids.length === 0) {
          return { items: [], total: 0 };
        }

        const rawItems = await this.prisma.product.findMany({
          where: {
            id: { in: esResult.ids },
            isActive: true,
            category: { isActive: true },
            OR: [
              { brandId: null },
              { brand: { isActive: true } },
            ],
          },
          include: productIncludeConfig,
        });

        // Preserve relevance order returned by Elasticsearch
        const itemMap = new Map(rawItems.map((item) => [item.id, item]));
        const sortedItems = esResult.ids
          .map((id) => itemMap.get(id))
          .filter((item): item is NonNullable<typeof item> => !!item)
          .map((item) => ProductMapper.toDomain(item));

        return { items: sortedItems, total: esResult.total };
      }
    }

    // 2. Fallback to PostgreSQL ILIKE search (only if Elasticsearch is unavailable)
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      category: { isActive: true },
      AND: [
        {
          OR: [
            { brandId: null },
            { brand: { isActive: true } },
          ],
        },
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { brand: { name: { contains: query, mode: 'insensitive' } } },
            { ingredients: { some: { ingredientName: { contains: query, mode: 'insensitive' } } } },
          ],
        },
      ],
    };

    const [rawItems, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: options.skip,
        take: options.limit,
        orderBy: { totalSold: 'desc' },
        include: productIncludeConfig,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rawItems.map((item) => ProductMapper.toDomain(item)),
      total,
    };
  }

  async suggest(query: string, limit = 8): Promise<ProductSuggestionItem[]> {
    if (this.esService) {
      const esSuggestions = await this.esService.suggest(query, limit);
      if (esSuggestions !== null) {
        return esSuggestions;
      }
    }

    // Fallback: Database query
    const items = await this.prisma.product.findMany({
      where: {
        isActive: true,
        category: { isActive: true },
        AND: [
          {
            OR: [
              { brandId: null },
              { brand: { isActive: true } },
            ],
          },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { brand: { name: { contains: query, mode: 'insensitive' } } },
            ],
          },
        ],
      },
      take: limit,
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 3,
        },
      },
    });

    return items.map((item) => {
      const primaryImg = item.images.find((img) => img.isPrimary);
      const imageUrl = primaryImg ? primaryImg.imageUrl : item.images[0]?.imageUrl ?? null;
      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        imageUrl,
        price: Number(item.salePrice ?? item.basePrice),
      };
    });
  }

  async findRelated(
    productId: string,
    categoryId: string,
    brandId?: string | null,
    limit = 8,
  ): Promise<ProductEntity[]> {
    const rawItems = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        isActive: true,
        category: { isActive: true },
        AND: [
          {
            OR: [
              { brandId: null },
              { brand: { isActive: true } },
            ],
          },
          {
            OR: [
              { categoryId },
              ...(brandId ? [{ brandId }] : []),
            ],
          },
        ],
      },
      take: limit,
      orderBy: { totalSold: 'desc' },
      include: productIncludeConfig,
    });

    return rawItems.map((item) => ProductMapper.toDomain(item));
  }

  async create(product: ProductEntity): Promise<ProductEntity> {
    const data = ProductMapper.toPersistence(product);
    // Tạo lồng biến thể, ảnh, tag, thành phần trong cùng một câu lệnh để Prisma bọc chung một transaction
    const created = await this.prisma.product.create({
      data: {
        ...data,
        variants: product.variants.length
          ? { create: product.variants.map((v) => ProductMapper.variantToPersistence(v)) }
          : undefined,
        images: product.images.length
          ? { create: product.images.map((img) => ProductMapper.imageToPersistence(img)) }
          : undefined,
        tags: product.tags.length
          ? { create: product.tags.map((tagName) => ({ tagName })) }
          : undefined,
        ingredients: product.ingredients.length
          ? { create: product.ingredients.map((i) => ProductMapper.ingredientToPersistence(i)) }
          : undefined,
      },
      include: productIncludeConfig,
    });

    const domainEntity = ProductMapper.toDomain(created);

    if (this.esService) {
      await this.esService.indexProduct(ProductMapper.toSearchDocument(domainEntity));
    }

    return domainEntity;
  }

  async update(product: ProductEntity, options?: ProductChildrenUpdate): Promise<ProductEntity> {
    const data = ProductMapper.toPersistence(product);
    const productId = product.id!;
    const updated = await this.prisma.$transaction(async (tx) => {
      if (options?.images) {
        await this.syncImages(tx, productId, options.images);
      }
      if (options?.tags) {
        await tx.productTag.deleteMany({ where: { productId } });
        await tx.productTag.createMany({ data: options.tags.map((tagName) => ({ productId, tagName })) });
      }
      if (options?.ingredients) {
        await tx.productIngredient.deleteMany({ where: { productId } });
        await tx.productIngredient.createMany({
          data: options.ingredients.map((i) => ({ ...ProductMapper.ingredientToPersistence(i), productId })),
        });
      }
      return tx.product.update({
        where: { id: productId },
        data,
        include: productIncludeConfig,
      });
    }, { timeout: 15_000 });

    const domainEntity = ProductMapper.toDomain(updated);

    if (this.esService) {
      await this.esService.indexProduct(ProductMapper.toSearchDocument(domainEntity));
    }

    return domainEntity;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({
      where: { id },
    });

    if (this.esService) {
      await this.esService.deleteProduct(id);
    }
  }

  async findAllForAdmin(
    filter: AdminProductListFilter,
  ): Promise<{ items: ProductEntity[]; total: number }> {
    const where: Prisma.ProductWhereInput = {
      isActive: filter.isActive,
      categoryId: filter.categoryId,
      brandId: filter.brandId,
      OR: filter.search
        ? [
            { name: { contains: filter.search, mode: 'insensitive' } },
            { sku: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [rawItems, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: filter.skip,
        take: filter.take,
        orderBy: { createdAt: filter.order },
        include: productIncludeConfig,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: rawItems.map((item) => ProductMapper.toDomain(item)), total };
  }

  async findBySku(sku: string): Promise<ProductEntity | null> {
    const raw = await this.prisma.product.findUnique({ where: { sku }, include: productIncludeConfig });
    return raw ? ProductMapper.toDomain(raw) : null;
  }

  findCategoryState(categoryId: string): Promise<{ isActive: boolean } | null> {
    return this.prisma.category.findUnique({ where: { id: categoryId }, select: { isActive: true } });
  }

  async brandExists(brandId: string): Promise<boolean> {
    return (await this.prisma.brand.count({ where: { id: brandId } })) > 0;
  }

  // So theo link ảnh: ảnh còn trong danh sách giữ nguyên id, chỉ xóa ảnh bị bỏ và thêm ảnh mới
  private async syncImages(
    tx: Prisma.TransactionClient,
    productId: string,
    images: ProductImageProps[],
  ): Promise<void> {
    const existing = await tx.productImage.findMany({ where: { productId, productVariantId: null } });
    const byUrl = new Map(existing.map((img) => [img.imageUrl, img.id]));
    const keptIds = new Set<string>();

    for (const img of images) {
      const data = ProductMapper.imageToPersistence(img);
      const existingId = byUrl.get(img.imageUrl);
      if (existingId) {
        keptIds.add(existingId);
        await tx.productImage.update({ where: { id: existingId }, data });
      } else {
        await tx.productImage.create({ data: { ...data, productId } });
      }
    }

    const removedIds = existing.filter((img) => !keptIds.has(img.id)).map((img) => img.id);
    if (removedIds.length) {
      await tx.productImage.deleteMany({ where: { id: { in: removedIds } } });
    }
  }

  // Lấy danh mục gốc + mọi cấp con cháu đang hoạt động, từng tầng một
  private async collectCategoryIds(rootId: string): Promise<string[]> {
    const ids = [rootId];
    let currentLevel = [rootId];
    while (currentLevel.length) {
      const children = await this.prisma.category.findMany({
        where: { parentId: { in: currentLevel }, isActive: true, id: { notIn: ids } },
        select: { id: true },
      });
      currentLevel = children.map((c) => c.id);
      ids.push(...currentLevel);
    }
    return ids;
  }
}
