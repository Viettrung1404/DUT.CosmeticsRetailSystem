import { Global, Module } from '@nestjs/common';
import { CACHE_SERVICE } from './cache.service.interface';
import { InMemoryCacheService } from './in-memory-cache.service';
import { UpstashRedisService } from './upstash-redis.service';
import { TwoLevelCacheService } from './two-level-cache.service';
import { DistributedLockService } from './distributed-lock.service';
import { DistributedThrottlerStorage } from './distributed-throttler.storage';
import { VersionedPublicCacheService } from './versioned-public-cache.service';

@Global()
@Module({
  providers: [
    UpstashRedisService,
    InMemoryCacheService,
    TwoLevelCacheService,
    DistributedLockService,
    DistributedThrottlerStorage,
    VersionedPublicCacheService,
    {
      provide: CACHE_SERVICE,
      useExisting: TwoLevelCacheService,
    },
  ],
  exports: [
    CACHE_SERVICE,
    InMemoryCacheService,
    UpstashRedisService,
    TwoLevelCacheService,
    DistributedLockService,
    DistributedThrottlerStorage,
    VersionedPublicCacheService,
  ],
})
export class CacheModule {}
