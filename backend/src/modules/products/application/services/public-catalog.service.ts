import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { ProductFilterDto } from '../../presentation/dtos/product-filter.dto';
import { ProductResponseDto } from '../../presentation/dtos/product-response.dto';
import { ProductMapper } from '../../infrastructure/mappers/product.mapper';
import { productIncludeConfig } from '../../infrastructure/persistence/prisma-product.repository';
import { ElasticsearchProductService } from '../../infrastructure/search/elasticsearch-product.service';
interface PublicOffer {
  id: string;
  name: string;
  type: string;
  minOrderAmount: Prisma.Decimal;
  maxDiscountAmount: Prisma.Decimal | null;
  startDate: Date;
  endDate: Date;
  productIds: string[] | null;
  categoryIds: string[] | null;
}

@Injectable()
export class PublicCatalogService {
  constructor(
    private readonly db: PrismaService,
    @Optional() private readonly es?: ElasticsearchProductService,
  ) {}
  private async tier(userId?: string) {
    if (!userId) return 0;
    const customer = await this.db.customer.findFirst({
      where: { userId, user: { roleId: 6, status: 'ACTIVE' } },
      select: { loyaltyTier: { select: { discountPercentage: true } } },
    });
    return Number(customer?.loyaltyTier?.discountPercentage ?? 0);
  }
  async list(filter: ProductFilterDto, userId?: string, query?: string) {
    const page = filter.page ?? 1,
      limit = filter.limit ?? 20;
    const tier = await this.tier(userId);
    // ES contributes relevance hints; DB remains authoritative for membership, price and pagination.
    const hints = query && this.es ? await this.es.search(query, 0, 100) : null;
    const hintIds = hints?.ids ?? [];
    const sort =
      filter.sortBy === 'price_asc'
        ? Prisma.sql`effective_price ASC`
        : filter.sortBy === 'price_desc'
          ? Prisma.sql`effective_price DESC`
          : filter.sortBy === 'rating'
            ? Prisma.sql`avg_rating DESC`
            : filter.sortBy === 'bestseller'
              ? Prisma.sql`total_sold DESC`
              : query
                ? Prisma.sql`COALESCE(array_position(${hintIds}::uuid[],id),2147483647),total_sold DESC`
                : Prisma.sql`created_at DESC`;
    const rows = await this.db.$queryRaw<
      { id: string; effective_price: Prisma.Decimal; total: bigint }[]
    >(Prisma.sql`
      WITH RECURSIVE selected_categories AS (SELECT id FROM categories WHERE id=${filter.categoryId ?? null}::uuid UNION ALL SELECT c.id FROM categories c JOIN selected_categories parent ON c.parent_id=parent.id),
      priced AS (
        SELECT p.id,p.created_at,p.avg_rating,p.total_sold,MIN(sprint5_variant_price(v.id,${tier}::numeric)) AS effective_price
        FROM products p JOIN categories c ON c.id=p.category_id
        LEFT JOIN brands b ON b.id=p.brand_id
        JOIN product_variants v ON v.product_id=p.id AND v.is_active=true
        WHERE p.is_active=true AND c.is_active=true AND (p.brand_id IS NULL OR b.is_active=true)
        AND (${filter.categoryId ?? null}::uuid IS NULL OR p.category_id IN (SELECT id FROM selected_categories))
        AND (${filter.brandId ?? null}::uuid IS NULL OR p.brand_id=${filter.brandId ?? null}::uuid)
        AND (${filter.rating ?? null}::numeric IS NULL OR p.avg_rating>=${filter.rating ?? null})
        AND (${filter.tag ?? null}::text IS NULL OR EXISTS(SELECT 1 FROM product_tags t WHERE t.product_id=p.id AND t.tag_name ILIKE ${'%' + (filter.tag ?? '') + '%'}))
        AND (${query ?? null}::text IS NULL OR p.name ILIKE ${'%' + (query ?? '') + '%'} OR p.description ILIKE ${'%' + (query ?? '') + '%'} OR b.name ILIKE ${'%' + (query ?? '') + '%'} OR p.id=ANY(${hintIds}::uuid[]) OR EXISTS(SELECT 1 FROM product_ingredients i WHERE i.product_id=p.id AND i.ingredient_name ILIKE ${'%' + (query ?? '') + '%'}))
        GROUP BY p.id
      ), filtered AS (SELECT * FROM priced WHERE (${filter.minPrice ?? null}::numeric IS NULL OR effective_price>=${filter.minPrice ?? null}) AND (${filter.maxPrice ?? null}::numeric IS NULL OR effective_price<=${filter.maxPrice ?? null}))
      SELECT id,effective_price,count(*) OVER() AS total FROM filtered ORDER BY ${sort},id LIMIT ${limit} OFFSET ${(page - 1) * limit}`);
    const ids = rows.map((row) => row.id);
    const raw = ids.length
      ? await this.db.product.findMany({
          where: {
            id: { in: ids },
            isActive: true,
            category: { isActive: true },
            OR: [{ brandId: null }, { brand: { isActive: true } }],
          },
          include: productIncludeConfig,
        })
      : [];
    const prices = ids.length ? await this.variantPrices(ids, tier) : [];
    const offers = ids.length
      ? await this.offers(
          ids,
          raw.map((p) => p.categoryId),
        )
      : [];
    let total = Number(rows[0]?.total ?? 0);
    // An out-of-range page still reports the correct total.
    if (!rows.length && page > 1)
      total = (
        await this.list(
          Object.assign(new ProductFilterDto(), filter, { page: 1, limit: 1 }),
          userId,
          query,
        )
      ).total;
    return {
      items: rows.flatMap((row) => {
        const product = raw.find((p) => p.id === row.id);
        return product ? [this.present(product, prices, offers)] : [];
      }),
      total,
    };
  }
  private offers(productIds: string[], categoryIds: string[]) {
    return this.db.$queryRaw<
      PublicOffer[]
    >`SELECT id,name,type,min_order_amount AS "minOrderAmount",max_discount_amount AS "maxDiscountAmount",start_date AS "startDate",end_date AS "endDate",applicable_products AS "productIds",applicable_categories AS "categoryIds"
      FROM promotions WHERE is_active AND start_date<=now() AND end_date>now() AND (usage_limit IS NULL OR used_count<usage_limit)
      AND ((COALESCE(applicable_products,'[]'::jsonb)='[]'::jsonb AND COALESCE(applicable_categories,'[]'::jsonb)='[]'::jsonb)
        OR applicable_products ?| ${productIds}::text[] OR applicable_categories ?| ${categoryIds}::text[]) ORDER BY id`;
  }
  private variantPrices(productIds: string[], tier: number) {
    return this.db.$queryRaw<
      { id: string; price: Prisma.Decimal }[]
    >`SELECT id,sprint5_variant_price(id,${tier}::numeric) AS price FROM product_variants WHERE product_id=ANY(${productIds}::uuid[]) AND is_active=true`;
  }
  private present(
    raw: Parameters<typeof ProductMapper.toDomain>[0],
    prices: { id: string; price: Prisma.Decimal }[],
    offers: PublicOffer[] = [],
  ) {
    const product = ProductResponseDto.fromDomain(ProductMapper.toDomain(raw));
    const variants = product.variants
      .filter((v) => v.isActive)
      .map((v) => ({
        ...v,
        effectivePrice: Number(
          prices.find((p) => p.id === v.id)?.price ?? v.price,
        ),
      }));
    const values = variants.map((v) => v.effectivePrice);
    const promotions = offers
      .filter(
        (p) =>
          (!p.productIds?.length && !p.categoryIds?.length) ||
          p.productIds?.includes(product.id!) ||
          p.categoryIds?.includes(product.categoryId),
      )
      .map(({ productIds: _, categoryIds: __, ...offer }) => ({
        ...offer,
        conditional:
          Number(offer.minOrderAmount) > 0 || offer.type === 'FREE_SHIPPING',
      }));
    return {
      ...product,
      salePrice: values.length ? Math.min(...values) : null,
      effectivePrice: values.length ? Math.min(...values) : null,
      effectivePriceMax: values.length ? Math.max(...values) : null,
      variants,
      promotions,
      priceBasis: 'SINGLE_UNIT_WITHOUT_CART_CONDITIONS',
      reservation: false,
    };
  }
  async detail(slug: string, userId?: string) {
    const row = await this.db.product.findFirst({
      where: {
        slug,
        isActive: true,
        category: { isActive: true },
        OR: [{ brandId: null }, { brand: { isActive: true } }],
      },
      include: productIncludeConfig,
    });
    if (!row) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return this.present(
      row,
      await this.variantPrices([row.id], await this.tier(userId)),
      await this.offers([row.id], [row.categoryId]),
    );
  }
  async suggest(query: string, limit: number, userId?: string) {
    const result = await this.list(
      Object.assign(new ProductFilterDto(), { page: 1, limit }),
      userId,
      query,
    );
    return result.items.map((p) => ({
      id: p.id!,
      name: p.name,
      slug: p.slug,
      imageUrl: p.primaryImage ?? null,
      price: p.effectivePrice!,
    }));
  }
  async related(productId: string, limit: number, userId?: string) {
    const source = await this.db.product.findFirst({
      where: { id: productId, isActive: true },
      select: { categoryId: true, brandId: true },
    });
    if (!source) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const rows = await this.db.product.findMany({
      where: {
        id: { not: productId },
        isActive: true,
        category: { isActive: true },
        AND: [
          { OR: [{ brandId: null }, { brand: { isActive: true } }] },
          {
            OR: [
              { categoryId: source.categoryId },
              ...(source.brandId ? [{ brandId: source.brandId }] : []),
            ],
          },
        ],
      },
      orderBy: [{ totalSold: 'desc' }, { id: 'asc' }],
      take: limit,
      include: productIncludeConfig,
    });
    const prices = await this.variantPrices(
      rows.map((r) => r.id),
      await this.tier(userId),
    );
    const offers = await this.offers(
      rows.map((row) => row.id),
      rows.map((row) => row.categoryId),
    );
    return rows.map((row) => this.present(row, prices, offers));
  }
}
