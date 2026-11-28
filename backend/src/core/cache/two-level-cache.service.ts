import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICacheService } from './cache.service.interface';
import { InMemoryCacheService } from './in-memory-cache.service';
import { UpstashRedisService } from './upstash-redis.service';

export interface TwoLevelCacheOptions {
  /** L2 (Upstash) TTL in ms (alias of l2TtlMs). */
  ttlMs?: number;
  /** Short L1 (in-memory) TTL in ms; capped by L2 TTL when both are provided. */
  l1TtlMs?: number;
  /** Explicit L2 (Upstash) TTL in ms. */
  l2TtlMs?: number;
}

const DEFAULT_L1_TTL_MS = 60_000;
const DEFAULT_L2_TTL_MS = 300_000;
const DEFAULT_FALLBACK_COOLDOWN_MS = 30_000;

@Injectable()
export class TwoLevelCacheService implements ICacheService {
  private readonly logger = new Logger(TwoLevelCacheService.name);
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private localL2BackoffUntil = 0;

  constructor(
    private readonly l1: InMemoryCacheService,
    private readonly l2: UpstashRedisService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  private defaultL1TtlMs(): number {
    const raw = Number(this.config?.get('CACHE_L1_DEFAULT_TTL_MS'));
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_L1_TTL_MS;
  }

  private defaultL2TtlMs(): number {
    const raw = Number(this.config?.get('CACHE_L2_DEFAULT_TTL_MS'));
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_L2_TTL_MS;
  }

  private isL2Available(): boolean {
    return (
      Boolean(this.l2?.configured) &&
      !this.l2.degraded &&
      Date.now() >= this.localL2BackoffUntil
    );
  }

  private markL2Degraded(cooldownMs = DEFAULT_FALLBACK_COOLDOWN_MS): void {
    this.localL2BackoffUntil = Date.now() + cooldownMs;
  }

  async get<T>(key: string, options?: Pick<TwoLevelCacheOptions, 'l1TtlMs'>): Promise<T | null> {
    const l1Hit = await this.l1.get<T>(key);
    if (l1Hit !== null) {
      return l1Hit;
    }

    if (!this.isL2Available()) {
      return null;
    }

    try {
      const l2Hit = await this.l2.get<T>(key);
      if (l2Hit !== null) {
        const l1Ttl = options?.l1TtlMs ?? this.defaultL1TtlMs();
        await this.l1.set(key, l2Hit, l1Ttl);
      }
      return l2Hit;
    } catch {
      this.markL2Degraded();
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttlMs?: number,
    options?: Pick<TwoLevelCacheOptions, 'l1TtlMs'>,
  ): Promise<void> {
    const l2Ttl = ttlMs ?? this.defaultL2TtlMs();
    if (l2Ttl <= 0) {
      await this.del(key);
      return;
    }

    const l1Ttl = Math.min(l2Ttl, options?.l1TtlMs ?? this.defaultL1TtlMs());
    await this.l1.set(key, value, l1Ttl);

    if (!this.isL2Available()) {
      return;
    }

    try {
      await this.l2.set(key, value, l2Ttl);
    } catch {
      this.markL2Degraded();
    }
  }

  async del(key: string): Promise<void> {
    await this.l1.del(key);

    if (!this.isL2Available()) {
      return;
    }

    try {
      await this.l2.del(key);
    } catch {
      // Graceful degradation: cache invalidation failure must not throw 500
      this.markL2Degraded();
      this.logger.warn({ event: 'two_level_cache_del_degraded' });
    }
  }

  async reset(): Promise<void> {
    await this.l1.reset();

    if (!this.isL2Available()) {
      return;
    }

    try {
      await this.l2.reset();
    } catch {
      this.markL2Degraded();
      this.logger.warn({ event: 'two_level_cache_reset_degraded' });
    }
  }

  /**
   * Read-through cache helper (L1 -> L2 -> loader) with singleflight coalescing
   * and graceful degradation when Upstash errors or reaches quota.
   */
  async remember<T>(
    key: string,
    load: () => Promise<T>,
    options?: TwoLevelCacheOptions,
  ): Promise<T> {
    const l2Ttl = options?.l2TtlMs ?? options?.ttlMs ?? this.defaultL2TtlMs();
    const l1Ttl = Math.min(l2Ttl, options?.l1TtlMs ?? this.defaultL1TtlMs());

    const hit = await this.get<T>(key, { l1TtlMs: l1Ttl });
    if (hit !== null) {
      return hit;
    }

    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) {
      return existing;
    }

    const pending = (async () => {
      const value = await load();
      if (value !== null && value !== undefined && l2Ttl > 0) {
        await this.set(key, value, l2Ttl, { l1TtlMs: l1Ttl });
      }
      return value;
    })().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, pending);
    return pending;
  }
}
