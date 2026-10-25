import { Global, Module } from '@nestjs/common';
import { CACHE_SERVICE } from './cache.service.interface';
import { InMemoryCacheService } from './in-memory-cache.service';
import { UpstashRedisService } from './upstash-redis.service';

@Global()
@Module({
  providers: [
    UpstashRedisService,
    InMemoryCacheService,
    {
      provide: CACHE_SERVICE,
      useFactory: (redis: UpstashRedisService, memory: InMemoryCacheService) => redis.configured ? redis : memory,
      inject: [UpstashRedisService, InMemoryCacheService],
    },
  ],
  exports: [CACHE_SERVICE, UpstashRedisService],
})
export class CacheModule {}
