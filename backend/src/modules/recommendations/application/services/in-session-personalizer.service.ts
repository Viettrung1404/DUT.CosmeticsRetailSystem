import { Injectable, Logger } from '@nestjs/common';
import { RecommendationType } from '@prisma/client';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import {
  RankedCandidate,
  RecommendationRepository,
} from '../../infrastructure/recommendation.repository';

const SIMILAR_L1_TTL_MS = 60_000;
const SIMILAR_L2_TTL_MS = 600_000;
const MAX_RECENT_IDS = 5;

@Injectable()
export class InSessionPersonalizerService {
  private readonly logger = new Logger(InSessionPersonalizerService.name);

  constructor(
    private readonly repository: RecommendationRepository,
    private readonly cache: RecommendationCacheService,
  ) {}

  /**
   * Trộn nhanh Top SIMILAR_CONTENT của tối đa 5 sản phẩm vừa xem trong phiên
   * từ Cache 2 tầng (L1 -> L2 -> DB) cho cả khách vãng lai lẫn thành viên.
   */
  async getInSessionCandidates(
    recentIds: readonly string[],
    limit = 12,
  ): Promise<RankedCandidate[]> {
    const cleanRecentIds = Array.from(
      new Set(recentIds.map((id) => id.trim()).filter(Boolean)),
    ).slice(0, MAX_RECENT_IDS);

    if (!cleanRecentIds.length) {
      return [];
    }

    const recentSet = new Set(cleanRecentIds);

    const perSeedLists = await Promise.all(
      cleanRecentIds.map(async (productId, index) => {
        const candidates = await this.loadSimilarForSeed(productId);
        const recencyDecay = Math.max(0.5, 1 - index * 0.1);
        return { candidates, recencyDecay };
      }),
    );

    const scoreMap = new Map<
      string,
      { score: number; hits: number; reason: string | null }
    >();

    for (const { candidates, recencyDecay } of perSeedLists) {
      for (const candidate of candidates) {
        if (recentSet.has(candidate.productId)) {
          continue;
        }
        const weighted = candidate.score * recencyDecay;
        const current = scoreMap.get(candidate.productId);
        if (current) {
          scoreMap.set(candidate.productId, {
            score: current.score + weighted + 0.15,
            hits: current.hits + 1,
            reason: current.reason ?? candidate.reason ?? null,
          });
        } else {
          scoreMap.set(candidate.productId, {
            score: weighted,
            hits: 1,
            reason: candidate.reason ?? 'Phù hợp với sản phẩm bạn vừa xem',
          });
        }
      }
    }

    return Array.from(scoreMap.entries())
      .map(([productId, entry]) => ({
        productId,
        score: Number(entry.score.toFixed(4)),
        reason: entry.reason ?? 'Phù hợp với sản phẩm bạn vừa xem',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async loadSimilarForSeed(
    productId: string,
  ): Promise<RankedCandidate[]> {
    const cacheKey = `rec:similar:${productId}`;
    try {
      return await this.cache.remember(
        cacheKey,
        () =>
          this.repository.findPrecomputedRecommendations(
            productId,
            RecommendationType.SIMILAR_CONTENT,
            12,
          ),
        {
          l1TtlMs: SIMILAR_L1_TTL_MS,
          l2TtlMs: SIMILAR_L2_TTL_MS,
        },
      );
    } catch (error: any) {
      this.logger.warn({
        event: 'in_session_cache_fallback',
        productId,
        error: error?.message ?? 'unknown',
      });
      return this.repository.findPrecomputedRecommendations(
        productId,
        RecommendationType.SIMILAR_CONTENT,
        12,
      );
    }
  }
}
