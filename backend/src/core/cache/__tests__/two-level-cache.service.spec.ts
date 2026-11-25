import { InMemoryCacheService } from '../in-memory-cache.service';
import { TwoLevelCacheService } from '../two-level-cache.service';
import { configFixture } from '../../../../test/support/config';

describe('TwoLevelCacheService', () => {
  let l1: InMemoryCacheService;

  beforeEach(() => {
    l1 = new InMemoryCacheService();
  });

  afterEach(() => {
    l1.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('returns L1 hit without touching Upstash L2', async () => {
    const l2 = {
      configured: true,
      degraded: false,
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    } as any;

    const cache = new TwoLevelCacheService(l1, l2, configFixture({}));
    await cache.set('rec:trending:7d', ['p1', 'p2'], 600_000, { l1TtlMs: 60_000 });

    const first = await cache.get<string[]>('rec:trending:7d');
    const second = await cache.get<string[]>('rec:trending:7d');

    expect(first).toEqual(['p1', 'p2']);
    expect(second).toEqual(['p1', 'p2']);
    expect(l2.set).toHaveBeenCalledTimes(1);
    expect(l2.get).not.toHaveBeenCalled();
  });

  it('backfills L1 on L2 hit and coalesces concurrent remember() misses', async () => {
    const l2 = {
      configured: true,
      degraded: false,
      get: jest.fn().mockResolvedValueOnce(['from-l2']).mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    } as any;

    const cache = new TwoLevelCacheService(l1, l2, configFixture({}));

    // 1. L1 miss -> L2 hit -> backfills L1
    expect(await cache.get<string[]>('warm-key')).toEqual(['from-l2']);
    expect(await cache.get<string[]>('warm-key')).toEqual(['from-l2']);
    expect(l2.get).toHaveBeenCalledTimes(1);

    // 2. Concurrent remember() misses -> singleflight invokes loader once
    const loader = jest.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { items: [1, 2, 3] };
    });

    const [a, b, c] = await Promise.all([
      cache.remember('rec:similar:p1', loader, { l1TtlMs: 30_000, l2TtlMs: 300_000 }),
      cache.remember('rec:similar:p1', loader, { l1TtlMs: 30_000, l2TtlMs: 300_000 }),
      cache.remember('rec:similar:p1', loader, { l1TtlMs: 30_000, l2TtlMs: 300_000 }),
    ]);

    expect(a).toEqual({ items: [1, 2, 3] });
    expect(b).toEqual({ items: [1, 2, 3] });
    expect(c).toEqual({ items: [1, 2, 3] });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('degrades gracefully when Upstash throws or is degraded (never throws 500)', async () => {
    const l2 = {
      configured: true,
      degraded: false,
      get: jest.fn().mockRejectedValue(new Error('REDIS_UNAVAILABLE')),
      set: jest.fn().mockRejectedValue(new Error('REDIS_UNAVAILABLE')),
      del: jest.fn().mockRejectedValue(new Error('REDIS_UNAVAILABLE')),
      reset: jest.fn().mockRejectedValue(new Error('REDIS_UNAVAILABLE')),
    } as any;

    const cache = new TwoLevelCacheService(l1, l2, configFixture({}));

    const dbLoader = jest.fn().mockResolvedValue(['fallback-from-db']);
    await expect(
      cache.remember('rec:home:user1', dbLoader, { l1TtlMs: 60_000, l2TtlMs: 600_000 }),
    ).resolves.toEqual(['fallback-from-db']);

    // Subsequent read hits L1 even though L2 is in backoff cooldown
    await expect(cache.get('rec:home:user1')).resolves.toEqual(['fallback-from-db']);
    expect(l2.get).toHaveBeenCalledTimes(1);

    // del and reset must never throw when L2 fails
    await expect(cache.del('rec:home:user1')).resolves.toBeUndefined();
    await expect(cache.reset()).resolves.toBeUndefined();
  });

  it('skips L2 completely when Upstash is already in degraded state', async () => {
    const l2 = {
      configured: true,
      degraded: true,
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    } as any;

    const cache = new TwoLevelCacheService(l1, l2, configFixture({}));
    const result = await cache.remember('k', async () => 'db-value');

    expect(result).toBe('db-value');
    expect(await cache.get('k')).toBe('db-value');
    expect(l2.get).not.toHaveBeenCalled();
    expect(l2.set).not.toHaveBeenCalled();
  });
});
