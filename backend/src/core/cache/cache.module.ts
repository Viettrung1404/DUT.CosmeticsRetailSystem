import { Global, Module } from '@nestjs/common';
import { CACHE_SERVICE } from './cache.service.interface';
import { InMemoryCacheService } from './in-memory-cache.service';
import { UpstashRedisService } from './upstash-redis.service';
import { DistributedThrottlerStorage } from './distributed-throttler.storage';
import { VersionedPublicCacheService } from './versioned-public-cache.service';

@Global()
@Module({
  providers: [
    UpstashRedisService,
    DistributedThrottlerStorage,
    VersionedPublicCacheService,
    InMemoryCacheService,
    {
      provide: CACHE_SERVICE,
      useFactory: (redis: UpstashRedisService, memory: InMemoryCacheService) =>
        redis.configured ? redis : memory,
      inject: [UpstashRedisService, InMemoryCacheService],
    },
  ],
  exports: [
    CACHE_SERVICE,
    UpstashRedisService,
    DistributedThrottlerStorage,
    VersionedPublicCacheService,
  ],
})
export class CacheModule {}
