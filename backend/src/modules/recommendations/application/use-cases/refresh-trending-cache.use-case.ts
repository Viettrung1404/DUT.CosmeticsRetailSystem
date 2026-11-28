import { Injectable, Logger } from '@nestjs/common';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import {
  RecommendationRepository,
  TrendingProductRow,
} from '../../infrastructure/recommendation.repository';

export const TRENDING_7D_CACHE_KEY = 'rec:trending:7d';
const TRENDING_CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const JOB_LOCK_TTL_SECONDS = 600;
const TRENDING_LIMIT = 50;

export interface TrendingCachePayload {
  items: TrendingProductRow[];
  generatedAt: string;
}

export interface RefreshTrendingCacheResult {
  skipped: boolean;
  count?: number;
}

@Injectable()
export class RefreshTrendingCacheUseCase {
  private readonly logger = new Logger(RefreshTrendingCacheUseCase.name);

  constructor(
    private readonly repository: RecommendationRepository,
    private readonly cache: RecommendationCacheService,
  ) {}

  async execute(): Promise<RefreshTrendingCacheResult> {
    const locked = await this.cache.withJobLock(
      'trending',
      JOB_LOCK_TTL_SECONDS,
      async () => {
        const items =
          await this.repository.queryTrendingProductsLast7Days(TRENDING_LIMIT);

        const payload: TrendingCachePayload = {
          items,
          generatedAt: new Date().toISOString(),
        };

        await this.cache.set(
          TRENDING_7D_CACHE_KEY,
          payload,
          TRENDING_CACHE_TTL_MS,
        );

        this.logger.log(
          `Refreshed ${TRENDING_7D_CACHE_KEY} with ${items.length} products`,
        );

        return { count: items.length };
      },
    );

    if (!locked.acquired) {
      return { skipped: true };
    }

    return {
      skipped: false,
      ...locked.result,
    };
  }
}
