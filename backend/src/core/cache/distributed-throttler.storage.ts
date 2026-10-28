import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { createHash } from 'crypto';
import { UpstashRedisService } from './upstash-redis.service';

// Fixed window plus a separate block timer. All counters and expiry change atomically.
export const THROTTLE_SCRIPT = `
local blocked=redis.call('PTTL',KEYS[2])
if blocked>0 then return {tonumber(redis.call('GET',KEYS[1]) or '0'),math.max(0,redis.call('PTTL',KEYS[1])),blocked} end
local n=redis.call('INCR',KEYS[1])
if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end
local remaining=redis.call('PTTL',KEYS[1])
if n>tonumber(ARGV[2]) then redis.call('SET',KEYS[2],'1','PX',ARGV[3]); return {n,remaining,tonumber(ARGV[3])} end
return {n,remaining,0}`;

@Injectable()
export class DistributedThrottlerStorage implements ThrottlerStorage {
  private readonly memory = new ThrottlerStorageService();
  constructor(
    private readonly redis: UpstashRedisService,
    private readonly config: ConfigService,
  ) {}
  async increment(key: string, ttl: number, limit: number, blockDuration: number, name: string) {
    if (!this.redis.configured) {
      if (this.config.get('NODE_ENV') === 'production')
        throw new ServiceUnavailableException('RATE_LIMIT_STORE_REQUIRED');
      return this.memory.increment(key, ttl, limit, blockDuration, name);
    }
    const prefix = this.config.get(
      'REDIS_KEY_PREFIX',
      `glowup:${this.config.get('NODE_ENV', 'development')}:`,
    );
    const hash = createHash('sha256').update(`${name}:${key}`).digest('hex');
    const counter = `${prefix}throttle:{${hash}}`;
    const [hits, remaining, blocked] = await this.redis.command<number[]>([
      'EVAL',
      THROTTLE_SCRIPT,
      2,
      counter,
      `${counter}:block`,
      ttl,
      limit,
      blockDuration,
    ]);
    return {
      totalHits: hits,
      timeToExpire: Math.ceil(remaining / 1000),
      isBlocked: blocked > 0,
      timeToBlockExpire: Math.ceil(blocked / 1000),
    };
  }
}
