import { Injectable, Logger } from '@nestjs/common';
import { RecommendationPlacement, RecommendationType } from '@prisma/client';
import { matchRoutineRule } from '../../domain/skincare-routine.rules';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import {
  RankedCandidate,
  RecommendationRepository,
} from '../../infrastructure/recommendation.repository';
import { RecommendationServingResult } from './get-home-recommendations.use-case';

export interface GetBoughtTogetherInput {
  productId: string;
  limit?: number;
}

const BOUGHT_TOGETHER_L1_TTL_MS = 60_000;
const BOUGHT_TOGETHER_L2_TTL_MS = 600_000;

@Injectable()
export class GetBoughtTogetherProductsUseCase {
  private readonly logger = new Logger(GetBoughtTogetherProductsUseCase.name);

  constructor(
    private readonly repository: RecommendationRepository,
    private readonly cache: RecommendationCacheService,
  ) {}

  async execute(
    input: GetBoughtTogetherInput,
  ): Promise<RecommendationServingResult> {
    const limit = Math.min(Math.max(input.limit ?? 6, 1), 24);
    const cacheKey = `rec:bought-together:${input.productId}`;

    let candidates = await this.loadPrecomputed(cacheKey, input.productId);
    candidates = candidates.filter((c) => c.productId !== input.productId);

    let hydrated = await this.repository.filterAndHydrateEligibleProducts(
      candidates,
      RecommendationPlacement.PRODUCT_BOUGHT_TOGETHER,
    );

    if (hydrated.length < limit) {
      const routineFallbacks = await this.loadRoutineFallbacks(input.productId);
      const seen = new Set(candidates.map((c) => c.productId));
      const newCandidates: RankedCandidate[] = [];
      for (const fb of routineFallbacks) {
        if (fb.productId !== input.productId && !seen.has(fb.productId)) {
          seen.add(fb.productId);
          newCandidates.push(fb);
        }
      }
      const fallbackItems =
        await this.repository.filterAndHydrateEligibleProducts(
          newCandidates,
          RecommendationPlacement.PRODUCT_BOUGHT_TOGETHER,
        );
      hydrated = [...hydrated, ...fallbackItems];
    }

    return {
      placement: RecommendationPlacement.PRODUCT_BOUGHT_TOGETHER,
      attributionSource: 'rec_bought_together',
      items: hydrated.slice(0, limit).map((item) => {
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
            RecommendationType.BOUGHT_TOGETHER,
            24,
          ),
        {
          l1TtlMs: BOUGHT_TOGETHER_L1_TTL_MS,
          l2TtlMs: BOUGHT_TOGETHER_L2_TTL_MS,
        },
      );
    } catch (error: any) {
      this.logger.warn({
        event: 'bought_together_cache_fallback',
        productId,
        error: error?.message ?? 'unknown',
      });
      return this.repository.findPrecomputedRecommendations(
        productId,
        RecommendationType.BOUGHT_TOGETHER,
        24,
      );
    }
  }

  private async loadRoutineFallbacks(
    productId: string,
  ): Promise<RankedCandidate[]> {
    const subject = await this.repository.findProductRoutineSubject(productId);
    if (!subject) {
      return [];
    }

    const catalog = await this.repository.findActiveProductRoutineCatalog();
    const subjectLabel = `${subject.categoryName} ${subject.name}`;

    const matched: RankedCandidate[] = [];
    for (const candidate of catalog) {
      if (candidate.id === productId) continue;
      const rule = matchRoutineRule(
        subjectLabel,
        `${candidate.categoryName} ${candidate.name}`,
      );
      if (rule) {
        matched.push({
          productId: candidate.id,
          score: Number((0.4 * rule.priority).toFixed(4)),
          reason: rule.reason,
        });
      }
    }

    return matched;
  }
}
