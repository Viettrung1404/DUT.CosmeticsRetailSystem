import { Injectable, Logger } from '@nestjs/common';
import {
  DistributedLockHandle,
  DistributedLockService,
} from '@core/cache/distributed-lock.service';
import {
  TwoLevelCacheOptions,
  TwoLevelCacheService,
} from '@core/cache/two-level-cache.service';

@Injectable()
export class RecommendationCacheService {
  private readonly logger = new Logger(RecommendationCacheService.name);

  constructor(
    private readonly cache: TwoLevelCacheService,
    private readonly lockService: DistributedLockService,
  ) {}

  async get<T>(
    key: string,
    options?: Pick<TwoLevelCacheOptions, 'l1TtlMs'>,
  ): Promise<T | null> {
    try {
      return await this.cache.get<T>(key, options);
    } catch (error: any) {
      this.logger.warn({
        event: 'recommendation_cache_degraded',
        operation: 'get',
        key,
        error: error?.message ?? 'unknown',
      });
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttlMs?: number,
    options?: Pick<TwoLevelCacheOptions, 'l1TtlMs'>,
  ): Promise<void> {
    try {
      await this.cache.set<T>(key, value, ttlMs, options);
    } catch (error: any) {
      this.logger.warn({
        event: 'recommendation_cache_degraded',
        operation: 'set',
        key,
        error: error?.message ?? 'unknown',
      });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cache.del(key);
    } catch (error: any) {
      this.logger.warn({
        event: 'recommendation_cache_degraded',
        operation: 'del',
        key,
        error: error?.message ?? 'unknown',
      });
    }
  }

  async remember<T>(
    key: string,
    load: () => Promise<T>,
    options?: TwoLevelCacheOptions,
  ): Promise<T> {
    try {
      return await this.cache.remember<T>(key, load, options);
    } catch (error: any) {
      this.logger.warn({
        event: 'recommendation_cache_degraded',
        operation: 'remember',
        key,
        error: error?.message ?? 'unknown',
      });
      return load();
    }
  }

  acquireJobLock(
    jobName: string,
    ttlSeconds = 600,
  ): Promise<DistributedLockHandle | null> {
    return this.lockService.acquire(`rec:${jobName}`, ttlSeconds);
  }

  withJobLock<T>(
    jobName: string,
    ttlSeconds: number,
    task: () => Promise<T>,
  ): Promise<{ acquired: true; result: T } | { acquired: false }> {
    return this.lockService.withLock(`rec:${jobName}`, ttlSeconds, task);
  }
}
