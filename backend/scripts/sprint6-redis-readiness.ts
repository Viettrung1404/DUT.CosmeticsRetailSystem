import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { createHash, randomUUID } from 'crypto';
import { parse } from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { UpstashRedisService } from '../src/core/cache/upstash-redis.service';
import { DistributedThrottlerStorage } from '../src/core/cache/distributed-throttler.storage';

async function run() {
  const values = parse(readFileSync('.env'));
  const prefix = `glowup:sprint6-check:${randomUUID()}:`;
  const config = {
    get: (key: string, fallback?: unknown) =>
      key === 'REDIS_KEY_PREFIX' ? prefix : (values[key] ?? fallback),
    getOrThrow: (key: string) => {
      if (!values[key]) throw new Error(`Missing ${key}`);
      return values[key];
    },
  } as unknown as ConfigService;
  const redis = new UpstashRedisService(config);
  if (!redis.configured) throw new Error('Upstash REST configuration is required');
  const a = new DistributedThrottlerStorage(redis, config),
    b = new DistributedThrottlerStorage(redis, config);
  let cache = false,
    distributed = false,
    ttl = false;
  try {
    await redis.set('probe', { probe: true }, 30000);
    cache = (await redis.get<{ probe: boolean }>('probe'))?.probe === true;
    const results = await Promise.all([
      a.increment('probe', 30000, 1, 30000, 'default'),
      b.increment('probe', 30000, 1, 30000, 'default'),
    ]);
    distributed =
      results.filter((x) => x.isBlocked).length === 1 &&
      results
        .map((x) => x.totalHits)
        .sort()
        .join(',') === '1,2';
    ttl = results.every((x) => x.timeToExpire > 0 && x.timeToExpire <= 30);
    if (!cache || !distributed || !ttl) throw new Error('Redis readiness assertions failed');
  } finally {
    // Only this random test namespace; never FLUSHDB or scan deployment keys.
    const counter = `${prefix}throttle:{${createHash('sha256').update('default:probe').digest('hex')}}`;
    await redis.command(['DEL', `${prefix}cache:0:probe`, counter, `${counter}:block`]);
  }
  const evidence = {
    checkedAt: new Date().toISOString(),
    cacheRoundTrip: cache,
    twoInstanceAtomicRateLimit: distributed,
    expiry: ttl,
    temporaryKeysDeleted: true,
  };
  mkdirSync('.tmp', { recursive: true });
  writeFileSync('.tmp/sprint6-upstash.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
}
run().catch(() => {
  console.error('Sprint 6 Upstash check failed; credentials omitted.');
  process.exitCode = 1;
});
