import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  IProductRepository,
  ProductSuggestionItem,
} from '../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';
import { ProductMapper } from '../mappers/product.mapper';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { ProductFilterDto, ProductSortBy } from '../../presentation/dtos/product-filter.dto';
import { ElasticsearchProductService } from '../search/elasticsearch-product.service';
import { Prisma } from '@prisma/client';

const productIncludeConfig = {
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
      const subCategories = await this.prisma.category.findMany({
        where: { parentId: filter.categoryId, isActive: true },
        select: { id: true },
      });
      const categoryIds = [filter.categoryId, ...subCategories.map((c) => c.id)];
      categoryCondition = { in: categoryIds };
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
    const created = await this.prisma.product.create({
      data,
      include: productIncludeConfig,
    });

    const domainEntity = ProductMapper.toDomain(created);

    // Sync to Elasticsearch
    if (this.esService) {
      await this.esService.indexProduct({
        id: domainEntity.id!,
        name: domainEntity.name,
        slug: domainEntity.slug,
        sku: domainEntity.sku,
        brandName: domainEntity.brandName,
        categoryName: domainEntity.categoryName,
        ingredients: domainEntity.ingredients.map((i) => i.ingredientName),
        tags: domainEntity.tags,
        basePrice: domainEntity.basePrice,
        salePrice: domainEntity.salePrice,
        primaryImage: domainEntity.primaryImageUrl,
        avgRating: domainEntity.avgRating,
        totalSold: domainEntity.totalSold,
        isActive: domainEntity.isActive,
      });
    }

    return domainEntity;
  }

  async update(product: ProductEntity): Promise<ProductEntity> {
    const data = ProductMapper.toPersistence(product);
    const updated = await this.prisma.product.update({
      where: { id: product.id },
      data,
      include: productIncludeConfig,
    });

    const domainEntity = ProductMapper.toDomain(updated);

    // Sync to Elasticsearch
    if (this.esService) {
      await this.esService.indexProduct({
        id: domainEntity.id!,
        name: domainEntity.name,
        slug: domainEntity.slug,
        sku: domainEntity.sku,
        brandName: domainEntity.brandName,
        categoryName: domainEntity.categoryName,
        ingredients: domainEntity.ingredients.map((i) => i.ingredientName),
        tags: domainEntity.tags,
        basePrice: domainEntity.basePrice,
        salePrice: domainEntity.salePrice,
        primaryImage: domainEntity.primaryImageUrl,
        avgRating: domainEntity.avgRating,
        totalSold: domainEntity.totalSold,
        isActive: domainEntity.isActive,
      });
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
}
