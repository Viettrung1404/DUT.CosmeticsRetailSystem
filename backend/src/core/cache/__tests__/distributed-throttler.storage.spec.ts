import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { configFixture } from '../../../../test/support/config';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import {
  DistributedThrottlerStorage,
  IN_MEMORY_KEY_PREFIX,
  IN_MEMORY_THROTTLER_NAME,
  THROTTLE_SCRIPT,
} from '../distributed-throttler.storage';
import { THROTTLE_STORAGE_MODE_KEY } from '../throttle-storage.decorator';
import { TieredThrottlerGuard } from '../tiered-throttler.guard';
describe('Distributed throttler storage', () => {
  it('uses atomic Redis script, same keys across instances and millisecond-to-second expiry conversion', async () => {
    const command = jest.fn().mockResolvedValue([6, 12500, 8000]);
    const redis = { configured: true, command };
    const config = configFixture({ REDIS_KEY_PREFIX: 'unit:s6:' });
    const a = new DistributedThrottlerStorage(redis as any, config),
      b = new DistributedThrottlerStorage(redis as any, config);
    const result = await a.increment('user-private-value', 60000, 5, 8000, 'default');
    await b.increment('user-private-value', 60000, 5, 8000, 'default');
    expect(result).toEqual({
      totalHits: 6,
      timeToExpire: 13,
      isBlocked: true,
      timeToBlockExpire: 8,
    });
    expect(command.mock.calls[0]).toEqual(command.mock.calls[1]);
    expect(command.mock.calls[0][0]).toEqual([
      'EVAL',
      THROTTLE_SCRIPT,
      2,
      expect.stringMatching(/^unit:s6:throttle:\{[a-f0-9]+\}$/),
      expect.stringMatching(/:block$/),
      60000,
      5,
      8000,
    ]);
    expect(command.mock.calls[0][0][3]).not.toContain('user-private-value');
  });
  it('does not silently fall back when Redis fails or production has no distributed store', async () => {
    const config = {
      get: (key: string) => (key === 'NODE_ENV' ? 'production' : undefined),
    } as ConfigService;
    await expect(
      new DistributedThrottlerStorage({ configured: false } as any, config).increment(
        'a',
        1000,
        1,
        1000,
        'default',
      ),
    ).rejects.toThrow('RATE_LIMIT_STORE_REQUIRED');
    await expect(
      new DistributedThrottlerStorage(
        {
          configured: true,
          command: jest.fn().mockRejectedValue(new Error('redis down')),
        } as any,
        config,
      ).increment('a', 1000, 1, 1000, 'default'),
    ).rejects.toThrow('redis down');
  });

  it('routes memory throttler name or mem: keys to in-memory storage with zero Redis commands even in production', async () => {
    const command = jest.fn();
    const config = {
      get: (key: string) => (key === 'NODE_ENV' ? 'production' : undefined),
    } as ConfigService;
    const storage = new DistributedThrottlerStorage(
      { configured: true, command } as any,
      config,
    );

    const r1 = await storage.increment(
      `${IN_MEMORY_KEY_PREFIX}public-get-key`,
      60000,
      2,
      60000,
      'default',
    );
    const r2 = await storage.increment(
      `${IN_MEMORY_KEY_PREFIX}public-get-key`,
      60000,
      2,
      60000,
      'default',
    );
    const r3 = await storage.increment(
      'direct-memory-throttler',
      60000,
      1,
      60000,
      IN_MEMORY_THROTTLER_NAME,
    );

    expect(r1.totalHits).toBe(1);
    expect(r2.totalHits).toBe(2);
    expect(r3.totalHits).toBe(1);
    expect(command).not.toHaveBeenCalled();
    storage.onModuleDestroy();
  });
});

describe('TieredThrottlerGuard routing', () => {
  const createContext = (opts: {
    method: string;
    path: string;
    isPublic?: boolean;
    explicitMode?: 'memory' | 'redis';
  }) => {
    const handler = function handler() {};
    const classRef = class TestController {};
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return opts.isPublic;
        if (key === THROTTLE_STORAGE_MODE_KEY) return opts.explicitMode;
        return undefined;
      }),
    } as unknown as Reflector;

    const context = {
      getHandler: () => handler,
      getClass: () => classRef,
      switchToHttp: () => ({
        getRequest: () => ({ method: opts.method, path: opts.path }),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    return { context, reflector };
  };

  it('routes lightweight public GET endpoints to memory and keeps sensitive/mutation routes on Redis', () => {
    const storage = { increment: jest.fn() } as any;

    const publicCatalog = createContext({
      method: 'GET',
      path: '/api/v1/customer/products',
      isPublic: true,
    });
    const guard1 = new TieredThrottlerGuard(
      [{ ttl: 60000, limit: 100 }],
      storage,
      publicCatalog.reflector,
      configFixture({}),
    );
    expect(guard1.resolveStorageMode(publicCatalog.context)).toBe('memory');
    expect(
      (guard1 as any).generateKey(publicCatalog.context, '1.2.3.4', 'default'),
    ).toMatch(/^mem:/);

    // Sensitive public GET routes stay on Redis
    for (const sensitivePath of [
      '/api/v1/guest/orders/123',
      '/api/v1/payments/123/status',
      '/api/v1/auth/oauth/google',
    ]) {
      const ctx = createContext({
        method: 'GET',
        path: sensitivePath,
        isPublic: true,
      });
      const g = new TieredThrottlerGuard(
        [{ ttl: 60000, limit: 100 }],
        storage,
        ctx.reflector,
        configFixture({}),
      );
      expect(g.resolveStorageMode(ctx.context)).toBe('redis');
    }

    // Public POST (login, checkout, cart) stays on Redis
    const publicPost = createContext({
      method: 'POST',
      path: '/api/v1/auth/login',
      isPublic: true,
    });
    const guardPost = new TieredThrottlerGuard(
      [{ ttl: 60000, limit: 5 }],
      storage,
      publicPost.reflector,
      configFixture({}),
    );
    expect(guardPost.resolveStorageMode(publicPost.context)).toBe('redis');

    // Authenticated GET stays on Redis unless explicitly decorated
    const authGet = createContext({
      method: 'GET',
      path: '/api/v1/customers/me/orders',
      isPublic: false,
    });
    const guardAuth = new TieredThrottlerGuard(
      [{ ttl: 60000, limit: 100 }],
      storage,
      authGet.reflector,
      configFixture({}),
    );
    expect(guardAuth.resolveStorageMode(authGet.context)).toBe('redis');

    // Explicit @UseInMemoryThrottle() overrides even sensitive path / authenticated GET
    const explicitMem = createContext({
      method: 'GET',
      path: '/api/v1/payments/methods',
      isPublic: true,
      explicitMode: 'memory',
    });
    const guardExplicit = new TieredThrottlerGuard(
      [{ ttl: 60000, limit: 100 }],
      storage,
      explicitMem.reflector,
      configFixture({}),
    );
    expect(guardExplicit.resolveStorageMode(explicitMem.context)).toBe('memory');

    // THROTTLE_PUBLIC_GET_IN_MEMORY=false disables automatic memory routing
    const guardDisabled = new TieredThrottlerGuard(
      [{ ttl: 60000, limit: 100 }],
      storage,
      publicCatalog.reflector,
      configFixture({ THROTTLE_PUBLIC_GET_IN_MEMORY: 'false' }),
    );
    expect(guardDisabled.resolveStorageMode(publicCatalog.context)).toBe('redis');
  });
});
