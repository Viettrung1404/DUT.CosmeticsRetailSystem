import { Injectable, Logger } from '@nestjs/common';
import { RecommendationPlacement } from '@prisma/client';
import { createHash } from 'crypto';
import { formatHalfvecLiteral } from '../../domain/product-embedding-text.util';
import { EmbeddingClientService } from '../../infrastructure/embedding-client.service';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import {
  HydratedRecommendedProduct,
  RankedCandidate,
  RecommendationRepository,
} from '../../infrastructure/recommendation.repository';

export interface SemanticSearchInput {
  query: string;
  limit?: number;
}

export interface SemanticSearchResult {
  query: string;
  mode: 'SEMANTIC_VECTOR' | 'KEYWORD_FALLBACK';
  placement: RecommendationPlacement;
  attributionSource: string;
  items: HydratedRecommendedProduct[];
}

const QUERY_EMBEDDING_L1_TTL_MS = 60_000;
const QUERY_EMBEDDING_L2_TTL_MS = 300_000;

@Injectable()
export class SemanticSearchProductsUseCase {
  private readonly logger = new Logger(SemanticSearchProductsUseCase.name);

  constructor(
    private readonly repository: RecommendationRepository,
    private readonly cache: RecommendationCacheService,
    private readonly embeddingClient: EmbeddingClientService,
  ) {}

  async execute(input: SemanticSearchInput): Promise<SemanticSearchResult> {
    const cleanQuery = input.query.trim();
    const limit = Math.min(Math.max(input.limit ?? 12, 1), 30);

    let candidates: RankedCandidate[] = [];
    let mode: 'SEMANTIC_VECTOR' | 'KEYWORD_FALLBACK' = 'KEYWORD_FALLBACK';

    if (cleanQuery && this.embeddingClient.isConfigured()) {
      const vector = await this.getOrComputeQueryVector(cleanQuery);
      if (vector) {
        try {
          const literal = formatHalfvecLiteral(vector);
          candidates = await this.repository.querySemanticSearchCandidates(
            literal,
            limit * 2,
          );
          if (candidates.length > 0) {
            mode = 'SEMANTIC_VECTOR';
          }
        } catch (error: any) {
          this.logger.warn({
            event: 'semantic_search_vector_query_fallback',
            error: error?.message ?? 'unknown',
          });
        }
      }
    }

    // Fallback hoặc bổ sung bằng keyword + từ điển hoạt chất khi chưa đủ kết quả / chưa có embedding
    if (candidates.length < limit && cleanQuery) {
      const fallbacks =
        await this.repository.queryKeywordFallbackSearchCandidates(
          cleanQuery,
          limit * 2,
        );
      const seen = new Set(candidates.map((c) => c.productId));
      for (const fb of fallbacks) {
        if (!seen.has(fb.productId)) {
          seen.add(fb.productId);
          candidates.push(fb);
        }
      }
    }

    const hydrated = await this.repository.filterAndHydrateEligibleProducts(
      candidates.slice(0, limit * 2),
      RecommendationPlacement.HOME,
    );

    return {
      query: cleanQuery,
      mode,
      placement: RecommendationPlacement.HOME,
      attributionSource: 'rec_home',
      items: hydrated.slice(0, limit).map((item) => {
        const { tryOnColorHexes: _omit, ...clean } = item;
        return clean;
      }),
    };
  }

  private async getOrComputeQueryVector(
    query: string,
  ): Promise<number[] | null> {
    const hash = createHash('sha256')
      .update(query.toLowerCase())
      .digest('hex')
      .slice(0, 16);
    const cacheKey = `rec:qvec:${hash}`;

    return this.cache.remember(
      cacheKey,
      () => this.embeddingClient.embedQuery(query),
      {
        l1TtlMs: QUERY_EMBEDDING_L1_TTL_MS,
        l2TtlMs: QUERY_EMBEDDING_L2_TTL_MS,
      },
    );
  }
}
