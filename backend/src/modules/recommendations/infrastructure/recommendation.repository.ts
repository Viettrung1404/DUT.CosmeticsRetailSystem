import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BehaviorEventType,
  Prisma,
  RecommendationPlacement,
  RecommendationType,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { ATTRIBUTION_SOURCE_TO_PLACEMENT } from '../domain/attribution-source';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  extractNormalizedIngredientsFromText,
  normalizeIngredientNames,
  stripVietnameseDiacritics,
} from '../domain/ingredient-normalizer.util';

export interface DailyImpressionIncrement {
  placement: RecommendationPlacement;
  count: number;
}

export interface DailyAttributionIncrement {
  placement: RecommendationPlacement;
  conversions: number;
  revenue: number;
}

export interface DailyMetricCounterIncrement {
  placement: RecommendationPlacement;
  impressions: number;
  clicks: number;
  addToCarts: number;
}

export interface AdminDailyMetricAggregateRow {
  placement: RecommendationPlacement;
  impressions: number;
  clicks: number;
  addToCarts: number;
  conversions: number;
  revenue: number;
}

export interface ProductEmbeddingCandidateRecord {
  id: string;
  name: string;
  categoryName: string;
  brandName: string | null;
  ingredients: string[];
  specifications: unknown;
  howToUse: string | null;
}

export interface SaveProductEmbeddingInput {
  productId: string;
  vectorLiteral: string;
}

export interface ActiveProductSimilarityRecord {
  id: string;
  name: string;
  categoryId: string;
  brandId: string | null;
  effectivePrice: number;
  howToUse: string | null;
  specifications: unknown;
  ingredients: string[];
  keyIngredients: string[];
  tags: string[];
  tryOnColorHexes: string[];
}

export interface ProductRecommendationInsertRow {
  sourceProductId: string;
  targetProductId: string;
  score: number;
  reason: string | null;
}

export interface BoughtTogetherPairRow {
  sourceProductId: string;
  targetProductId: string;
  coOrderCount: number;
  liftScore: number;
  confidence: number;
}

export interface ProductRoutineCatalogItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

export interface CustomerAffinityEventItem {
  eventType: BehaviorEventType;
  categoryId: string | null;
  brandId: string | null;
  weight: number;
  effectivePrice: number | null;
  productTags: string[];
  normalizedIngredients: string[];
  createdAt: Date;
}

export interface CustomerAffinityInput {
  customerId: string;
  events: CustomerAffinityEventItem[];
  searchQueries: string[];
  customerTags: string[];
}

export interface UpsertUserAffinityProfileInput {
  customerId: string;
  topCategories: Array<{ categoryId: string; score: number }>;
  topBrands: Array<{ brandId: string; score: number }>;
  preferredTags: string[];
  avoidedTags: string[];
  avgPriceRange: { min: number; max: number; avg: number } | null;
}

export interface TrendingProductRow {
  productId: string;
  score: number;
}

export interface RankedCandidate {
  productId: string;
  score: number;
  reason?: string | null;
}

export interface HydratedRecommendedProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  displayPrice: number;
  imageUrl: string | null;
  brand: { id: string; name: string; slug: string } | null;
  avgRating: number;
  totalSold: number;
  reason?: string | null;
  score?: number;
  placement: RecommendationPlacement;
  tryOnColorHexes?: string[];
}

export interface CartProductFeatureItem {
  id: string;
  name: string;
  categoryName: string;
  normalizedIngredients: string[];
}

export interface RoutineCandidateProductItem {
  id: string;
  name: string;
  categoryName: string;
  normalizedIngredients: string[];
  baseScore: number;
}

export interface CartRecommendationContext {
  cartProductIds: string[];
  cartProducts: CartProductFeatureItem[];
  customerSkinTags: string[];
  avoidedTags: string[];
}

@Injectable()
export class RecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client(): PrismaService {
    return this.prisma;
  }

  async createBehaviorEventsBatch(
    data: Prisma.UserBehaviorEventCreateManyInput[],
  ): Promise<{ count: number }> {
    if (!data.length) {
      return { count: 0 };
    }
    return this.prisma.userBehaviorEvent.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /** Event inserts, batch receipts and metrics commit together, including on retries. */
  async persistTrackedBehaviorBatch(
    data: Prisma.UserBehaviorEventCreateManyInput[],
    batches: Array<{
      batchId?: string;
      anonymousId: string;
      events: Array<{ id: string }>;
      impressions?: DailyImpressionIncrement[];
    }> = [],
  ): Promise<{ count: number }> {
    return this.prisma.$transaction(async (tx) => {
      const counters = new Map<
        RecommendationPlacement,
        {
          impressions: number;
          clicks: number;
          addToCarts: number;
          conversions: number;
          revenue: number;
        }
      >();
      const counterFor = (placement: RecommendationPlacement) => {
        let counter = counters.get(placement);
        if (!counter) {
          counter = {
            impressions: 0,
            clicks: 0,
            addToCarts: 0,
            conversions: 0,
            revenue: 0,
          };
          counters.set(placement, counter);
        }
        return counter;
      };

      for (const batch of batches) {
        if (!batch.impressions?.length) continue;
        if (!batch.batchId && !batch.events.length) {
          throw new BadRequestException(
            'batchId is required for impression-only batches',
          );
        }
        // Legacy event batches can use their stable event IDs as the receipt key.
        const key = createHash('sha256')
          .update(
            JSON.stringify([
              batch.anonymousId,
              batch.batchId ?? batch.events.map((event) => event.id).sort(),
              batch.batchId ? null : batch.impressions,
            ]),
          )
          .digest('hex');
        const claimed = await tx.$queryRaw<Array<{ batch_id: string }>>`
          INSERT INTO recommendation_tracking_batches (batch_id)
          VALUES (${key}) ON CONFLICT DO NOTHING RETURNING batch_id
        `;
        if (claimed.length) {
          for (const impression of batch.impressions) {
            counterFor(impression.placement).impressions += impression.count;
          }
        }
      }

      const inserted = data.length
        ? await tx.userBehaviorEvent.createManyAndReturn({
            data,
            skipDuplicates: true,
            select: { eventType: true, source: true, metadata: true },
          })
        : [];
      for (const event of inserted) {
        const placement = event.source
          ? ATTRIBUTION_SOURCE_TO_PLACEMENT[event.source]
          : undefined;
        if (!placement) continue;
        if (
          event.eventType !== BehaviorEventType.SEARCH_CLICK &&
          event.eventType !== BehaviorEventType.ADD_TO_CART &&
          event.eventType !== BehaviorEventType.PURCHASE
        )
          continue;
        const counter = counterFor(placement);
        if (event.eventType === BehaviorEventType.SEARCH_CLICK)
          counter.clicks++;
        if (event.eventType === BehaviorEventType.ADD_TO_CART)
          counter.addToCarts++;
        if (event.eventType === BehaviorEventType.PURCHASE) {
          counter.conversions++;
          const metadata = event.metadata as { totalPrice?: number } | null;
          counter.revenue += Number(metadata?.totalPrice ?? 0);
        }
      }
      for (const [placement, counter] of counters) {
        await tx.$executeRaw`
          INSERT INTO recommendation_daily_metrics
            (id, metric_date, placement, impressions, clicks, add_to_carts, conversions, revenue, updated_at)
          VALUES (${randomUUID()}::uuid, CURRENT_DATE, ${placement}::"RecommendationPlacement",
            ${counter.impressions}, ${counter.clicks}, ${counter.addToCarts},
            ${counter.conversions}, ${counter.revenue}, NOW())
          ON CONFLICT (metric_date, placement) DO UPDATE SET
            impressions = recommendation_daily_metrics.impressions + EXCLUDED.impressions,
            clicks = recommendation_daily_metrics.clicks + EXCLUDED.clicks,
            add_to_carts = recommendation_daily_metrics.add_to_carts + EXCLUDED.add_to_carts,
            conversions = recommendation_daily_metrics.conversions + EXCLUDED.conversions,
            revenue = recommendation_daily_metrics.revenue + EXCLUDED.revenue,
            updated_at = NOW()
        `;
      }
      return { count: inserted.length };
    });
  }

  async mergeAnonymousEventsToCustomer(
    customerId: string,
    anonymousId: string,
  ): Promise<number> {
    const updated = await this.prisma.$executeRaw`
      UPDATE user_behavior_events
      SET customer_id = ${customerId}::uuid
      WHERE anonymous_id = ${anonymousId}
        AND customer_id IS NULL
        AND created_at >= NOW() - INTERVAL '30 days'
    `;
    return Number(updated ?? 0);
  }

  async findCustomerIdByUserId(userId: string): Promise<string | null> {
    if (!userId) return null;
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      select: { id: true },
    });
    return customer?.id ?? null;
  }

  /**
   * Ánh xạ hàng loạt ID (có thể là customerId trực tiếp hoặc userId từ JWT ở Edge) sang customerId thực trong DB.
   */
  async resolveCustomerIdLookup(
    candidateIds: readonly string[],
  ): Promise<Map<string, string>> {
    const clean = Array.from(new Set(candidateIds.filter(Boolean)));
    if (!clean.length) return new Map();

    const customers = await this.prisma.customer.findMany({
      where: {
        OR: [{ id: { in: clean } }, { userId: { in: clean } }],
      },
      select: { id: true, userId: true },
    });

    const map = new Map<string, string>();
    for (const c of customers) {
      map.set(c.id, c.id);
      if (c.userId) {
        map.set(c.userId, c.id);
      }
    }
    return map;
  }

  async findOrderForBehaviorTracking(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        orderType: true,
        items: {
          select: {
            id: true,
            productVariantId: true,
            quantity: true,
            totalPrice: true,
            attributionSource: true,
            variant: {
              select: {
                productId: true,
                product: {
                  select: {
                    categoryId: true,
                    brandId: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findVariantContext(variantId: string) {
    return this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        productId: true,
        product: {
          select: {
            categoryId: true,
            brandId: true,
          },
        },
      },
    });
  }

  async incrementDailyImpressions(
    impressions: DailyImpressionIncrement[],
  ): Promise<void> {
    if (!impressions.length) return;

    const aggregated = new Map<RecommendationPlacement, number>();
    for (const item of impressions) {
      if (item.count <= 0) continue;
      aggregated.set(
        item.placement,
        (aggregated.get(item.placement) ?? 0) + item.count,
      );
    }

    for (const [placement, count] of aggregated.entries()) {
      await this.prisma.$executeRaw`
        INSERT INTO recommendation_daily_metrics (id, metric_date, placement, impressions, updated_at)
        VALUES (${randomUUID()}::uuid, CURRENT_DATE, ${placement}::"RecommendationPlacement", ${count}, NOW())
        ON CONFLICT (metric_date, placement)
        DO UPDATE SET
          impressions = recommendation_daily_metrics.impressions + EXCLUDED.impressions,
          updated_at = NOW()
      `;
    }
  }

  async incrementDailyAttributionMetrics(
    metrics: DailyAttributionIncrement[],
  ): Promise<void> {
    if (!metrics.length) return;

    const aggregated = new Map<
      RecommendationPlacement,
      { conversions: number; revenue: number }
    >();
    for (const m of metrics) {
      const prev = aggregated.get(m.placement) ?? {
        conversions: 0,
        revenue: 0,
      };
      aggregated.set(m.placement, {
        conversions: prev.conversions + m.conversions,
        revenue: prev.revenue + m.revenue,
      });
    }

    for (const [placement, agg] of aggregated.entries()) {
      await this.prisma.$executeRaw`
        INSERT INTO recommendation_daily_metrics (id, metric_date, placement, conversions, revenue, updated_at)
        VALUES (${randomUUID()}::uuid, CURRENT_DATE, ${placement}::"RecommendationPlacement", ${agg.conversions}, ${agg.revenue}, NOW())
        ON CONFLICT (metric_date, placement)
        DO UPDATE SET
          conversions = recommendation_daily_metrics.conversions + EXCLUDED.conversions,
          revenue = recommendation_daily_metrics.revenue + EXCLUDED.revenue,
          updated_at = NOW()
      `;
    }
  }

  async findActiveProductsForSimilarity(): Promise<
    ActiveProductSimilarityRecord[]
  > {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        categoryId: true,
        brandId: true,
        basePrice: true,
        salePrice: true,
        howToUse: true,
        specifications: true,
        ingredients: {
          select: {
            ingredientName: true,
            isKeyIngredient: true,
          },
        },
        tags: {
          select: {
            tagName: true,
          },
        },
        variants: {
          where: { isActive: true, tryOnColorHex: { not: null } },
          select: {
            tryOnColorHex: true,
          },
        },
      },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      brandId: product.brandId ?? null,
      effectivePrice: Number(product.salePrice ?? product.basePrice),
      howToUse: product.howToUse,
      specifications: product.specifications,
      ingredients: product.ingredients.map((i) => i.ingredientName),
      keyIngredients: product.ingredients
        .filter((i) => i.isKeyIngredient)
        .map((i) => i.ingredientName),
      tags: product.tags.map((t) => t.tagName),
      tryOnColorHexes: product.variants
        .map((v) => v.tryOnColorHex)
        .filter((hex): hex is string => Boolean(hex)),
    }));
  }

  /**
   * Bulk upsert gợi ý sản phẩm bằng UNNEST + dọn bản ghi rớt hạng dựa theo batch_version trong cùng 1 transaction.
   */
  async replaceProductRecommendationsByType(
    type: RecommendationType,
    batchVersion: string,
    rows: ProductRecommendationInsertRow[],
  ): Promise<{ upsertedCount: number; deletedStaleCount: number }> {
    const CHUNK_SIZE = 2000;

    return this.prisma.$transaction(async (tx) => {
      let upsertedCount = 0;

      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const ids = chunk.map(() => randomUUID());
        const sourceIds = chunk.map((r) => r.sourceProductId);
        const targetIds = chunk.map((r) => r.targetProductId);
        const scores = chunk.map((r) => r.score);
        const reasons = chunk.map((r) => r.reason);

        const inserted = await tx.$executeRaw`
          INSERT INTO product_recommendations (
            id,
            source_product_id,
            target_product_id,
            type,
            score,
            reason,
            batch_version,
            updated_at
          )
          SELECT
            u.id::uuid,
            u.source_id::uuid,
            u.target_id::uuid,
            ${type}::"RecommendationType",
            u.score,
            u.reason,
            ${batchVersion},
            NOW()
          FROM UNNEST(
            ${ids}::text[],
            ${sourceIds}::text[],
            ${targetIds}::text[],
            ${scores}::double precision[],
            ${reasons}::text[]
          ) AS u(id, source_id, target_id, score, reason)
          ON CONFLICT (source_product_id, target_product_id, type)
          DO UPDATE SET
            score = EXCLUDED.score,
            reason = EXCLUDED.reason,
            batch_version = EXCLUDED.batch_version,
            updated_at = NOW()
        `;
        upsertedCount += Number(inserted ?? chunk.length);
      }

      const deleted = await tx.$executeRaw`
        DELETE FROM product_recommendations
        WHERE type = ${type}::"RecommendationType"
          AND batch_version <> ${batchVersion}
      `;

      return {
        upsertedCount,
        deletedStaleCount: Number(deleted ?? 0),
      };
    });
  }

  /**
   * Raw SQL self-join trên order_items + orders (Online + POS đã hoàn tất) để tính Co-occurrence & Lift.
   */
  async computeBoughtTogetherPairsFromOrders(
    minSupport = 3,
    topPerProduct = 12,
  ): Promise<BoughtTogetherPairRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        source_product_id: string;
        target_product_id: string;
        co_order_count: number;
        lift_score: number;
        confidence: number;
      }>
    >`
      WITH order_products AS (
        SELECT DISTINCT
          oi.order_id,
          pv.product_id
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        INNER JOIN product_variants pv ON pv.id = oi.product_variant_id
        INNER JOIN products p ON p.id = pv.product_id
        WHERE o.status IN ('COMPLETED', 'DELIVERED')
          AND p.is_active = true
          AND o.created_at >= NOW() - INTERVAL '365 days'
      ),
      total_stats AS (
        SELECT GREATEST(COUNT(DISTINCT order_id), 1)::double precision AS total_orders
        FROM order_products
      ),
      product_counts AS (
        SELECT product_id, COUNT(*)::double precision AS cnt
        FROM order_products
        GROUP BY product_id
      ),
      pair_counts AS (
        SELECT
          a.product_id AS source_product_id,
          b.product_id AS target_product_id,
          COUNT(*)::int AS co_order_count
        FROM order_products a
        INNER JOIN order_products b
          ON a.order_id = b.order_id
         AND a.product_id <> b.product_id
        GROUP BY a.product_id, b.product_id
        HAVING COUNT(*) >= ${minSupport}
      ),
      scored_pairs AS (
        SELECT
          pc.source_product_id::text AS source_product_id,
          pc.target_product_id::text AS target_product_id,
          pc.co_order_count,
          ROUND(
            ((pc.co_order_count * ts.total_orders) / NULLIF(pa.cnt * pb.cnt, 0))::numeric,
            4
          )::double precision AS lift_score,
          ROUND((pc.co_order_count / NULLIF(pa.cnt, 0))::numeric, 4)::double precision AS confidence,
          ROW_NUMBER() OVER (
            PARTITION BY pc.source_product_id
            ORDER BY
              ((pc.co_order_count * ts.total_orders) / NULLIF(pa.cnt * pb.cnt, 0)) DESC,
              pc.co_order_count DESC
          ) AS rn
        FROM pair_counts pc
        CROSS JOIN total_stats ts
        INNER JOIN product_counts pa ON pa.product_id = pc.source_product_id
        INNER JOIN product_counts pb ON pb.product_id = pc.target_product_id
      )
      SELECT
        source_product_id,
        target_product_id,
        co_order_count,
        lift_score,
        confidence
      FROM scored_pairs
      WHERE rn <= ${topPerProduct}
    `;

    return rows.map((row) => ({
      sourceProductId: row.source_product_id,
      targetProductId: row.target_product_id,
      coOrderCount: Number(row.co_order_count),
      liftScore: Number(row.lift_score ?? 0),
      confidence: Number(row.confidence ?? 0),
    }));
  }

  async findActiveProductRoutineCatalog(): Promise<
    ProductRoutineCatalogItem[]
  > {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        categoryId: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { totalSold: 'desc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? '',
    }));
  }

  /**
   * Chỉ lấy danh sách customerId có hoạt động (behavior, search, customer_tags) trong N giờ qua để chạy incremental.
   */
  async findCustomerIdsWithRecentActivity(hours = 24): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ customer_id: string }>>`
      SELECT DISTINCT customer_id::text AS customer_id
      FROM (
        SELECT ube.customer_id
        FROM user_behavior_events ube
        WHERE ube.customer_id IS NOT NULL
          AND ube.created_at >= NOW() - MAKE_INTERVAL(hours => ${hours}::int)
        UNION
        SELECT c.id AS customer_id
        FROM search_histories sh
        INNER JOIN customers c ON c.user_id = sh.user_id
        WHERE sh.user_id IS NOT NULL
          AND sh.created_at >= NOW() - MAKE_INTERVAL(hours => ${hours}::int)
        UNION
        SELECT ct.customer_id
        FROM customer_tags ct
        WHERE ct.created_at >= NOW() - MAKE_INTERVAL(hours => ${hours}::int)
      ) recent_customers
    `;

    return rows.map((r) => r.customer_id);
  }

  async findCustomerAffinityInputs(
    customerIds: string[],
  ): Promise<CustomerAffinityInput[]> {
    if (!customerIds.length) {
      return [];
    }

    const since90d = new Date(Date.now() - 90 * 86_400_000);
    const since30d = new Date(Date.now() - 30 * 86_400_000);

    const [events, customersWithTags] = await Promise.all([
      this.prisma.userBehaviorEvent.findMany({
        where: {
          customerId: { in: customerIds },
          createdAt: { gte: since90d },
        },
        select: {
          customerId: true,
          eventType: true,
          productId: true,
          categoryId: true,
          brandId: true,
          weight: true,
          createdAt: true,
        },
      }),
      this.prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: {
          id: true,
          userId: true,
          tags: {
            select: { tag: true },
          },
        },
      }),
    ]);

    const userIdToCustomerId = new Map<string, string>();
    const tagsByCustomer = new Map<string, string[]>();
    for (const c of customersWithTags) {
      if (c.userId) {
        userIdToCustomerId.set(c.userId, c.id);
      }
      tagsByCustomer.set(
        c.id,
        c.tags.map((t) => t.tag),
      );
    }

    const userIds = Array.from(userIdToCustomerId.keys());
    const productIds = Array.from(
      new Set(
        events
          .map((e) => e.productId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const [searchHistories, products] = await Promise.all([
      userIds.length
        ? this.prisma.searchHistory.findMany({
            where: {
              userId: { in: userIds },
              createdAt: { gte: since30d },
            },
            select: {
              userId: true,
              query: true,
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(userIds.length * 30, 5000),
          })
        : Promise.resolve([]),
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
              id: true,
              basePrice: true,
              salePrice: true,
              howToUse: true,
              tags: { select: { tagName: true } },
              ingredients: { select: { ingredientName: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const productContextMap = new Map<
      string,
      { effectivePrice: number; tags: string[]; ingredients: string[] }
    >();
    for (const p of products) {
      const ingredients = Array.from(
        new Set([
          ...normalizeIngredientNames(
            p.ingredients.map((i) => i.ingredientName),
          ),
          ...extractNormalizedIngredientsFromText(p.howToUse),
        ]),
      );
      productContextMap.set(p.id, {
        effectivePrice: Number(p.salePrice ?? p.basePrice),
        tags: p.tags.map((t) => stripVietnameseDiacritics(t.tagName)),
        ingredients,
      });
    }

    const eventsByCustomer = new Map<string, CustomerAffinityEventItem[]>();
    for (const ev of events) {
      if (!ev.customerId) continue;
      const prodCtx = ev.productId
        ? productContextMap.get(ev.productId)
        : undefined;
      const list = eventsByCustomer.get(ev.customerId) ?? [];
      list.push({
        eventType: ev.eventType,
        categoryId: ev.categoryId,
        brandId: ev.brandId,
        weight: ev.weight,
        effectivePrice: prodCtx?.effectivePrice ?? null,
        productTags: prodCtx?.tags ?? [],
        normalizedIngredients: prodCtx?.ingredients ?? [],
        createdAt: ev.createdAt,
      });
      eventsByCustomer.set(ev.customerId, list);
    }

    const queriesByCustomer = new Map<string, string[]>();
    for (const sh of searchHistories) {
      if (!sh.userId) continue;
      const cId = userIdToCustomerId.get(sh.userId);
      if (!cId) continue;
      const list = queriesByCustomer.get(cId) ?? [];
      list.push(sh.query);
      queriesByCustomer.set(cId, list);
    }

    return customerIds.map((customerId) => ({
      customerId,
      events: eventsByCustomer.get(customerId) ?? [],
      searchQueries: queriesByCustomer.get(customerId) ?? [],
      customerTags: tagsByCustomer.get(customerId) ?? [],
    }));
  }

  async upsertUserAffinityProfiles(
    profiles: UpsertUserAffinityProfileInput[],
  ): Promise<number> {
    if (!profiles.length) return 0;

    const CHUNK_SIZE = 500;
    let total = 0;

    for (let i = 0; i < profiles.length; i += CHUNK_SIZE) {
      const chunk = profiles.slice(i, i + CHUNK_SIZE);
      const customerIds = chunk.map((p) => p.customerId);
      const topCategories = chunk.map((p) => JSON.stringify(p.topCategories));
      const topBrands = chunk.map((p) => JSON.stringify(p.topBrands));
      const preferredTags = chunk.map((p) => JSON.stringify(p.preferredTags));
      const avoidedTags = chunk.map((p) => JSON.stringify(p.avoidedTags));
      const avgPriceRanges = chunk.map((p) =>
        p.avgPriceRange ? JSON.stringify(p.avgPriceRange) : null,
      );

      const affected = await this.prisma.$executeRaw`
        INSERT INTO user_affinity_profiles (
          customer_id,
          top_categories,
          top_brands,
          preferred_tags,
          avoided_tags,
          avg_price_range,
          updated_at
        )
        SELECT
          u.customer_id::uuid,
          u.top_categories::jsonb,
          u.top_brands::jsonb,
          u.preferred_tags::jsonb,
          u.avoided_tags::jsonb,
          u.avg_price_range::jsonb,
          NOW()
        FROM UNNEST(
          ${customerIds}::text[],
          ${topCategories}::text[],
          ${topBrands}::text[],
          ${preferredTags}::text[],
          ${avoidedTags}::text[],
          ${avgPriceRanges}::text[]
        ) AS u(
          customer_id,
          top_categories,
          top_brands,
          preferred_tags,
          avoided_tags,
          avg_price_range
        )
        ON CONFLICT (customer_id)
        DO UPDATE SET
          top_categories = EXCLUDED.top_categories,
          top_brands = EXCLUDED.top_brands,
          preferred_tags = EXCLUDED.preferred_tags,
          avoided_tags = EXCLUDED.avoided_tags,
          avg_price_range = EXCLUDED.avg_price_range,
          updated_at = NOW()
      `;
      total += Number(affected ?? chunk.length);
    }

    return total;
  }

  /**
   * 1 query SQL duy nhất tổng hợp điểm Time Decay 7 ngày gần nhất cho Top 50 SP Trending.
   */
  async queryTrendingProductsLast7Days(
    limit = 50,
  ): Promise<TrendingProductRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ product_id: string; score: number }>
    >`
      SELECT
        ube.product_id::text AS product_id,
        ROUND(
          SUM(
            ube.weight * EXP(
              -0.05 * GREATEST(0, EXTRACT(EPOCH FROM (NOW() - ube.created_at)) / 86400.0)
            )
          )::numeric,
          4
        )::double precision AS score
      FROM user_behavior_events ube
      INNER JOIN products p ON p.id = ube.product_id
      WHERE ube.product_id IS NOT NULL
        AND p.is_active = true
        AND ube.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY ube.product_id
      ORDER BY score DESC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      productId: row.product_id,
      score: Number(row.score ?? 0),
    }));
  }

  /**
   * Xóa theo batch nhỏ các user_behavior_events quá hạn (mặc định > 90 ngày) để tránh lock bảng dài trên Neon.
   */
  async deleteBehaviorEventsOlderThanDaysBatched(
    retentionDays = 90,
    batchSize = 5000,
  ): Promise<number> {
    let totalDeleted = 0;

    while (true) {
      const deleted = await this.prisma.$executeRaw`
        WITH doomed AS (
          SELECT id
          FROM user_behavior_events
          WHERE created_at < NOW() - MAKE_INTERVAL(days => ${retentionDays}::int)
          LIMIT ${batchSize}::int
        )
        DELETE FROM user_behavior_events
        WHERE id IN (SELECT id FROM doomed)
      `;
      const count = Number(deleted ?? 0);
      totalDeleted += count;

      if (count < batchSize) {
        break;
      }
    }

    await this.prisma.$executeRaw`
      DELETE FROM recommendation_tracking_batches
      WHERE created_at < NOW() - MAKE_INTERVAL(days => ${retentionDays}::int)
    `;
    return totalDeleted;
  }

  /**
   * Bộ lọc Hậu xử lý dùng chung (tối đa 1 query IN / ANY):
   * - Product cha đang ACTIVE
   * - Có ít nhất 1 Variant đang mở bán có inventory.available_quantity > 0 và inventory_lots đạt min_shelf_life_days
   * - Hydrate đầy đủ card sản phẩm chuẩn hóa, giữ đúng thứ tự ứng viên đầu vào.
   */
  async filterAndHydrateEligibleProducts(
    candidates: readonly RankedCandidate[],
    placement: RecommendationPlacement,
  ): Promise<HydratedRecommendedProduct[]> {
    if (!candidates.length) {
      return [];
    }

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const candidateById = new Map<string, RankedCandidate>();
    for (const c of candidates) {
      if (!UUID_RE.test(c.productId)) continue;
      if (!candidateById.has(c.productId)) {
        candidateById.set(c.productId, c);
      }
    }

    const uniqueIds = Array.from(candidateById.keys());
    if (!uniqueIds.length) {
      return [];
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        base_price: number;
        sale_price: number | null;
        avg_rating: number;
        total_sold: number;
        brand_id: string | null;
        brand_name: string | null;
        brand_slug: string | null;
        image_url: string | null;
        try_on_color_hexes: string[] | null;
      }>
    >`
      SELECT
        p.id::text AS id,
        p.name,
        p.slug,
        p.base_price::double precision AS base_price,
        (SELECT MIN(sprint5_variant_price(priced_variant.id,0))::double precision
          FROM product_variants priced_variant
          WHERE priced_variant.product_id=p.id AND priced_variant.is_active=true) AS sale_price,
        p.avg_rating::double precision AS avg_rating,
        p.total_sold,
        b.id::text AS brand_id,
        b.name AS brand_name,
        b.slug AS brand_slug,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC
          LIMIT 1
        ) AS image_url,
        ARRAY(
          SELECT DISTINCT pv_hex.try_on_color_hex
          FROM product_variants pv_hex
          WHERE pv_hex.product_id = p.id
            AND pv_hex.is_active = true
            AND pv_hex.try_on_color_hex IS NOT NULL
        ) AS try_on_color_hexes
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE p.id = ANY(${uniqueIds}::uuid[])
        AND ${this.eligibleProductCondition()}
    `;

    const hydratedById = new Map<string, HydratedRecommendedProduct>();
    for (const row of rows) {
      const meta = candidateById.get(row.id);
      const basePrice = Number(row.base_price ?? 0);
      const salePrice =
        row.sale_price !== null && row.sale_price !== undefined
          ? Number(row.sale_price)
          : null;

      hydratedById.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
        basePrice,
        salePrice,
        displayPrice: salePrice ?? basePrice,
        imageUrl: row.image_url ?? null,
        brand:
          row.brand_id && row.brand_name && row.brand_slug
            ? {
                id: row.brand_id,
                name: row.brand_name,
                slug: row.brand_slug,
              }
            : null,
        avgRating: Number(row.avg_rating ?? 0),
        totalSold: Number(row.total_sold ?? 0),
        reason: meta?.reason ?? null,
        score: meta?.score,
        placement,
        tryOnColorHexes: row.try_on_color_hexes ?? [],
      });
    }

    const ordered: HydratedRecommendedProduct[] = [];
    for (const id of uniqueIds) {
      const item = hydratedById.get(id);
      if (item) {
        ordered.push(item);
      }
    }
    return ordered;
  }

  async findPrecomputedRecommendations(
    sourceProductId: string,
    type: RecommendationType,
    limit = 24,
  ): Promise<RankedCandidate[]> {
    const rows = await this.prisma.productRecommendation.findMany({
      where: { sourceProductId, type },
      orderBy: { score: 'desc' },
      take: limit,
      select: {
        targetProductId: true,
        score: true,
        reason: true,
      },
    });

    return rows.map((row) => ({
      productId: row.targetProductId,
      score: Number(row.score),
      reason: row.reason,
    }));
  }

  private eligibleProductCondition(): Prisma.Sql {
    return Prisma.sql`p.is_active = true
        AND EXISTS (
          SELECT 1
          FROM product_variants pv
          INNER JOIN inventory inv ON inv.product_variant_id = pv.id
          WHERE pv.product_id = p.id
            AND pv.is_active = true
            AND COALESCE(inv.available_quantity, 0) > 0
            AND (
              NOT EXISTS (
                SELECT 1
                FROM inventory_lots l0
                WHERE l0.product_variant_id = pv.id
                  AND l0.location_id = inv.store_id
              )
              OR EXISTS (
                SELECT 1
                FROM inventory_lots lot
                WHERE lot.product_variant_id = pv.id
                  AND lot.location_id = inv.store_id
                  AND (lot.quantity_on_hand - lot.quantity_reserved) > 0
                  AND lot.expiry_date >= (CURRENT_DATE + (pv.min_shelf_life_days * INTERVAL '1 day'))
              )
            )
        )`;
  }

  async filterCandidatesByAvoidedTags(
    candidates: readonly RankedCandidate[],
    avoidedTags: readonly string[],
  ): Promise<RankedCandidate[]> {
    if (!candidates.length || !avoidedTags.length) return [...candidates];
    const products = await this.prisma.product.findMany({
      where: { id: { in: candidates.map((c) => c.productId) } },
      select: {
        id: true,
        howToUse: true,
        specifications: true,
        ingredients: { select: { ingredientName: true } },
        tags: { select: { tagName: true } },
      },
    });
    const avoided = new Set(avoidedTags.map(stripVietnameseDiacritics));
    const allowed = new Set(
      products
        .filter((product) => {
          const keys = [
            ...normalizeIngredientNames(
              product.ingredients.map((i) => i.ingredientName),
            ),
            ...extractNormalizedIngredientsFromText(product.howToUse),
            ...extractNormalizedIngredientsFromText(
              JSON.stringify(product.specifications),
            ),
            ...product.tags.map((tag) =>
              stripVietnameseDiacritics(tag.tagName),
            ),
          ];
          return !keys.some((key) => avoided.has(key));
        })
        .map((product) => product.id),
    );
    return candidates.filter((candidate) => allowed.has(candidate.productId));
  }

  async findSameCategoryPriceRangeFallbacks(
    sourceProductId: string,
    limit = 16,
  ): Promise<RankedCandidate[]> {
    const source = await this.prisma.product.findUnique({
      where: { id: sourceProductId },
      select: {
        categoryId: true,
        basePrice: true,
        salePrice: true,
      },
    });
    if (!source) {
      return [];
    }

    const price = Number(source.salePrice ?? source.basePrice);
    const minPrice = price * 0.7;
    const maxPrice = price * 1.3;

    const fallbacks = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id::text AS id FROM products p
      WHERE p.id <> ${sourceProductId}::uuid
        AND p.category_id = ${source.categoryId}::uuid
        AND COALESCE(p.sale_price, p.base_price) BETWEEN ${minPrice} AND ${maxPrice}
        AND ${this.eligibleProductCondition()}
      ORDER BY p.total_sold DESC, p.avg_rating DESC, p.id
      LIMIT ${limit}
    `;

    return fallbacks.map((p, index) => ({
      productId: p.id,
      score: Number((0.6 - index * 0.01).toFixed(4)),
      reason: 'Cùng danh mục & tầm giá tương đồng',
    }));
  }

  async findBestSellerProductCandidates(
    limit = 20,
    excludeIds: readonly string[] = [],
  ): Promise<RankedCandidate[]> {
    const products = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id::text AS id FROM products p
      WHERE ${this.eligibleProductCondition()}
        AND NOT (p.id = ANY(${[...excludeIds]}::uuid[]))
      ORDER BY p.total_sold DESC, p.avg_rating DESC, p.id
      LIMIT ${limit}
    `;

    return products.map((p, index) => ({
      productId: p.id,
      score: Number((0.5 - index * 0.01).toFixed(4)),
      reason: 'Sản phẩm bán chạy được yêu thích',
    }));
  }

  async findEligibleHomeCandidates(
    candidates: readonly RankedCandidate[],
  ): Promise<RankedCandidate[]> {
    if (!candidates.length) return [];
    const ids = candidates.map(({ productId }) => productId);
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id::text AS id FROM products p
      WHERE p.id = ANY(${ids}::uuid[])
        AND ${this.eligibleProductCondition()}
    `;
    const eligibleIds = new Set(rows.map(({ id }) => id));
    return candidates.filter(({ productId }) => eligibleIds.has(productId));
  }

  async findUserAffinityProfile(
    customerId: string,
  ): Promise<UpsertUserAffinityProfileInput | null> {
    const profile = await this.prisma.userAffinityProfile.findUnique({
      where: { customerId },
    });
    if (!profile) {
      return null;
    }

    return {
      customerId: profile.customerId,
      topCategories: Array.isArray(profile.topCategories)
        ? (profile.topCategories as Array<{
            categoryId: string;
            score: number;
          }>)
        : [],
      topBrands: Array.isArray(profile.topBrands)
        ? (profile.topBrands as Array<{ brandId: string; score: number }>)
        : [],
      preferredTags: Array.isArray(profile.preferredTags)
        ? (profile.preferredTags as string[])
        : [],
      avoidedTags: Array.isArray(profile.avoidedTags)
        ? (profile.avoidedTags as string[])
        : [],
      avgPriceRange:
        profile.avgPriceRange && typeof profile.avgPriceRange === 'object'
          ? (profile.avgPriceRange as { min: number; max: number; avg: number })
          : null,
    };
  }

  async findHomeIntent(
    customerId: string | null,
    guestCartSession: string | undefined,
    since: Date,
  ) {
    const identity = customerId
      ? { customerId }
      : { customerId: null, sessionId: guestCartSession };
    const [cartItems, events] = await Promise.all([
      customerId || guestCartSession
        ? this.prisma.cartItem.findMany({
            where: { cart: identity, quantity: { gt: 0 }, variant: { isActive: true } },
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            take: 100,
            select: {
              createdAt: true,
              productVariantId: true,
              variant: { select: { productId: true } },
            },
          })
        : [],
      customerId || guestCartSession
        ? this.prisma.userBehaviorEvent.findMany({
            where: {
              ...(customerId
                ? { customerId }
                : { customerId: null, anonymousId: guestCartSession }),
              eventType: {
                in: customerId
                  ? [BehaviorEventType.ADD_TO_CART, BehaviorEventType.VIEW_PRODUCT, BehaviorEventType.SEARCH_CLICK]
                  : [BehaviorEventType.ADD_TO_CART],
              },
              productId: { not: null },
              createdAt: { gte: since },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            take: 200,
            select: { productId: true, variantId: true, eventType: true, createdAt: true, metadata: true },
          })
        : [],
    ]);
    return { cartItems, events };
  }

  /**
   * Trả về danh sách productId khách đã mua trong withinDays ngày gần nhất (mặc định 14 ngày).
   */
  async findRecentlyPurchasedProductIds(
    customerId: string,
    withinDays = 14,
  ): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ product_id: string }>>`
      SELECT DISTINCT pv.product_id::text AS product_id
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN product_variants pv ON pv.id = oi.product_variant_id
      WHERE o.customer_id = ${customerId}::uuid
        AND o.status <> 'CANCELLED'
        AND o.created_at >= NOW() - MAKE_INTERVAL(days => ${withinDays}::int)
    `;

    return rows.map((r) => r.product_id);
  }

  async findAffinityMatchedCandidates(
    profile: UpsertUserAffinityProfileInput,
    limit = 24,
  ): Promise<RankedCandidate[]> {
    const topCategoryIds = profile.topCategories
      .slice(0, 5)
      .map((c) => c.categoryId);
    const topBrandIds = profile.topBrands.slice(0, 5).map((b) => b.brandId);

    if (!topCategoryIds.length && !topBrandIds.length) {
      return [];
    }

    const candidates = await this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          ...(topCategoryIds.length
            ? [{ categoryId: { in: topCategoryIds } }]
            : []),
          ...(topBrandIds.length ? [{ brandId: { in: topBrandIds } }] : []),
        ],
      },
      orderBy: [{ totalSold: 'desc' }, { avgRating: 'desc' }],
      take: limit * 2,
      select: {
        id: true,
        categoryId: true,
        brandId: true,
        howToUse: true,
        ingredients: { select: { ingredientName: true } },
        tags: { select: { tagName: true } },
      },
    });

    const catScoreMap = new Map(
      profile.topCategories.map((c) => [c.categoryId, c.score]),
    );
    const brandScoreMap = new Map(
      profile.topBrands.map((b) => [b.brandId, b.score]),
    );
    const preferredSet = new Set(profile.preferredTags);
    const avoidedSet = new Set(profile.avoidedTags);

    const scored: RankedCandidate[] = [];
    for (const p of candidates) {
      const ingKeys = new Set([
        ...normalizeIngredientNames(p.ingredients.map((i) => i.ingredientName)),
        ...extractNormalizedIngredientsFromText(p.howToUse),
      ]);
      const tagKeys = p.tags.map((t) => stripVietnameseDiacritics(t.tagName));

      const hasAvoided =
        Array.from(ingKeys).some((k) => avoidedSet.has(k)) ||
        tagKeys.some((t) => avoidedSet.has(t));
      if (hasAvoided) {
        continue;
      }

      const catScore = catScoreMap.get(p.categoryId) ?? 0;
      const brandScore = p.brandId ? (brandScoreMap.get(p.brandId) ?? 0) : 0;
      const tagMatches =
        Array.from(ingKeys).filter((k) => preferredSet.has(k)).length +
        tagKeys.filter((t) => preferredSet.has(t)).length;

      const rawScore =
        Math.min(1, catScore / 15) * 0.5 +
        Math.min(1, brandScore / 15) * 0.3 +
        Math.min(1, tagMatches / 3) * 0.2;

      scored.push({
        productId: p.id,
        score: Number(Math.max(0.2, rawScore).toFixed(4)),
        reason: 'Phù hợp với thói quen & mối quan tâm của bạn',
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  async findProductRoutineSubject(
    productId: string,
  ): Promise<ProductRoutineCatalogItem | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        categoryId: true,
        category: { select: { name: true } },
      },
    });
    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? '',
    };
  }

  async findCartContextForCustomerOrIds(
    customerId: string | null,
    explicitProductIds: readonly string[],
  ): Promise<CartRecommendationContext> {
    const cartIdSet = new Set<string>(explicitProductIds);
    let customerSkinTags: string[] = [];
    let avoidedTags: string[] = [];

    if (customerId) {
      const [cart, tags, affinity] = await Promise.all([
        this.prisma.cart.findUnique({
          where: { customerId },
          select: {
            items: {
              select: {
                variant: {
                  select: { productId: true },
                },
              },
            },
          },
        }),
        this.prisma.customerTag.findMany({
          where: { customerId },
          select: { tag: true },
        }),
        this.prisma.userAffinityProfile.findUnique({
          where: { customerId },
          select: { avoidedTags: true },
        }),
      ]);

      for (const item of cart?.items ?? []) {
        if (item.variant?.productId) {
          cartIdSet.add(item.variant.productId);
        }
      }
      customerSkinTags = tags.map((t) => t.tag);
      if (Array.isArray(affinity?.avoidedTags)) {
        avoidedTags = affinity.avoidedTags as string[];
      }
    }

    const cartProductIds = Array.from(cartIdSet);
    const cartProductsRaw = cartProductIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: cartProductIds } },
          select: {
            id: true,
            name: true,
            howToUse: true,
            category: { select: { name: true } },
            ingredients: { select: { ingredientName: true } },
          },
        })
      : [];

    const cartProducts: CartProductFeatureItem[] = cartProductsRaw.map((p) => ({
      id: p.id,
      name: p.name,
      categoryName: p.category?.name ?? '',
      normalizedIngredients: Array.from(
        new Set([
          ...normalizeIngredientNames(
            p.ingredients.map((i) => i.ingredientName),
          ),
          ...extractNormalizedIngredientsFromText(p.howToUse),
        ]),
      ),
    }));

    return {
      cartProductIds,
      cartProducts,
      customerSkinTags,
      avoidedTags,
    };
  }

  async findRoutineCandidateProducts(
    excludeIds: readonly string[],
    limit = 60,
  ): Promise<RoutineCandidateProductItem[]> {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(excludeIds.length ? { id: { notIn: [...excludeIds] } } : {}),
      },
      orderBy: [{ totalSold: 'desc' }, { avgRating: 'desc' }],
      take: limit,
      select: {
        id: true,
        name: true,
        howToUse: true,
        totalSold: true,
        category: { select: { name: true } },
        ingredients: { select: { ingredientName: true } },
      },
    });

    return products.map((p, index) => ({
      id: p.id,
      name: p.name,
      categoryName: p.category?.name ?? '',
      normalizedIngredients: Array.from(
        new Set([
          ...normalizeIngredientNames(
            p.ingredients.map((i) => i.ingredientName),
          ),
          ...extractNormalizedIngredientsFromText(p.howToUse),
        ]),
      ),
      baseScore: Number(Math.max(0.3, 0.85 - index * 0.008).toFixed(4)),
    }));
  }

  /**
   * Flush bộ đếm RAM (impressions, clicks, add_to_carts) xuống recommendation_daily_metrics bằng 1 lệnh SQL UNNEST.
   */
  async flushDailyMetricsCounters(
    increments: readonly DailyMetricCounterIncrement[],
  ): Promise<number> {
    if (!increments.length) return 0;

    const ids = increments.map(() => randomUUID());
    const placements = increments.map((i) => i.placement);
    const impressions = increments.map((i) => i.impressions);
    const clicks = increments.map((i) => i.clicks);
    const addToCarts = increments.map((i) => i.addToCarts);

    const affected = await this.prisma.$executeRaw`
      INSERT INTO recommendation_daily_metrics (
        id,
        metric_date,
        placement,
        impressions,
        clicks,
        add_to_carts,
        updated_at
      )
      SELECT
        u.id::uuid,
        CURRENT_DATE,
        u.placement::"RecommendationPlacement",
        u.impressions,
        u.clicks,
        u.add_to_carts,
        NOW()
      FROM UNNEST(
        ${ids}::text[],
        ${placements}::text[],
        ${impressions}::int[],
        ${clicks}::int[],
        ${addToCarts}::int[]
      ) AS u(id, placement, impressions, clicks, add_to_carts)
      ON CONFLICT (metric_date, placement)
      DO UPDATE SET
        impressions = recommendation_daily_metrics.impressions + EXCLUDED.impressions,
        clicks = recommendation_daily_metrics.clicks + EXCLUDED.clicks,
        add_to_carts = recommendation_daily_metrics.add_to_carts + EXCLUDED.add_to_carts,
        updated_at = NOW()
    `;

    return Number(affected ?? increments.length);
  }

  async queryAdminDailyMetrics(
    fromDate: string,
    toDate: string,
  ): Promise<AdminDailyMetricAggregateRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        placement: RecommendationPlacement;
        impressions: number;
        clicks: number;
        add_to_carts: number;
        conversions: number;
        revenue: number;
      }>
    >`
      SELECT
        placement,
        COALESCE(SUM(impressions), 0)::int AS impressions,
        COALESCE(SUM(clicks), 0)::int AS clicks,
        COALESCE(SUM(add_to_carts), 0)::int AS add_to_carts,
        COALESCE(SUM(conversions), 0)::int AS conversions,
        COALESCE(SUM(revenue), 0)::double precision AS revenue
      FROM recommendation_daily_metrics
      WHERE metric_date >= ${fromDate}::date
        AND metric_date <= ${toDate}::date
      GROUP BY placement
    `;

    return rows.map((row) => ({
      placement: row.placement,
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      addToCarts: Number(row.add_to_carts ?? 0),
      conversions: Number(row.conversions ?? 0),
      revenue: Number(row.revenue ?? 0),
    }));
  }

  /**
   * Chỉ lấy các sản phẩm active chưa có embedding, vừa cập nhật sau embedding_updated_at, hoặc đổi embedding_model.
   */
  async findProductsNeedingEmbedding(
    model: string,
    batchSize = 20,
  ): Promise<ProductEmbeddingCandidateRecord[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        category_name: string | null;
        brand_name: string | null;
        specifications: unknown;
        how_to_use: string | null;
        ingredients: string[] | null;
      }>
    >`
      SELECT
        p.id::text AS id,
        p.name,
        c.name AS category_name,
        b.name AS brand_name,
        p.specifications,
        p.how_to_use,
        COALESCE(
          ARRAY(
            SELECT pi.ingredient_name
            FROM product_ingredients pi
            WHERE pi.product_id = p.id
            ORDER BY pi.is_key_ingredient DESC, pi.created_at ASC
          ),
          ARRAY[]::text[]
        ) AS ingredients
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = true
        AND (
          p.embedding IS NULL
          OR p.embedding_updated_at IS NULL
          OR p.updated_at > p.embedding_updated_at
          OR p.embedding_model IS DISTINCT FROM ${model}
        )
      ORDER BY (p.embedding IS NULL) DESC, p.updated_at DESC
      LIMIT ${batchSize}
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      categoryName: row.category_name ?? 'Chăm sóc sắc đẹp',
      brandName: row.brand_name ?? null,
      ingredients: row.ingredients ?? [],
      specifications: row.specifications,
      howToUse: row.how_to_use,
    }));
  }

  async saveProductEmbeddings(
    model: string,
    items: readonly SaveProductEmbeddingInput[],
  ): Promise<number> {
    if (!items.length) return 0;

    const productIds = items.map((i) => i.productId);
    const vectorLiterals = items.map((i) => i.vectorLiteral);

    const updated = await this.prisma.$executeRaw`
      UPDATE products AS p
      SET
        embedding = u.vec::halfvec(1024),
        embedding_model = ${model},
        embedding_updated_at = NOW()
      FROM UNNEST(
        ${productIds}::text[],
        ${vectorLiterals}::text[]
      ) AS u(product_id, vec)
      WHERE p.id = u.product_id::uuid
    `;

    return Number(updated ?? items.length);
  }

  /**
   * Truy vấn Top K cặp tương đồng Cosine (halfvec_cosine_ops) từ pgvector cho các SP đã có embedding.
   */
  async queryVectorSimilarityPairs(
    topK = 24,
  ): Promise<Map<string, Map<string, number>>> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        source_product_id: string;
        target_product_id: string;
        similarity: number;
      }>
    >`
      SELECT
        a.id::text AS source_product_id,
        nn.target_product_id,
        nn.similarity
      FROM products a
      CROSS JOIN LATERAL (
        SELECT
          b.id::text AS target_product_id,
          GREATEST(0, LEAST(1, 1 - (a.embedding <=> b.embedding)))::double precision AS similarity
        FROM products b
        WHERE b.is_active = true
          AND b.id <> a.id
          AND b.embedding IS NOT NULL
        ORDER BY a.embedding <=> b.embedding ASC
        LIMIT ${topK}
      ) nn
      WHERE a.is_active = true
        AND a.embedding IS NOT NULL
    `;

    const result = new Map<string, Map<string, number>>();
    for (const row of rows) {
      let inner = result.get(row.source_product_id);
      if (!inner) {
        inner = new Map<string, number>();
        result.set(row.source_product_id, inner);
      }
      inner.set(row.target_product_id, Number(row.similarity ?? 0));
    }
    return result;
  }

  async querySemanticSearchCandidates(
    vectorLiteral: string,
    limit = 24,
  ): Promise<RankedCandidate[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ product_id: string; similarity: number }>
    >`
      SELECT
        p.id::text AS product_id,
        GREATEST(0, LEAST(1, 1 - (p.embedding <=> ${vectorLiteral}::halfvec(1024))))::double precision AS similarity
      FROM products p
      WHERE p.is_active = true
        AND p.embedding IS NOT NULL
      ORDER BY p.embedding <=> ${vectorLiteral}::halfvec(1024) ASC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      productId: row.product_id,
      score: Number((row.similarity ?? 0).toFixed(4)),
      reason: 'Phù hợp ngữ nghĩa với nhu cầu tìm kiếm',
    }));
  }

  async queryKeywordFallbackSearchCandidates(
    query: string,
    limit = 24,
  ): Promise<RankedCandidate[]> {
    const tokens = query
      .trim()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)
      .slice(0, 6);

    const activeKeys = extractNormalizedIngredientsFromText(query);
    if (!tokens.length && !activeKeys.length) {
      return [];
    }

    const searchClauses = [
      ...tokens.flatMap((token) => [
        { name: { contains: token, mode: 'insensitive' as const } },
        { description: { contains: token, mode: 'insensitive' as const } },
        { howToUse: { contains: token, mode: 'insensitive' as const } },
        {
          ingredients: {
            some: {
              ingredientName: { contains: token, mode: 'insensitive' as const },
            },
          },
        },
        {
          tags: {
            some: {
              tagName: { contains: token, mode: 'insensitive' as const },
            },
          },
        },
      ]),
      ...activeKeys.map((key) => ({
        ingredients: {
          some: {
            ingredientName: {
              contains: key.replace(/_/g, ' '),
              mode: 'insensitive' as const,
            },
          },
        },
      })),
    ];

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: searchClauses,
      },
      orderBy: [{ totalSold: 'desc' }, { avgRating: 'desc' }],
      take: limit,
      select: { id: true },
    });

    return products.map((p, index) => ({
      productId: p.id,
      score: Number(Math.max(0.25, 0.7 - index * 0.02).toFixed(4)),
      reason: 'Khớp từ khóa & thành phần sản phẩm',
    }));
  }
}
