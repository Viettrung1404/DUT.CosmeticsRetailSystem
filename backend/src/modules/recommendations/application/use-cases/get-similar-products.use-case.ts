import { Injectable, Logger } from '@nestjs/common';
import { RecommendationPlacement, RecommendationType } from '@prisma/client';
import { computeColorDeltaE } from '../../domain/content-similarity.scorer';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import {
  HydratedRecommendedProduct,
  RankedCandidate,
  RecommendationRepository,
} from '../../infrastructure/recommendation.repository';
import { RecommendationServingResult } from './get-home-recommendations.use-case';

export interface GetSimilarProductsInput {
  productId: string;
  limit?: number;
  shadeHex?: string;
}

const SIMILAR_L1_TTL_MS = 60_000;
const SIMILAR_L2_TTL_MS = 600_000;

@Injectable()
export class GetSimilarProductsUseCase {
  private readonly logger = new Logger(GetSimilarProductsUseCase.name);

  constructor(
    private readonly repository: RecommendationRepository,
    private readonly cache: RecommendationCacheService,
  ) {}

  async execute(
    input: GetSimilarProductsInput,
  ): Promise<RecommendationServingResult> {
    const limit = Math.min(Math.max(input.limit ?? 8, 1), 24);
    const cacheKey = `rec:similar:${input.productId}`;

    let candidates = await this.loadPrecomputed(cacheKey, input.productId);
    candidates = candidates.filter((c) => c.productId !== input.productId);

    let hydrated = await this.repository.filterAndHydrateEligibleProducts(
      candidates,
      RecommendationPlacement.PRODUCT_SIMILAR,
    );

    if (hydrated.length < limit) {
      const fallbacks =
        await this.repository.findSameCategoryPriceRangeFallbacks(
          input.productId,
          limit * 2,
        );
      const seen = new Set(candidates.map((c) => c.productId));
      const newCandidates: RankedCandidate[] = [];
      for (const fb of fallbacks) {
        if (fb.productId !== input.productId && !seen.has(fb.productId)) {
          seen.add(fb.productId);
          newCandidates.push(fb);
        }
      }
      const fallbackItems =
        await this.repository.filterAndHydrateEligibleProducts(
          newCandidates,
          RecommendationPlacement.PRODUCT_SIMILAR,
        );
      hydrated = [...hydrated, ...fallbackItems];
    }

    const finalItems = input.shadeHex
      ? this.applyShadeBoost(hydrated, input.shadeHex)
      : hydrated;

    return {
      placement: RecommendationPlacement.PRODUCT_SIMILAR,
      attributionSource: 'rec_similar',
      items: finalItems.slice(0, limit).map((item) => {
        const { tryOnColorHexes: _omit, ...clean } = item;
        return clean;
      }),
    };
  }

  private async loadPrecomputed(
    cacheKey: string,
    productId: string,
  ): Promise<RankedCandidate[]> {
    try {
      return await this.cache.remember(
        cacheKey,
        () =>
          this.repository.findPrecomputedRecommendations(
            productId,
            RecommendationType.SIMILAR_CONTENT,
            24,
          ),
        {
          l1TtlMs: SIMILAR_L1_TTL_MS,
          l2TtlMs: SIMILAR_L2_TTL_MS,
        },
      );
    } catch (error: any) {
      this.logger.warn({
        event: 'similar_cache_fallback',
        productId,
        error: error?.message ?? 'unknown',
      });
      return this.repository.findPrecomputedRecommendations(
        productId,
        RecommendationType.SIMILAR_CONTENT,
        24,
      );
    }
  }

  private applyShadeBoost(
    items: HydratedRecommendedProduct[],
    shadeHex: string,
  ): HydratedRecommendedProduct[] {
    return items
      .map((item) => {
        const swatches = item.tryOnColorHexes ?? [];
        if (!swatches.length) {
          return item;
        }

        let minDelta = Number.POSITIVE_INFINITY;
        for (const swatch of swatches) {
          const delta = computeColorDeltaE(shadeHex, swatch);
          if (delta < minDelta) {
            minDelta = delta;
          }
        }

        if (!Number.isFinite(minDelta)) {
          return item;
        }

        const colorProximity = Math.max(0, 1 - Math.min(minDelta, 60) / 60);
        const boostedScore = Number(
          ((item.score ?? 0) + 0.35 * colorProximity).toFixed(4),
        );
        return {
          ...item,
          score: boostedScore,
          reason:
            minDelta <= 20
              ? 'Có tông màu gần nhất với sắc độ bạn đang thử'
              : item.reason,
        };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
}
