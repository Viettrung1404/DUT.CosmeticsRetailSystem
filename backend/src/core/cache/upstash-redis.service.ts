import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { ICacheService } from './cache.service.interface';

@Injectable()
export class UpstashRedisService implements ICacheService {
  constructor(private readonly config: ConfigService) {}
  get configured() {
    return (
      !!this.config.get('UPSTASH_REDIS_REST_URL') &&
      !!this.config.get('UPSTASH_REDIS_REST_TOKEN')
    );
  }
  private get prefix() {
    return this.config.get<string>(
      'REDIS_KEY_PREFIX',
      `glowup:${this.config.get('NODE_ENV', 'development')}:`,
    );
  }
  async command<T>(command: (string | number)[]): Promise<T> {
    const endpoint = new URL(
      this.config.getOrThrow<string>('UPSTASH_REDIS_REST_URL'),
    );
    if (
      endpoint.protocol !== 'https:' ||
      !endpoint.hostname.endsWith('.upstash.io') ||
      endpoint.username ||
      endpoint.password
    )
      throw new ServiceUnavailableException('REDIS_CONFIGURATION_INVALID');
    try {
      const response = await fetch(endpoint.origin, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.getOrThrow('UPSTASH_REDIS_REST_TOKEN')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
        signal: AbortSignal.timeout(2000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('REDIS_HTTP_FAILED');
      const value = (await response.json()) as { result: T; error?: string };
      if (value.error) throw new Error('REDIS_COMMAND_FAILED');
      return value.result;
    } catch {
      throw new ServiceUnavailableException('REDIS_UNAVAILABLE');
    }
  }
  private async cacheKey(key: string) {
    const epoch = await this.command<string | null>([
      'GET',
      `${this.prefix}cache:epoch`,
    ]);
    return `${this.prefix}cache:${epoch ?? '0'}:${key}`;
  }
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.command<string | null>([
        'GET',
        await this.cacheKey(key),
      ]);
      return value === null ? null : (JSON.parse(value) as T);
    } catch {
      return null;
    }
  }
  async set<T>(key: string, value: T, ttlMs = 300000) {
    if (ttlMs <= 0) return this.del(key);
    try {
      await this.command([
        'SET',
        await this.cacheKey(key),
        JSON.stringify(value),
        'PX',
        Math.floor(ttlMs),
      ]);
    } catch {
      /* Cache loss must not change business decisions. */
    }
  }
  async del(key: string) {
    // Invalidation failures must reach callers so stale cache is not silently accepted.
    await this.command(['DEL', await this.cacheKey(key)]);
  }
  async reset() {
    await this.command(['SET', `${this.prefix}cache:epoch`, randomUUID()]);
  }
  async rateLimit(identity: string, limit: number, ttlMs: number) {
    const key =
      this.prefix +
      'rate:' +
      createHash('sha256').update(identity).digest('hex');
    const count = await this.command<number>([
      'EVAL',
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n",
      1,
      key,
      ttlMs,
    ]);
    return count <= limit;
  }
}
