import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => {}),
  deleteItemAsync: vi.fn(async () => {}),
}));

import {
  BehaviorTracker,
  type BehaviorBatchPayload,
  type BehaviorStorageAdapter,
} from '@/services/behaviorTracker';

function createMemoryStorage(): BehaviorStorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => {
      map.set(k, v);
    },
    removeItem: async (k) => {
      map.delete(k);
    },
  };
}

describe('Mobile Expo BehaviorTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('batches events, deduplicates VIEW_PRODUCT within 5 minutes, and flushes on background AppState', async () => {
    const storage = createMemoryStorage();
    const sent: BehaviorBatchPayload[] = [];
    let onBackground: ((reason: 'hidden' | 'background') => void) | undefined;
    let now = 1_700_000_000_000;

    const tracker = new BehaviorTracker({
      storage,
      transport: {
        sendBatch: async (payload) => {
          sent.push(payload);
        },
      },
      lifecycle: {
        subscribe: (cb) => {
          onBackground = cb;
          return () => {
            onBackground = undefined;
          };
        },
      },
      now: () => now,
    });

    const anon1 = await tracker.getAnonymousId();
    expect(await tracker.trackProductView({ productId: 'prod-1' }, 4200)).toBe(true);
    expect(await tracker.trackProductView({ productId: 'prod-1' }, 5000)).toBe(false);

    now += 5 * 60 * 1000 + 1;
    expect(await tracker.trackProductView({ productId: 'prod-1' }, 4000)).toBe(true);
    expect(tracker.getPendingCount()).toBe(2);

    (onBackground as ((reason: 'hidden' | 'background') => void) | undefined)?.('background');
    await Promise.resolve();
    await Promise.resolve();

    expect(sent).toHaveLength(1);
    expect(sent[0].events).toHaveLength(2);
    expect(sent[0].anonymousId).toBe(anon1);

    const anon2 = await tracker.resetAnonymousIdOnLogout();
    expect(anon2).not.toBe(anon1);

    tracker.destroy();
  });
});


describe('Tracking batch retry identity', () => {
  it('reuses the whole failed impression batch and gives subsequent views a fresh ID', async () => {
    const attempts: BehaviorBatchPayload[] = [];
    let fail = true;
    const tracker = new BehaviorTracker({ storage: createMemoryStorage(), transport: {
      sendBatch: async (payload) => {
        attempts.push(payload);
        if (fail) throw new Error('temporary network failure');
      },
    } });
    try {
      tracker.trackImpression('HOME', 1);
      await tracker.flush();
      tracker.trackImpression('HOME', 1);
      fail = false;
      await tracker.flush();
      await tracker.flush();
      expect(attempts).toHaveLength(3);
      expect(attempts[0]).toEqual(attempts[1]);
      expect(attempts[0]!.batchId).toBeTruthy();
      expect(attempts[2]!.batchId).not.toBe(attempts[0]!.batchId);
      expect(attempts[2]!.impressions).toEqual([{ placement: 'HOME', count: 1 }]);
    } finally { tracker.destroy(); }
  });
});
