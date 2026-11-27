import { promotionSlotEnd } from '@core/utils/flash-sale.util';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { ProductFilterDto } from '../../presentation/dtos/product-filter.dto';
import { ProductResponseDto } from '../../presentation/dtos/product-response.dto';
import { ProductMapper } from '../../infrastructure/mappers/product.mapper';
import { productIncludeConfig } from '../../infrastructure/persistence/prisma-product.repository';
import { OpenSearchProductService } from '../../infrastructure/search/opensearch-product.service';
interface PublicOffer {
  isFlashSale?: boolean;
  slotStartHour?: number | null;
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
      select: { id: true, name: true, address: true, city: true, inventory: { where: { productVariantId: variantId }, select: { availableQuantity: true } } },
    });
    return stores.map(store => ({ id: store.id, name: store.name, address: store.address, city: store.city, available: Math.max(0, store.inventory[0]?.availableQuantity ?? 0) }))
      .sort((a, b) => b.available - a.available || a.name.localeCompare(b.name, 'vi') || a.id.localeCompare(b.id));
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

    // Search only contributes relevance hints. Prices, visibility, filtering and
    // pagination always come from PostgreSQL, including edits made directly in DB.
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
      ), priced AS (
        SELECT candidate.id,candidate.category_id,candidate.created_at,candidate.avg_rating,candidate.total_sold,
          MIN(sprint5_variant_price(candidate.variant_id, ${tier}::numeric)) AS effective_price
        FROM candidate_variants candidate
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

    return result;
  }
  private offers(productIds: string[], categoryIds: string[]) {
    return this.db.$queryRaw<
      PublicOffer[]
    >`SELECT id,name,type,is_flash_sale AS "isFlashSale",slot_start_hour AS "slotStartHour",min_order_amount AS "minOrderAmount",max_discount_amount AS "maxDiscountAmount",start_date AS "startDate",end_date AS "endDate",applicable_products AS "productIds",applicable_categories AS "categoryIds"
      FROM promotions WHERE is_active AND start_date<=now() AND end_date>now() AND glowup_slot_active(slot_start_hour) AND (usage_limit IS NULL OR used_count<usage_limit)
      AND ((COALESCE(applicable_products,'[]'::jsonb)='[]'::jsonb AND COALESCE(applicable_categories,'[]'::jsonb)='[]'::jsonb)
        OR applicable_products ?| ${productIds}::text[] OR applicable_categories ?| ${categoryIds}::text[]) ORDER BY id`;
  }
  private variantPrices(productIds: string[], tier: number) {
    return this.db.$queryRaw<
      { id: string; productId: string; price: Prisma.Decimal }[]
    >`SELECT id, product_id AS "productId", sprint5_variant_price(id,${tier}::numeric) AS price FROM product_variants WHERE product_id=ANY(${productIds}::uuid[]) AND is_active=true`;
  }
  async byIds(productIds: string[], userId?: string) {
    const rows = await this.db.product.findMany({
      where: { id: { in: productIds }, isActive: true, category: { isActive: true },
        variants: { some: { isActive: true } },
        OR: [{ brandId: null }, { brand: { isActive: true } }] },
      include: productIncludeConfig,
    });
    const tier = await this.tier(userId);
    const [prices, offers] = await Promise.all([
      this.variantPrices(rows.map(row => row.id), tier),
      this.offers(rows.map(row => row.id), rows.map(row => row.categoryId)),
    ]);
    const byId = new Map(rows.map(row => [row.id, this.present(row, prices, offers)]));
    return productIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
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
      serverTime: new Date().toISOString(),
      flashSaleEndDate: offers.filter((offer) => offer.isFlashSale)
        .map((offer) => promotionSlotEnd(new Date(offer.endDate), offer.slotStartHour).toISOString()).sort()[0] ?? null,
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
              'startDate', promo.start_date, 'endDate', promo.end_date, 'slotStartHour', promo.slot_start_hour, 'isFlashSale', promo.is_flash_sale,
              'conditional', (promo.min_order_amount > 0 OR promo.type = 'FREE_SHIPPING')
            ) ORDER BY promo.id), '[]'::jsonb)
            FROM promotions promo
            WHERE promo.is_active = true 
              AND promo.start_date <= now() 
              AND promo.end_date > now() AND glowup_slot_active(promo.slot_start_hour)
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
        serverTime: new Date().toISOString(),
        flashSaleEndDate: (r.promotions || []).filter((offer: any) => offer.isFlashSale)
          .map((offer: any) => promotionSlotEnd(new Date(offer.endDate), offer.slotStartHour).toISOString()).sort()[0] ?? null,
        priceBasis: 'SINGLE_UNIT_WITHOUT_CART_CONDITIONS',
        reservation: false,
        isWishlisted: false,
      };

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
    return result;
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
    return result;
  }
}
