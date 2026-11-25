import { Injectable, Logger } from '@nestjs/common';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import { RecommendationRepository } from '../../infrastructure/recommendation.repository';

const JOB_LOCK_TTL_SECONDS = 600;
const DEFAULT_RETENTION_DAYS = 90;
const CLEANUP_BATCH_SIZE = 5000;

export interface CleanupOldEventsResult {
  skipped: boolean;
  deletedCount?: number;
}

@Injectable()
export class CleanupOldEventsUseCase {
  private readonly logger = new Logger(CleanupOldEventsUseCase.name);

  constructor(
    private readonly repository: RecommendationRepository,
    private readonly cache: RecommendationCacheService,
  ) {}

  async execute(
    retentionDays = DEFAULT_RETENTION_DAYS,
  ): Promise<CleanupOldEventsResult> {
    const locked = await this.cache.withJobLock(
      'cleanup',
      JOB_LOCK_TTL_SECONDS,
      async () => {
        const deletedCount =
          await this.repository.deleteBehaviorEventsOlderThanDaysBatched(
            retentionDays,
            CLEANUP_BATCH_SIZE,
          );

        this.logger.log(
          `Cleaned up ${deletedCount} user_behavior_events older than ${retentionDays} days`,
        );

        return { deletedCount };
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
