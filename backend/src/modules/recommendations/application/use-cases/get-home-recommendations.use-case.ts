import { Injectable, Logger } from '@nestjs/common';
import { RecommendationPlacement } from '@prisma/client';
import {
  HydratedRecommendedProduct,
  RankedCandidate,
  RecommendationRepository,
} from '../../infrastructure/recommendation.repository';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import { InSessionPersonalizerService } from '../services/in-session-personalizer.service';
import {
  TRENDING_7D_CACHE_KEY,
  TrendingCachePayload,
} from './refresh-trending-cache.use-case';

export interface GetHomeRecommendationsInput {
  customerId: string | null;
  recentIds: string[];
  limit?: number;
}

export interface RecommendationServingResult {
  placement: RecommendationPlacement;
  attributionSource: string;
  items: HydratedRecommendedProduct[];
}

const HOME_AFFINITY_L1_TTL_MS = 60_000;
const HOME_AFFINITY_L2_TTL_MS = 300_000;

@Injectable()
export class GetHomeRecommendationsUseCase {
  private readonly logger = new Logger(GetHomeRecommendationsUseCase.name);

  constructor(
    private readonly repository: RecommendationRepository,
    private readonly cache: RecommendationCacheService,
    private readonly personalizer: InSessionPersonalizerService,
  ) {}

  async execute(
    input: GetHomeRecommendationsInput,
  ): Promise<RecommendationServingResult> {
    const limit = Math.min(Math.max(input.limit ?? 12, 1), 30);
    const excludeSet = new Set<string>(input.recentIds);

    const [inSessionCandidates, trendingCandidates, affinityResult] =
      await Promise.all([
        this.personalizer.getInSessionCandidates(input.recentIds, limit * 2),
        this.loadTrendingCandidates(limit * 2),
        input.customerId
          ? this.loadAffinityAndRecentPurchases(input.customerId, limit * 2)
          : Promise.resolve({
              affinityCandidates: [] as RankedCandidate[],
              recentPurchasedIds: [] as string[],
            }),
      ]);

    for (const boughtId of affinityResult.recentPurchasedIds) {
      excludeSet.add(boughtId);
    }

    const blended = new Map<string, RankedCandidate>();

    // 1. UserAffinityProfile (60%)
    this.mergeWeightedCandidates(
      blended,
      affinityResult.affinityCandidates,
      0.6,
      excludeSet,
      'Dành riêng theo sở thích của bạn',
    );

    // 2. Real-time In-Session Boost (recentIds)
    this.mergeWeightedCandidates(
      blended,
      inSessionCandidates,
      0.4,
      excludeSet,
      'Phù hợp với sản phẩm bạn vừa xem',
    );

    // 3. Trending 7 ngày / Diversity (20%)
    this.mergeWeightedCandidates(
      blended,
      trendingCandidates,
      0.2,
      excludeSet,
      'Đang được yêu thích tuần này',
    );

    let rankedPool = Array.from(blended.values()).sort(
      (a, b) => b.score - a.score,
    );

    // 4. Cold Start fallback cuối cùng: Best Sellers
    if (rankedPool.length < limit) {
      const existingIds = new Set([
        ...excludeSet,
        ...rankedPool.map((c) => c.productId),
      ]);
      const bestSellers = await this.repository.findBestSellerProductCandidates(
        limit * 2,
        Array.from(existingIds),
      );
      this.mergeWeightedCandidates(
        blended,
        bestSellers,
        0.15,
        excludeSet,
        'Sản phẩm bán chạy hàng đầu',
      );
      rankedPool = Array.from(blended.values()).sort(
        (a, b) => b.score - a.score,
      );
    }

    const hydrated = await this.repository.filterAndHydrateEligibleProducts(
      rankedPool.slice(0, limit * 2),
      RecommendationPlacement.HOME,
    );

    return {
      placement: RecommendationPlacement.HOME,
      attributionSource: 'rec_home',
      items: hydrated.slice(0, limit).map((item) => {
        const { tryOnColorHexes: _omit, ...clean } = item;
        return clean;
      }),
    };
  }

  private mergeWeightedCandidates(
    target: Map<string, RankedCandidate>,
    candidates: readonly RankedCandidate[],
    weight: number,
    excludeSet: Set<string>,
    defaultReason: string,
  ): void {
    const maxScore = candidates.reduce(
      (max, item) => Math.max(max, item.score || 0),
      1,
    );

    for (const candidate of candidates) {
      if (excludeSet.has(candidate.productId)) {
        continue;
      }
      const normalized = Math.max(0.05, (candidate.score || 0.5) / maxScore);
      const weighted = normalized * weight;
      const existing = target.get(candidate.productId);
      if (existing) {
        existing.score = Number((existing.score + weighted).toFixed(4));
        if (!existing.reason) {
          existing.reason = candidate.reason ?? defaultReason;
        }
      } else {
        target.set(candidate.productId, {
          productId: candidate.productId,
          score: Number(weighted.toFixed(4)),
          reason: candidate.reason ?? defaultReason,
        });
      }
    }
  }

  private async loadAffinityAndRecentPurchases(
    customerId: string,
    limit: number,
  ): Promise<{
    affinityCandidates: RankedCandidate[];
    recentPurchasedIds: string[];
  }> {
    const [profile, recentPurchasedIds] = await Promise.all([
      this.safeCacheRemember(
        `rec:affinity:${customerId}`,
        () => this.repository.findUserAffinityProfile(customerId),
        { l1TtlMs: HOME_AFFINITY_L1_TTL_MS, l2TtlMs: HOME_AFFINITY_L2_TTL_MS },
      ),
      this.repository.findRecentlyPurchasedProductIds(customerId, 14),
    ]);

    if (!profile) {
      return { affinityCandidates: [], recentPurchasedIds };
    }

    const affinityCandidates =
      await this.repository.findAffinityMatchedCandidates(profile, limit);

    return { affinityCandidates, recentPurchasedIds };
  }

  private async loadTrendingCandidates(
    limit: number,
  ): Promise<RankedCandidate[]> {
    let payload: TrendingCachePayload | null = null;
    try {
      payload = await this.cache.get<TrendingCachePayload>(
        TRENDING_7D_CACHE_KEY,
        { l1TtlMs: HOME_AFFINITY_L1_TTL_MS },
      );
    } catch (error: any) {
      this.logger.warn({
        event: 'home_trending_cache_fallback',
        error: error?.message ?? 'unknown',
      });
    }

    const rows =
      payload?.items?.length
        ? payload.items.slice(0, limit)
        : await this.repository.queryTrendingProductsLast7Days(limit);

    return rows.map((row) => ({
      productId: row.productId,
      score: row.score,
      reason: 'Đang thịnh hành trong 7 ngày qua',
    }));
  }

  private async safeCacheRemember<T>(
    key: string,
    loader: () => Promise<T>,
    options: { l1TtlMs: number; l2TtlMs: number },
  ): Promise<T> {
    try {
      return await this.cache.remember(key, loader, options);
    } catch (error: any) {
      this.logger.warn({
        event: 'home_cache_fallback',
        key,
        error: error?.message ?? 'unknown',
      });
      return loader();
    }
  }
}
