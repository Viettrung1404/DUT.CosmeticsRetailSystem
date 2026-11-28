import { Injectable, Logger } from "@nestjs/common";
import { RecommendationPlacement } from "@prisma/client";
import {
  HydratedRecommendedProduct,
  RankedCandidate,
  RecommendationRepository,
} from "../../infrastructure/recommendation.repository";
import { RecommendationCacheService } from "../../infrastructure/recommendation-cache.service";
import {
  HOME_INTENT_WINDOW_MS,
  HOME_MAX_PAGES,
  rankHomeIntent,
  RecentProductView,
} from "../../domain/home-intent";
import { InSessionPersonalizerService } from "../services/in-session-personalizer.service";
import {
  TRENDING_7D_CACHE_KEY,
  TrendingCachePayload,
} from "./refresh-trending-cache.use-case";

export interface GetHomeRecommendationsInput {
  customerId: string | null;
  recentIds: string[];
  recentViews?: RecentProductView[];
  guestCartSession?: string;
  limit?: number;
  page?: number;
}

export interface RecommendationServingResult {
  placement: RecommendationPlacement;
  attributionSource: string;
  items: HydratedRecommendedProduct[];
}

interface HomeRecommendationsResult extends RecommendationServingResult {
  pagination?: { page: number; totalPages: number };
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
  ): Promise<HomeRecommendationsResult> {
    const limit = Math.min(Math.max(input.limit ?? 12, 1), 30);
    const poolSize = input.page === undefined ? limit : limit * HOME_MAX_PAGES;
    const now = Date.now();
    const recentViews = (input.recentViews ?? []).filter(
      (view) =>
        now - view.viewedAt < HOME_INTENT_WINDOW_MS &&
        view.viewedAt <= now + 60_000,
    );
    const recentIds = [
      ...new Set([
        ...recentViews.map((view) => view.productId),
        ...input.recentIds,
      ]),
    ];
    const excludeSet = new Set<string>();

    const [inSessionCandidates, trendingCandidates, affinityResult, intent] =
      await Promise.all([
        this.personalizer.getInSessionCandidates(recentIds, limit * 2),
        this.loadTrendingCandidates(Math.min(poolSize * 2, 50)),
        input.customerId
          ? this.loadAffinityAndRecentPurchases(input.customerId, limit * 2)
          : Promise.resolve({
              affinityCandidates: [] as RankedCandidate[],
              recentPurchasedIds: [] as string[],
              avoidedTags: [] as string[],
            }),
        input.customerId || input.guestCartSession
          ? this.repository.findHomeIntent(
              input.customerId,
              input.guestCartSession,
              new Date(now - HOME_INTENT_WINDOW_MS),
            )
          : { cartItems: [], events: [] },
      ]);

    for (const boughtId of affinityResult.recentPurchasedIds) {
      excludeSet.add(boughtId);
    }

    const blended = new Map<string, RankedCandidate>();

    this.mergeWeightedCandidates(
      blended,
      inSessionCandidates,
      0.48,
      excludeSet,
      "Phù hợp với sản phẩm bạn vừa xem",
    );

    this.mergeWeightedCandidates(
      blended,
      affinityResult.affinityCandidates,
      0.16,
      excludeSet,
      "Dành riêng theo sở thích của bạn",
    );

    this.mergeWeightedCandidates(
      blended,
      trendingCandidates,
      0.1,
      excludeSet,
      "Đang được yêu thích tuần này",
    );

    for (const candidate of rankHomeIntent(
      intent,
      recentViews,
      input.recentIds,
      now,
    )) {
      if (
        !excludeSet.has(candidate.productId) &&
        candidate.score > (blended.get(candidate.productId)?.score ?? 0)
      ) {
        blended.set(candidate.productId, candidate);
      }
    }

    const rankAndFilter = async () => {
      const pool = Array.from(blended.values()).sort(
        (a, b) => b.score - a.score || a.productId.localeCompare(b.productId),
      );
      return affinityResult.avoidedTags.length
        ? this.repository.filterCandidatesByAvoidedTags(
            pool,
            affinityResult.avoidedTags,
          )
        : pool;
    };
    const addBestSellers = async () => {
      const bestSellers = await this.repository.findBestSellerProductCandidates(
        affinityResult.avoidedTags.length ? poolSize * 4 : poolSize,
        [...excludeSet, ...blended.keys()],
      );
      bestSellers.forEach((item, index) => {
        blended.set(item.productId, {
          ...item,
          score: 0.004 / (1 + index * 0.02),
        });
      });
    };
    const hydrate = (candidates: readonly RankedCandidate[]) =>
      this.repository.filterAndHydrateEligibleProducts(
        candidates,
        RecommendationPlacement.HOME,
      );

    let items: HydratedRecommendedProduct[];
    let pagination: HomeRecommendationsResult["pagination"];
    if (input.page === undefined) {
      items = await hydrate(await rankAndFilter());
      if (items.length < poolSize) {
        await addBestSellers();
        items = await hydrate(await rankAndFilter());
      }
      items = items.slice(0, limit);
    } else {
      let eligible = await this.repository.findEligibleHomeCandidates(
        await rankAndFilter(),
      );
      if (eligible.length < poolSize) {
        await addBestSellers();
        eligible = await this.repository.findEligibleHomeCandidates(
          await rankAndFilter(),
        );
      }
      const totalPages = Math.ceil(Math.min(eligible.length, poolSize) / limit);
      const page = Math.min(input.page, Math.max(1, totalPages));
      const offset = (page - 1) * limit;
      pagination = { page, totalPages };
      items = await hydrate(eligible.slice(offset, offset + limit));
    }

    return {
      placement: RecommendationPlacement.HOME,
      attributionSource: "rec_home",
      ...(pagination ? { pagination } : {}),
      items: items.map((item) => {
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
    avoidedTags: string[];
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
      return { affinityCandidates: [], recentPurchasedIds, avoidedTags: [] };
    }

    const affinityCandidates =
      await this.repository.findAffinityMatchedCandidates(profile, limit);

    return {
      affinityCandidates,
      recentPurchasedIds,
      avoidedTags: profile.avoidedTags ?? [],
    };
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
        event: "home_trending_cache_fallback",
        error: error?.message ?? "unknown",
      });
    }

    const rows = payload?.items?.length
      ? payload.items.slice(0, limit)
      : await this.repository.queryTrendingProductsLast7Days(limit);

    return rows.map((row) => ({
      productId: row.productId,
      score: row.score,
      reason: "Đang thịnh hành trong 7 ngày qua",
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
        event: "home_cache_fallback",
        key,
        error: error?.message ?? "unknown",
      });
      return loader();
    }
  }
}
