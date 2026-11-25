import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { ProductFilterDto } from '../../presentation/dtos/product-filter.dto';
import { ProductResponseDto } from '../../presentation/dtos/product-response.dto';
import { ProductMapper } from '../../infrastructure/mappers/product.mapper';
import { productIncludeConfig } from '../../infrastructure/persistence/prisma-product.repository';
import { OpenSearchProductService } from '../../infrastructure/search/opensearch-product.service';
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
  private readonly logger = new Logger(PublicCatalogService.name);
  private readonly listCache = new Map<string, { data: any; expiresAt: number }>();
  private readonly detailCache = new Map<string, { data: any; expiresAt: number }>();
  private readonly relatedCache = new Map<string, { data: any; expiresAt: number }>();

  constructor(
    private readonly db: PrismaService,
    @Optional() private readonly searchService?: OpenSearchProductService,
  ) {}
  async facets(categoryId?: string) {
    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    let validCategoryId = categoryId && isUuid(categoryId) ? categoryId : undefined;
    if (categoryId && !validCategoryId) {
      const cat = await this.db.category.findFirst({
        where: { slug: categoryId, isActive: true },
        select: { id: true },
      });
      if (cat) validCategoryId = cat.id;
    }
    const resolvedCategoryIds = validCategoryId ? await this.resolveCategoryHierarchy(validCategoryId) : undefined;

    if (this.searchService?.isAvailable) {
      try {
        const osFacets = await this.searchService.getFacets(resolvedCategoryIds);
        if (osFacets && (validCategoryId ? osFacets.brands.length > 0 : (osFacets.categories.length > 0 || osFacets.brands.length > 0))) {
          return osFacets;
        }
      } catch {
        // Fallback to PostgreSQL
      }
    }

    const active: any = {
      isActive: true,
      category: { isActive: true },
      variants: { some: { isActive: true } },
      OR: [{ brandId: null }, { brand: { isActive: true } }],
    };
    if (resolvedCategoryIds && resolvedCategoryIds.length > 0) {
      active.categoryId = { in: resolvedCategoryIds };
    }

    const [categoryCounts, brandCounts, tagCounts] = await Promise.all([
      this.db.product.groupBy({ by: ['categoryId'], where: active, _count: { _all: true } }),
      this.db.product.groupBy({ by: ['brandId'], where: active, _count: { _all: true } }),
      this.db.productTag.groupBy({ by: ['tagName'], where: { product: active }, _count: { _all: true } }),
    ]);
    const [categories, brands] = await Promise.all([
      this.db.category.findMany({ where: { id: { in: categoryCounts.map(row => row.categoryId) } }, select: { id: true, name: true, slug: true } }),
      this.db.brand.findMany({ where: { id: { in: brandCounts.flatMap(row => row.brandId ? [row.brandId] : []) }, isActive: true }, select: { id: true, name: true, slug: true } }),
    ]);
    return {
      categories: categories.map(item => ({ ...item, count: categoryCounts.find(row => row.categoryId === item.id)?._count._all ?? 0 })),
      brands: brands
        .map(item => ({ ...item, count: brandCounts.find(row => row.brandId === item.id)?._count._all ?? 0 }))
        .filter(item => item.count > 0)
        .sort((a,b) => b.count - a.count || a.name.localeCompare(b.name)),
      tags: tagCounts.map(row => ({ name: row.tagName, count: row._count._all })).sort((a,b) => b.count - a.count || a.name.localeCompare(b.name)),
    };
  }
  async availability(productId: string, variantId: string) {
    const variant = await this.db.productVariant.findFirst({ where: { id: variantId, productId, isActive: true, product: { isActive: true } }, select: { id: true } });
    if (!variant) throw new NotFoundException('VARIANT_NOT_FOUND');
    const stores = await this.db.store.findMany({
      where: { isActive: true, type: { in: ['STORE', 'WAREHOUSE'] } }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 100,
      select: { id: true, name: true, address: true, city: true, inventory: { where: { productVariantId: variantId }, select: { quantity: true, reservedQuantity: true } } },
    });
    return stores.map(store => ({ id: store.id, name: store.name, address: store.address, city: store.city, available: Math.max(0, (store.inventory[0]?.quantity ?? 0) - (store.inventory[0]?.reservedQuantity ?? 0)) }));
  }
  async tryOnColors(productId: string) {
    const product = await this.db.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const [column] = await this.db.$queryRaw<{ exists: boolean }[]>`SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='product_variants' AND column_name='try_on_color_hex') AS "exists"`;
    const variants = column?.exists
      ? await this.db.$queryRaw<{ id: string; option1Value: string | null; option2Value: string | null; colorHex: string | null }[]>`SELECT id,option1_value AS "option1Value",option2_value AS "option2Value",try_on_color_hex AS "colorHex" FROM product_variants WHERE product_id=${productId}::uuid AND is_active=true ORDER BY created_at,id`
      : await this.db.$queryRaw<{ id: string; option1Value: string | null; option2Value: string | null; colorHex: string | null }[]>`SELECT id,option1_value AS "option1Value",option2_value AS "option2Value",NULL::text AS "colorHex" FROM product_variants WHERE product_id=${productId}::uuid AND is_active=true ORDER BY created_at,id`;
    return variants.map(variant => ({ variantId: variant.id, label: [variant.option1Value, variant.option2Value].filter(Boolean).join(' · '), colorHex: variant.colorHex }));
  }
  private categoryHierarchyCache: { data: Map<string, string[]>; expiresAt: number } | null = null;

  private async getCategoryHierarchyMap(): Promise<Map<string, string[]>> {
    if (this.categoryHierarchyCache && this.categoryHierarchyCache.expiresAt > Date.now()) {
      return this.categoryHierarchyCache.data;
    }
    const allCategories = await this.db.category.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true },
    });
    const map = new Map<string, string[]>();
    for (const cat of allCategories) {
      if (cat.parentId) {
        const list = map.get(cat.parentId) || [];
        list.push(cat.id);
        map.set(cat.parentId, list);
      }
    }
    this.categoryHierarchyCache = { data: map, expiresAt: Date.now() + 10 * 60 * 1000 };
    return map;
  }

  private async resolveCategoryHierarchy(
    categoryId?: string,
    categoryIds?: string[],
  ): Promise<string[] | undefined> {
    const rootIds = [
      ...(categoryId ? [categoryId] : []),
      ...(categoryIds ? categoryIds : []),
    ];
    if (rootIds.length === 0) return undefined;

    const childMap = await this.getCategoryHierarchyMap();
    const allIds = new Set<string>(rootIds);
    const queue = [...rootIds];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childMap.get(current);
      if (children) {
        for (const childId of children) {
          if (!allIds.has(childId)) {
            allIds.add(childId);
            queue.push(childId);
          }
        }
      }
    }
    return Array.from(allIds);
  }

  private async tier(userId?: string) {
    if (!userId) return 0;
    const customer = await this.db.customer.findFirst({
      where: { userId, user: { roleId: 6, status: 'ACTIVE' } },
      select: { loyaltyTier: { select: { discountPercentage: true } } },
    });
    return Number(customer?.loyaltyTier?.discountPercentage ?? 0);
  }
  async list(filter: ProductFilterDto, userId?: string, query?: string): Promise<{ items: ProductResponseDto[]; total: number }> {
    const page = filter.page ?? 1,
      limit = filter.limit ?? 20;
    const tier = await this.tier(userId);

    const cacheKey = `${userId ? 'u:' + tier : 'g'}:${query ?? ''}:${page}:${limit}:${filter.sortBy ?? ''}:${filter.categoryId ?? ''}:${filter.categoryIds?.join(',') ?? ''}:${filter.brandId ?? ''}:${filter.brandIds?.join(',') ?? ''}:${filter.minPrice ?? ''}:${filter.maxPrice ?? ''}:${filter.rating ?? ''}:${filter.tag ?? ''}:${filter.tags?.join(',') ?? ''}`;
    const cached = this.listCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // ===== 1. HYBRID PATH: OpenSearch handles Filtering, Sorting & Pagination =====
    if (this.searchService?.isAvailable) {
      try {
        const resolvedCategoryIds = await this.resolveCategoryHierarchy(
          filter.categoryId,
          filter.categoryIds,
        );
        const searchResult = await this.searchService.filterProducts({
          query: query?.trim() || undefined,
          categoryId: filter.categoryId,
          categoryIds: resolvedCategoryIds,
          brandId: filter.brandId,
          brandIds: filter.brandIds,
          minPrice: filter.minPrice,
          maxPrice: filter.maxPrice,
          rating: filter.rating,
          tag: filter.tag,
          tags: filter.tags,
          sortBy: filter.sortBy,
          from: (page - 1) * limit,
          size: limit,
        });

        if (searchResult !== null) {
          const { ids, total, docs } = searchResult;
          if (ids.length === 0) {
            const emptyResult = { items: [], total };
            this.listCache.set(cacheKey, { data: emptyResult, expiresAt: Date.now() + 45000 });
            return emptyResult;
          }

          // Fetch real-time effective prices (Flash Sale & Promotions) for all active variants
          const variantPrices = ids.length ? await this.variantPrices(ids, tier) : [];
          const priceMap = new Map<string, number[]>();
          for (const vp of variantPrices) {
            const list = priceMap.get(vp.productId) || [];
            list.push(Number(vp.price));
            priceMap.set(vp.productId, list);
          }

          // High-speed listing directly from OpenSearch documents with promotion pricing
          const items = docs.map((doc) => {
            const basePrice = Number(doc.basePrice);
            const varPrices = priceMap.get(doc.id);
            const minEff = varPrices && varPrices.length ? Math.min(...varPrices) : null;
            const maxEff = varPrices && varPrices.length ? Math.max(...varPrices) : null;

            const effectivePrice =
              minEff ??
              (tier > 0
                ? Math.round(Number(doc.salePrice ?? doc.minPrice ?? basePrice) * (1 - tier / 100))
                : Number(doc.salePrice ?? doc.minPrice ?? basePrice));
            const salePrice = effectivePrice < basePrice ? effectivePrice : (doc.salePrice ? Number(doc.salePrice) : null);
            return {
              id: doc.id,
              categoryId: doc.categoryId,
              brandId: doc.brandId ?? null,
              brandName: doc.brandName ?? null,
              categoryName: doc.categoryName || undefined,
              primaryImage: doc.primaryImage ?? null,
              name: doc.name,
              slug: doc.slug,
              sku: doc.sku,
              description: null,
              shortDescription: null,
              basePrice,
              salePrice,
              effectivePrice,
              effectivePriceMax: maxEff ?? (doc.maxPrice ? Number(doc.maxPrice) : effectivePrice),
              avgRating: Number(doc.avgRating ?? 0),
              totalReviews: Number(doc.totalReviews ?? (doc as any).total_reviews ?? 0),
              totalSold: doc.totalSold ?? 0,
              isActive: doc.isActive,
              isFeatured: (doc as any).isFeatured ?? false,
              option1Name: null,
              option2Name: null,
              option3Name: null,
              variants: [],
              images: doc.primaryImage
                ? [{ imageUrl: doc.primaryImage, isPrimary: true, sortOrder: 0 }]
                : [],
              ingredients: [],
              tags: doc.tags ?? [],
              createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
              updatedAt: undefined,
              promotions: [],
              priceBasis: 'SINGLE_UNIT_WITHOUT_CART_CONDITIONS',
              reservation: false,
              isWishlisted: false,
            };
          });

          const result = { items, total };
          this.listCache.set(cacheKey, { data: result, expiresAt: Date.now() + 45000 });
          if (this.listCache.size > 500) {
            const first = this.listCache.keys().next().value;
            if (first) this.listCache.delete(first);
          }
          return result;
        }
      } catch {
        // Fallback to PostgreSQL path below if OpenSearch throws
      }
    }

    // ===== 2. FALLBACK PATH: PostgreSQL Raw SQL CTE =====
    // OpenSearch contributes relevance hints; DB remains authoritative for membership, price and pagination.
    const hints = query && this.searchService ? await this.searchService.search(query, 0, 100) : null;
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
      { id: string; category_id: string; effective_price: Prisma.Decimal; total: bigint }[]
    >(Prisma.sql`
      WITH RECURSIVE selected_categories AS (SELECT id FROM categories WHERE id=${filter.categoryId ?? null}::uuid OR id=ANY(${filter.categoryIds ?? []}::uuid[]) UNION ALL SELECT c.id FROM categories c JOIN selected_categories parent ON c.parent_id=parent.id),
      candidate_variants AS (
        SELECT p.id,p.created_at,p.avg_rating,p.total_sold,p.category_id,v.id AS variant_id,v.price
        FROM products p JOIN categories c ON c.id=p.category_id
        LEFT JOIN brands b ON b.id=p.brand_id
        JOIN product_variants v ON v.product_id=p.id AND v.is_active=true
        WHERE p.is_active=true AND c.is_active=true AND (p.brand_id IS NULL OR b.is_active=true)
        AND (${filter.categoryId ?? null}::uuid IS NULL AND cardinality(${filter.categoryIds ?? []}::uuid[])=0 OR p.category_id IN (SELECT id FROM selected_categories))
        AND (${filter.brandId ?? null}::uuid IS NULL AND cardinality(${filter.brandIds ?? []}::uuid[])=0 OR p.brand_id=${filter.brandId ?? null}::uuid OR p.brand_id=ANY(${filter.brandIds ?? []}::uuid[]))
        AND (${filter.rating ?? null}::numeric IS NULL OR p.avg_rating>=${filter.rating ?? null})
        AND (${filter.tag ?? null}::text IS NULL OR EXISTS(SELECT 1 FROM product_tags t WHERE t.product_id=p.id AND t.tag_name ILIKE ${'%' + (filter.tag ?? '') + '%'}))
        AND (cardinality(${filter.tags ?? []}::text[])=0 OR EXISTS(SELECT 1 FROM product_tags t WHERE t.product_id=p.id AND t.tag_name=ANY(${filter.tags ?? []}::text[])))
        AND (${query ?? null}::text IS NULL OR p.name ILIKE ${'%' + (query ?? '') + '%'} OR p.description ILIKE ${'%' + (query ?? '') + '%'} OR b.name ILIKE ${'%' + (query ?? '') + '%'} OR p.id=ANY(${hintIds}::uuid[]) OR EXISTS(SELECT 1 FROM product_ingredients i WHERE i.product_id=p.id AND i.ingredient_name ILIKE ${'%' + (query ?? '') + '%'}))
      ), active_campaigns AS MATERIALIZED (
        SELECT id,type,value,max_discount_amount,applicable_products,applicable_categories,is_flash_sale
        FROM promotions WHERE is_active AND start_date<=now() AND end_date>now()
          AND min_order_amount=0 AND (usage_limit IS NULL OR used_count<usage_limit)
          AND type IN ('PERCENTAGE','FIXED_AMOUNT')
      ), campaign_discounts AS (
        SELECT candidate.variant_id,MAX(LEAST(candidate.price,
          CASE WHEN campaign.type='PERCENTAGE' THEN trunc(candidate.price*campaign.value/100,2) ELSE campaign.value END,
          COALESCE(campaign.max_discount_amount,candidate.price))) AS discount
        FROM candidate_variants candidate JOIN active_campaigns campaign ON (
          (COALESCE(campaign.applicable_products,'[]'::jsonb)='[]'::jsonb AND COALESCE(campaign.applicable_categories,'[]'::jsonb)='[]'::jsonb)
          OR campaign.applicable_products ? candidate.id::text OR campaign.applicable_categories ? candidate.category_id::text)
        LEFT JOIN promotion_variant_quotas quota ON quota.promotion_id=campaign.id AND quota.product_variant_id=candidate.variant_id
        WHERE NOT campaign.is_flash_sale OR quota.quota-quota.reserved_quantity-quota.consumed_quantity>=1
        GROUP BY candidate.variant_id
      ), priced AS (
        SELECT candidate.id,candidate.category_id,candidate.created_at,candidate.avg_rating,candidate.total_sold,
          MIN(GREATEST(0,candidate.price-GREATEST(
            trunc(candidate.price*LEAST(100,GREATEST(0,${tier}::numeric))/100,2),
            COALESCE(campaign_discounts.discount,0)))) AS effective_price
        FROM candidate_variants candidate LEFT JOIN campaign_discounts USING (variant_id)
        GROUP BY candidate.id,candidate.category_id,candidate.created_at,candidate.avg_rating,candidate.total_sold
      ), filtered AS (SELECT * FROM priced WHERE (${filter.minPrice ?? null}::numeric IS NULL OR effective_price>=${filter.minPrice ?? null}) AND (${filter.maxPrice ?? null}::numeric IS NULL OR effective_price<=${filter.maxPrice ?? null}))
      SELECT id,category_id,effective_price,count(*) OVER() AS total FROM filtered ORDER BY ${sort},id LIMIT ${limit} OFFSET ${(page - 1) * limit}`);
    const ids = rows.map((row) => row.id);
    const categoryIds = [...new Set(rows.map((row) => row.category_id))];
    const [raw, prices, offers] = ids.length
      ? await Promise.all([
          this.db.product.findMany({
            where: {
              id: { in: ids },
              isActive: true,
              category: { isActive: true },
              OR: [{ brandId: null }, { brand: { isActive: true } }],
            },
            include: productIncludeConfig,
          }),
          this.variantPrices(ids, tier),
          this.offers(ids, categoryIds),
        ])
      : [[], [], []];
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
    const result = {
      items: rows.flatMap((row) => {
        const product = raw.find((p) => p.id === row.id);
        return product ? [this.present(product, prices, offers)] : [];
      }),
      total,
    };

    this.listCache.set(cacheKey, { data: result, expiresAt: Date.now() + 45000 });
    if (this.listCache.size > 500) {
      const first = this.listCache.keys().next().value;
      if (first) this.listCache.delete(first);
    }
    return result;
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
      { id: string; productId: string; price: Prisma.Decimal }[]
    >`SELECT id, product_id AS "productId", sprint5_variant_price(id,${tier}::numeric) AS price FROM product_variants WHERE product_id=ANY(${productIds}::uuid[]) AND is_active=true`;
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
    if (!userId) {
      const cached = this.detailCache.get(slug);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }
    }

    // ===== 1. OPTIMIZED CONSOLIDATED SQL QUERY (GIAI PHAP 3) =====
    // Consolidates product, category, brand, active variants with sprint5_variant_price,
    // images, ingredients, tags, and active promotions into 1 single round-trip to PostgreSQL.
    try {
      const tierRate = await this.tier(userId);
      const rows = await this.db.$queryRaw<any[]>`
        SELECT 
          p.id,
          p.category_id AS "categoryId",
          p.brand_id AS "brandId",
          p.name,
          p.slug,
          p.sku,
          p.description,
          p.short_description AS "shortDescription",
          p.how_to_use AS "howToUse",
          p.specifications AS "specifications",
          p.base_price AS "basePrice",
          p.sale_price AS "salePrice",
          p.option1_name AS "option1Name",
          p.option2_name AS "option2Name",
          p.option3_name AS "option3Name",
          p.video_url AS "videoUrl",
          p.is_active AS "isActive",
          p.is_featured AS "isFeatured",
          p.avg_rating AS "avgRating",
          p.total_reviews AS "totalReviews",
          p.total_sold AS "totalSold",
          p.meta_title AS "metaTitle",
          p.meta_description AS "metaDescription",
          p.meta_keywords AS "metaKeywords",
          p.created_at AS "createdAt",
          p.updated_at AS "updatedAt",
          CASE WHEN b.id IS NOT NULL THEN jsonb_build_object('id', b.id, 'name', b.name, 'slug', b.slug) ELSE NULL END AS brand,
          jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) AS category,
          (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'id', v.id, 'sku', v.sku, 'barcode', v.barcode, 'price', v.price,
              'weight', v.weight, 'unit', v.unit, 'stockQuantity', v.stock_quantity,
              'option1Value', v.option1_value, 'option2Value', v.option2_value, 'option3Value', v.option3_value,
              'isActive', v.is_active,
              'effectivePrice', sprint5_variant_price(v.id, ${tierRate}::numeric)
            ) ORDER BY v.created_at, v.id), '[]'::jsonb)
            FROM product_variants v WHERE v.product_id = p.id AND v.is_active = true
          ) AS variants,
          (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'id', img.id, 'imageUrl', img.image_url, 'altText', img.alt_text,
              'sortOrder', img.sort_order, 'isPrimary', img.is_primary, 'productVariantId', img.product_variant_id
            ) ORDER BY img.sort_order ASC), '[]'::jsonb)
            FROM product_images img WHERE img.product_id = p.id
          ) AS images,
          (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'id', ing.id, 'ingredientName', ing.ingredient_name, 'percentage', ing.percentage, 'isKeyIngredient', ing.is_key_ingredient, 'purpose', ing.purpose
            )), '[]'::jsonb)
            FROM product_ingredients ing WHERE ing.product_id = p.id
          ) AS ingredients,
          (
            SELECT COALESCE(jsonb_agg(t.tag_name), '[]'::jsonb)
            FROM product_tags t WHERE t.product_id = p.id
          ) AS tags,
          (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'id', promo.id, 'name', promo.name, 'type', promo.type,
              'minOrderAmount', promo.min_order_amount,
              'maxDiscountAmount', promo.max_discount_amount,
              'startDate', promo.start_date, 'endDate', promo.end_date,
              'conditional', (promo.min_order_amount > 0 OR promo.type = 'FREE_SHIPPING')
            ) ORDER BY promo.id), '[]'::jsonb)
            FROM promotions promo
            WHERE promo.is_active = true 
              AND promo.start_date <= now() 
              AND promo.end_date > now()
              AND (promo.usage_limit IS NULL OR promo.used_count < promo.usage_limit)
              AND (
                (COALESCE(promo.applicable_products, '[]'::jsonb) = '[]'::jsonb AND COALESCE(promo.applicable_categories, '[]'::jsonb) = '[]'::jsonb)
                OR promo.applicable_products ? p.id::text
                OR promo.applicable_categories ? p.category_id::text
              )
          ) AS promotions
        FROM products p
        JOIN categories c ON c.id = p.category_id AND c.is_active = true
        LEFT JOIN brands b ON b.id = p.brand_id AND b.is_active = true
        WHERE p.slug = ${slug} AND p.is_active = true AND (p.brand_id IS NULL OR b.id IS NOT NULL)
        LIMIT 1
      `;

      if (!rows || rows.length === 0) {
        throw new NotFoundException('PRODUCT_NOT_FOUND');
      }

      const r = rows[0];
      const images = r.images || [];
      const primaryImage =
        images.find((img: any) => img.isPrimary)?.imageUrl ||
        images[0]?.imageUrl ||
        null;
      const variants = (r.variants || []).map((v: any) => ({
        ...v,
        price: Number(v.price),
        effectivePrice: Number(v.effectivePrice ?? v.price),
      }));
      const values = variants.map((v: any) => v.effectivePrice);

      const result = {
        id: r.id,
        categoryId: r.categoryId,
        brandId: r.brandId,
        brandName: r.brand?.name ?? null,
        categoryName: r.category?.name ?? null,
        primaryImage,
        name: r.name,
        slug: r.slug,
        sku: r.sku,
        description: r.description,
        shortDescription: r.shortDescription,
        howToUse: r.howToUse ?? null,
        specifications: r.specifications ?? null,
        basePrice: Number(r.basePrice),
        salePrice: values.length
          ? Math.min(...values)
          : r.salePrice
            ? Number(r.salePrice)
            : null,
        effectivePrice: values.length ? Math.min(...values) : null,
        effectivePriceMax: values.length ? Math.max(...values) : null,
        isActive: r.isActive,
        isFeatured: r.isFeatured,
        avgRating: Number(r.avgRating ?? 0),
        totalReviews: r.totalReviews ?? 0,
        totalSold: r.totalSold ?? 0,
        option1Name: r.option1Name,
        option2Name: r.option2Name,
        option3Name: r.option3Name,
        videoUrl: r.videoUrl ?? null,
        variants,
        images,
        ingredients: r.ingredients || [],
        tags: r.tags || [],
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        promotions: r.promotions || [],
        priceBasis: 'SINGLE_UNIT_WITHOUT_CART_CONDITIONS',
        reservation: false,
        isWishlisted: false,
      };

      if (!userId) {
        this.detailCache.set(slug, {
          data: result,
          expiresAt: Date.now() + 60000,
        });
        if (this.detailCache.size > 500) {
          const first = this.detailCache.keys().next().value;
          if (first) this.detailCache.delete(first);
        }
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.warn(
        `Consolidated detail query failed for ${slug}: ${(error as Error).message}. Falling back to Prisma.`,
      );
    }

    // ===== 2. FALLBACK PATH: Original Prisma findFirst =====
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
    const [tierRate, offers] = await Promise.all([
      this.tier(userId),
      this.offers([row.id], [row.categoryId]),
    ]);
    const prices = await this.variantPrices([row.id], tierRate);
    const result = this.present(row, prices, offers);
    if (!userId) {
      this.detailCache.set(slug, { data: result, expiresAt: Date.now() + 60000 });
      if (this.detailCache.size > 500) {
        const first = this.detailCache.keys().next().value;
        if (first) this.detailCache.delete(first);
      }
    }
    return result;
  }
  async suggest(query: string, limit: number, userId?: string) {
    if (this.searchService?.isAvailable) {
      try {
        const osSuggest = await this.searchService.suggest(query, limit);
        if (osSuggest && osSuggest.length > 0) return osSuggest;
      } catch {
        // Fallback to database
      }
    }
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
  async searchHints(query: string, userId?: string) {
    const q = query.trim().slice(0, 100);
    if (!q) return { products: [], brands: [], keywords: [], history: [] };

    const fetchUserHistory = async () => {
      if (!userId) return [];
      try {
        const rows = await this.db.$queryRaw<{ query: string }[]>`
          SELECT query FROM search_histories
          WHERE user_id = ${userId}::uuid AND query ILIKE ${'%' + q + '%'}
          ORDER BY created_at DESC LIMIT 3
        `;
        return rows.map((r) => r.query);
      } catch {
        return [];
      }
    };

    // 1. Try OpenSearch fast path (~5-10ms)
    if (this.searchService?.isAvailable) {
      try {
        const osHints = await this.searchService.searchHints(q, 5);
        if (osHints && (osHints.products.length > 0 || osHints.brands.length > 0 || osHints.keywords.length > 0)) {
          const history = await fetchUserHistory();
          return { ...osHints, history };
        }
      } catch {
        // Fallback to PostgreSQL
      }
    }

    // 2. Fallback to PostgreSQL
    const activeProduct = { isActive: true, category: { isActive: true }, variants: { some: { isActive: true } } };
    const [products, brands, tags, history] = await Promise.all([
      this.suggest(q, 5, userId),
      this.db.brand.findMany({ where: { isActive: true, name: { contains: q, mode: 'insensitive' }, products: { some: activeProduct } }, select: { id: true, name: true, slug: true }, take: 4, orderBy: { name: 'asc' } }),
      this.db.productTag.groupBy({ by: ['tagName'], where: { tagName: { contains: q, mode: 'insensitive' }, product: activeProduct }, _count: { _all: true }, orderBy: { _count: { tagName: 'desc' } }, take: 5 }),
      fetchUserHistory(),
    ]);
    return { products, brands, keywords: tags.map(tag => tag.tagName), history };
  }
  async related(productId: string, limit: number, userId?: string) {
    const cacheKey = `${productId}:${limit}`;
    if (!userId) {
      const cached = this.relatedCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }
    }

    // ===== 1. OPENSEARCH FAST PATH (GIAI PHAP 1) =====
    // Uses OpenSearch More-Like-This & Category matching to return relevant products in ~80ms without hitting PostgreSQL.
    if (this.searchService?.isAvailable) {
      try {
        const osDocs = await this.searchService.getRelatedProducts(productId, limit);
        if (osDocs && osDocs.length > 0) {
          const ids = osDocs.map((d) => d.id);
          const tierRate = await this.tier(userId);
          const variantPrices = ids.length ? await this.variantPrices(ids, tierRate) : [];
          const priceMap = new Map<string, number[]>();
          for (const vp of variantPrices) {
            const list = priceMap.get(vp.productId) || [];
            list.push(Number(vp.price));
            priceMap.set(vp.productId, list);
          }

          const result = osDocs.map((doc) => {
            const basePrice = Number(doc.basePrice);
            const varPrices = priceMap.get(doc.id);
            const minEff = varPrices && varPrices.length ? Math.min(...varPrices) : null;
            const maxEff = varPrices && varPrices.length ? Math.max(...varPrices) : null;

            const effectivePrice =
              minEff ??
              (tierRate > 0
                ? Math.round(Number(doc.salePrice ?? doc.minPrice ?? basePrice) * (1 - tierRate / 100))
                : Number(doc.salePrice ?? doc.minPrice ?? basePrice));
            const salePrice = effectivePrice < basePrice ? effectivePrice : (doc.salePrice ? Number(doc.salePrice) : null);
            return {
              id: doc.id,
              categoryId: doc.categoryId,
              brandId: doc.brandId ?? null,
              brandName: doc.brandName ?? null,
              categoryName: doc.categoryName || undefined,
              primaryImage: doc.primaryImage ?? null,
              name: doc.name,
              slug: doc.slug,
              sku: doc.sku,
              description: null,
              shortDescription: null,
              basePrice,
              salePrice,
              effectivePrice,
              effectivePriceMax: maxEff ?? (doc.maxPrice ? Number(doc.maxPrice) : effectivePrice),
              avgRating: doc.avgRating ?? 0,
              totalReviews: Number(doc.totalReviews ?? (doc as any).total_reviews ?? 0),
              totalSold: doc.totalSold ?? 0,
              isActive: doc.isActive,
              isFeatured: (doc as any).isFeatured ?? false,
              option1Name: null,
              option2Name: null,
              option3Name: null,
              variants: [],
              images: doc.primaryImage
                ? [{ imageUrl: doc.primaryImage, isPrimary: true, sortOrder: 0 }]
                : [],
              ingredients: [],
              tags: doc.tags ?? [],
              createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
              updatedAt: undefined,
              promotions: [],
              priceBasis: 'SINGLE_UNIT_WITHOUT_CART_CONDITIONS',
              reservation: false,
              isWishlisted: false,
            };
          });

          if (!userId) {
            this.relatedCache.set(cacheKey, {
              data: result,
              expiresAt: Date.now() + 60000,
            });
            if (this.relatedCache.size > 500) {
              const first = this.relatedCache.keys().next().value;
              if (first) this.relatedCache.delete(first);
            }
          }
          return result;
        }
      } catch (err) {
        this.logger.warn(
          `OpenSearch related failed for ${productId}: ${(err as Error).message}. Falling back to PostgreSQL.`,
        );
      }
    }

    // ===== 2. FALLBACK PATH: PostgreSQL =====
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
    const [tierRate, offers] = await Promise.all([
      this.tier(userId),
      this.offers(
        rows.map((row) => row.id),
        rows.map((row) => row.categoryId),
      ),
    ]);
    const prices = await this.variantPrices(
      rows.map((r) => r.id),
      tierRate,
    );
    const result = rows.map((row) => this.present(row, prices, offers));
    if (!userId) {
      this.relatedCache.set(cacheKey, { data: result, expiresAt: Date.now() + 60000 });
      if (this.relatedCache.size > 500) {
        const first = this.relatedCache.keys().next().value;
        if (first) this.relatedCache.delete(first);
      }
    }
    return result;
  }
}
