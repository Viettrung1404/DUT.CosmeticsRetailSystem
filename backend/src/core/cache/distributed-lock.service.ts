import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UpstashRedisService } from './upstash-redis.service';

export const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end`;

export const EXTEND_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('EXPIRE', KEYS[1], ARGV[2])
else
  return 0
end`;

export interface DistributedLockHandle {
  key: string;
  token: string;
  backend: 'redis' | 'memory';
  release: () => Promise<boolean>;
  extend: (ttlSeconds: number) => Promise<boolean>;
}

export interface AcquireLockOptions {
  /** If true, throw when Redis fails instead of falling back to local in-memory lock. */
  strict?: boolean;
}

@Injectable()
export class DistributedLockService implements OnModuleDestroy {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly memoryLocks = new Map<
    string,
    { token: string; expiresAt: number }
  >();

  constructor(private readonly redis: UpstashRedisService) {}

  onModuleDestroy(): void {
    this.memoryLocks.clear();
  }

  private acquireMemoryLock(
    key: string,
    token: string,
    ttlSeconds: number,
  ): DistributedLockHandle | null {
    const now = Date.now();
    const current = this.memoryLocks.get(key);
    if (current && current.expiresAt > now) {
      return null;
    }

    this.memoryLocks.set(key, {
      token,
      expiresAt: now + ttlSeconds * 1000,
    });

    return {
      key,
      token,
      backend: 'memory',
      release: async () => {
        const entry = this.memoryLocks.get(key);
        if (entry && entry.token === token) {
          this.memoryLocks.delete(key);
          return true;
        }
        return false;
      },
      extend: async (nextTtlSeconds: number) => {
        const safeTtl = Math.max(1, Math.ceil(nextTtlSeconds));
        const entry = this.memoryLocks.get(key);
        if (entry && entry.token === token && entry.expiresAt > Date.now()) {
          entry.expiresAt = Date.now() + safeTtl * 1000;
          return true;
        }
        return false;
      },
    };
  }

  /**
   * Acquire a distributed lock via `SET key token NX EX ttl`.
   * Falls back to in-memory lock when Redis is unconfigured or unavailable (unless `strict: true`).
   */
  async acquire(
    name: string,
    ttlSeconds = 600,
    options?: AcquireLockOptions,
  ): Promise<DistributedLockHandle | null> {
    const ttl = Math.max(1, Math.ceil(ttlSeconds));
    const token = randomUUID();
    const lockKey = `${this.redis.keyPrefix ?? ''}lock:${name}`;

    if (!this.redis.configured) {
      return this.acquireMemoryLock(lockKey, token, ttl);
    }

    try {
      const result = await this.redis.command<'OK' | null>([
        'SET',
        lockKey,
        token,
        'NX',
        'EX',
        ttl,
      ]);

      if (result !== 'OK') {
        return null;
      }

      return {
        key: lockKey,
        token,
        backend: 'redis',
        release: async () => {
          try {
            const released = await this.redis.command<number>([
              'EVAL',
              RELEASE_LOCK_SCRIPT,
              1,
              lockKey,
              token,
            ]);
            return released === 1;
          } catch {
            this.logger.warn({ event: 'distributed_lock_release_failed', name });
            return false;
          }
        },
        extend: async (nextTtlSeconds: number) => {
          const safeTtl = Math.max(1, Math.ceil(nextTtlSeconds));
          try {
            const extended = await this.redis.command<number>([
              'EVAL',
              EXTEND_LOCK_SCRIPT,
              1,
              lockKey,
              token,
              safeTtl,
            ]);
            return extended === 1;
          } catch {
            this.logger.warn({ event: 'distributed_lock_extend_failed', name });
            return false;
          }
        },
      };
    } catch (err) {
      if (options?.strict) {
        throw err;
      }
      this.logger.warn({
        event: 'distributed_lock_fallback_memory',
        name,
      });
      return this.acquireMemoryLock(lockKey, token, ttl);
    }
  }

  /**
   * Run `task` under a distributed lock and release it safely in `finally`.
   */
  async withLock<T>(
    name: string,
    ttlSeconds: number,
    task: () => Promise<T>,
    options?: AcquireLockOptions,
  ): Promise<{ acquired: true; result: T } | { acquired: false }> {
    const handle = await this.acquire(name, ttlSeconds, options);
    if (!handle) {
      return { acquired: false };
    }

    try {
      const result = await task();
      return { acquired: true, result };
    } finally {
      await handle.release();
    }
  }
}
