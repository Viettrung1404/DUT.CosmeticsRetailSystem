export type ClientBehaviorEventType =
  | 'VIEW_PRODUCT'
  | 'SEARCH_QUERY'
  | 'SEARCH_CLICK'
  | 'TRY_ON_COLOR'
  | 'ADD_TO_WISHLIST';

export type RecommendationPlacement =
  | 'HOME'
  | 'PRODUCT_SIMILAR'
  | 'PRODUCT_BOUGHT_TOGETHER'
  | 'CART_ROUTINE';

export interface BehaviorEventInput {
  eventType: ClientBehaviorEventType;
  productId?: string;
  variantId?: string;
  categoryId?: string;
  brandId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface QueuedBehaviorEvent extends BehaviorEventInput {
  id: string;
}

export interface ImpressionInput {
  placement: RecommendationPlacement;
  count: number;
}

export interface BehaviorBatchPayload {
  batchId?: string;
  anonymousId: string;
  events: QueuedBehaviorEvent[];
  impressions?: ImpressionInput[];
}

export interface AttributionRecord {
  source: string;
  expiresAt: number;
}

export interface BehaviorStorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export interface BehaviorTransportAdapter {
  sendBatch(
    payload: BehaviorBatchPayload,
    options?: { keepalive?: boolean },
  ): Promise<void>;
}

export interface BehaviorLifecycleAdapter {
  subscribe(onFlush: (reason: 'hidden' | 'background') => void): () => void;
}

export interface BehaviorTrackerOptions {
  storage: BehaviorStorageAdapter;
  transport: BehaviorTransportAdapter;
  lifecycle?: BehaviorLifecycleAdapter;
  maxBatchSize?: number;
  flushIntervalMs?: number;
  viewDedupeTtlMs?: number;
  dwellThresholdMs?: number;
  attributionTtlMs?: number;
  maxRecentIds?: number;
  now?: () => number;
  generateUuid?: () => string;
}

export const TRACKER_STORAGE_KEYS = {
  ANONYMOUS_ID: 'glowup_rec_anonymous_id',
  RECENT_IDS: 'glowup_rec_recent_ids',
  ATTRIBUTION_MAP: 'glowup_rec_attribution',
} as const;

export const DEFAULT_MAX_BATCH_SIZE = 10;
export const DEFAULT_FLUSH_INTERVAL_MS = 10_000;
export const DEFAULT_VIEW_DEDUPE_TTL_MS = 5 * 60 * 1000;
export const DEFAULT_DWELL_THRESHOLD_MS = 4_000;
export const DEFAULT_ATTRIBUTION_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_MAX_RECENT_IDS = 5;

export function generateUuidV4(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class BehaviorTracker {
  private readonly storage: BehaviorStorageAdapter;
  private readonly transport: BehaviorTransportAdapter;
  private readonly maxBatchSize: number;
  private readonly flushIntervalMs: number;
  private readonly viewDedupeTtlMs: number;
  private readonly dwellThresholdMs: number;
  private readonly attributionTtlMs: number;
  private readonly maxRecentIds: number;
  private readonly now: () => number;
  private readonly generateUuid: () => string;

  private eventQueue: QueuedBehaviorEvent[] = [];
  private impressionMap = new Map<RecommendationPlacement, number>();
  private viewDedupeMap = new Map<string, number>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeLifecycle: (() => void) | null = null;
  private cachedAnonymousId: string | null = null;
  private flushing = false;
  private pendingBatch: BehaviorBatchPayload | null = null;

  constructor(options: BehaviorTrackerOptions) {
    this.storage = options.storage;
    this.transport = options.transport;
    this.maxBatchSize = options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE;
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.viewDedupeTtlMs = options.viewDedupeTtlMs ?? DEFAULT_VIEW_DEDUPE_TTL_MS;
    this.dwellThresholdMs = options.dwellThresholdMs ?? DEFAULT_DWELL_THRESHOLD_MS;
    this.attributionTtlMs = options.attributionTtlMs ?? DEFAULT_ATTRIBUTION_TTL_MS;
    this.maxRecentIds = options.maxRecentIds ?? DEFAULT_MAX_RECENT_IDS;
    this.now = options.now ?? (() => Date.now());
    this.generateUuid = options.generateUuid ?? generateUuidV4;

    if (options.lifecycle) {
      this.unsubscribeLifecycle = options.lifecycle.subscribe(() => {
        void this.flush();
      });
    }
  }

  async getAnonymousId(): Promise<string> {
    if (this.cachedAnonymousId) {
      return this.cachedAnonymousId;
    }

    const stored = await this.storage.getItem(TRACKER_STORAGE_KEYS.ANONYMOUS_ID);
    if (stored && stored.trim()) {
      this.cachedAnonymousId = stored.trim();
      return this.cachedAnonymousId;
    }

    const fresh = this.generateUuid();
    this.cachedAnonymousId = fresh;
    await this.storage.setItem(TRACKER_STORAGE_KEYS.ANONYMOUS_ID, fresh);
    return fresh;
  }

  async resetAnonymousIdOnLogout(): Promise<string> {
    await this.flush();
    this.clearFlushTimer();
    this.eventQueue = [];
    this.pendingBatch = null;
    this.impressionMap.clear();
    this.viewDedupeMap.clear();

    await this.storage.removeItem(TRACKER_STORAGE_KEYS.RECENT_IDS);
    await this.storage.removeItem(TRACKER_STORAGE_KEYS.ATTRIBUTION_MAP);

    const nextId = this.generateUuid();
    this.cachedAnonymousId = nextId;
    await this.storage.setItem(TRACKER_STORAGE_KEYS.ANONYMOUS_ID, nextId);
    return nextId;
  }

  async getRecentIds(): Promise<string[]> {
    const raw = await this.storage.getItem(TRACKER_STORAGE_KEYS.RECENT_IDS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string').slice(0, this.maxRecentIds)
        : [];
    } catch {
      return [];
    }
  }

  async recordRecentProduct(productId: string): Promise<string[]> {
    if (!productId) return this.getRecentIds();
    const current = await this.getRecentIds();
    const next = [productId, ...current.filter((id) => id !== productId)].slice(
      0,
      this.maxRecentIds,
    );
    await this.storage.setItem(TRACKER_STORAGE_KEYS.RECENT_IDS, JSON.stringify(next));
    return next;
  }

  private async readAttributionMap(): Promise<Record<string, AttributionRecord>> {
    const raw = await this.storage.getItem(TRACKER_STORAGE_KEYS.ATTRIBUTION_MAP);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as Record<string, AttributionRecord>;
      if (!parsed || typeof parsed !== 'object') return {};
      const currentTime = this.now();
      const cleaned: Record<string, AttributionRecord> = {};
      let pruned = false;

      for (const [productId, record] of Object.entries(parsed)) {
        if (
          record &&
          typeof record.source === 'string' &&
          typeof record.expiresAt === 'number' &&
          record.expiresAt > currentTime
        ) {
          cleaned[productId] = record;
        } else {
          pruned = true;
        }
      }

      if (pruned) {
        await this.storage.setItem(
          TRACKER_STORAGE_KEYS.ATTRIBUTION_MAP,
          JSON.stringify(cleaned),
        );
      }
      return cleaned;
    } catch {
      return {};
    }
  }

  async recordAttribution(
    productId: string,
    source: string,
    ttlMs = this.attributionTtlMs,
  ): Promise<void> {
    if (!productId || !source) return;
    const map = await this.readAttributionMap();
    map[productId] = { source, expiresAt: this.now() + ttlMs };
    await this.storage.setItem(
      TRACKER_STORAGE_KEYS.ATTRIBUTION_MAP,
      JSON.stringify(map),
    );
  }

  async getAttribution(productId: string): Promise<string | null> {
    if (!productId) return null;
    const map = await this.readAttributionMap();
    return map[productId]?.source ?? null;
  }

  async trackEvent(input: BehaviorEventInput): Promise<QueuedBehaviorEvent> {
    const queued: QueuedBehaviorEvent = { ...input, id: this.generateUuid() };
    if (this.eventQueue.length < 50) this.eventQueue.push(queued);

    if (this.eventQueue.length >= this.maxBatchSize) {
      await this.flush();
    } else {
      this.scheduleFlush();
    }

    return queued;
  }

  async trackProductView(
    product: {
      productId: string;
      variantId?: string;
      categoryId?: string;
      brandId?: string;
      source?: string;
    },
    dwellMs = this.dwellThresholdMs,
  ): Promise<boolean> {
    if (!product.productId) return false;
    await this.recordRecentProduct(product.productId);

    if (dwellMs < this.dwellThresholdMs) {
      return false;
    }

    const currentTime = this.now();
    const dedupeUntil = this.viewDedupeMap.get(product.productId) ?? 0;
    if (dedupeUntil > currentTime) {
      return false;
    }

    this.viewDedupeMap.set(product.productId, currentTime + this.viewDedupeTtlMs);
    await this.trackEvent({
      eventType: 'VIEW_PRODUCT',
      productId: product.productId,
      variantId: product.variantId,
      categoryId: product.categoryId,
      brandId: product.brandId,
      source: product.source,
      metadata: { dwellMs },
    });
    return true;
  }

  startProductViewTimer(
    product: {
      productId: string;
      variantId?: string;
      categoryId?: string;
      brandId?: string;
      source?: string;
    },
    onTracked?: (tracked: boolean) => void,
  ): () => void {
    const timer = setTimeout(() => {
      void this.trackProductView(product, this.dwellThresholdMs).then((ok) => {
        onTracked?.(ok);
      });
    }, this.dwellThresholdMs);

    return () => clearTimeout(timer);
  }

  trackImpression(placement: RecommendationPlacement, count = 1): void {
    if (count <= 0) return;
    this.impressionMap.set(placement, (this.impressionMap.get(placement) ?? 0) + count);
    this.scheduleFlush();
  }

  getPendingCount(): number {
    return this.eventQueue.length + (this.pendingBatch?.events.length ?? 0);
  }

  async flush(): Promise<void> {
    this.clearFlushTimer();
    if (this.flushing) return;
    if (!this.pendingBatch && this.eventQueue.length === 0 && this.impressionMap.size === 0) {
      return;
    }

    this.flushing = true;
    try {
      if (!this.pendingBatch) {
        const anonymousId = await this.getAnonymousId();
        const events = this.eventQueue.splice(0, 50);
        const impressions = Array.from(this.impressionMap.entries())
          .map(([placement, count]) => ({ placement, count }));
        this.impressionMap.clear();
        this.pendingBatch = {
          batchId: this.generateUuid(),
          anonymousId,
          events,
          ...(impressions.length ? { impressions } : {}),
        };
      }
      await this.transport.sendBatch(this.pendingBatch);
      this.pendingBatch = null;
    } catch {
      // Keep exactly the same payload and ID for retry, including impressions-only batches.
    } finally {
      this.flushing = false;
      if (this.pendingBatch || this.eventQueue.length || this.impressionMap.size) {
        this.scheduleFlush();
      }
    }
  }

  destroy(): void {
    this.clearFlushTimer();
    this.unsubscribeLifecycle?.();
    this.unsubscribeLifecycle = null;
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, this.flushIntervalMs);
  }

  private clearFlushTimer(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

const memoryFallback = new Map<string, string>();

async function loadSecureStore(): Promise<{
  getItemAsync: (k: string) => Promise<string | null>;
  setItemAsync: (k: string, v: string) => Promise<void>;
  deleteItemAsync: (k: string) => Promise<void>;
} | null> {
  try {
    return await import('../utils/secureStore');
  } catch {
    return null;
  }
}

export function createExpoStorageAdapter(): BehaviorStorageAdapter {
  return {
    getItem: async (key) => {
      const store = await loadSecureStore();
      if (store) return store.getItemAsync(key);
      return memoryFallback.get(key) ?? null;
    },
    setItem: async (key, value) => {
      const store = await loadSecureStore();
      if (store) return store.setItemAsync(key, value);
      memoryFallback.set(key, value);
    },
    removeItem: async (key) => {
      const store = await loadSecureStore();
      if (store) return store.deleteItemAsync(key);
      memoryFallback.delete(key);
    },
  };
}

export function createExpoLifecycleAdapter(): BehaviorLifecycleAdapter {
  return {
    subscribe(onFlush) {
      try {
        // Lazy require so Node/Vitest unit tests without RN runtime do not crash on import
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { AppState } = require('react-native') as {
          AppState?: {
            addEventListener?: (
              event: string,
              handler: (state: string) => void,
            ) => { remove?: () => void };
          };
        };
        if (!AppState?.addEventListener) {
          return () => {};
        }
        const sub = AppState.addEventListener('change', (nextState: string) => {
          if (nextState === 'background' || nextState === 'inactive') {
            onFlush('background');
          }
        });
        return () => {
          sub?.remove?.();
        };
      } catch {
        return () => {};
      }
    },
  };
}

export function createExpoTransportAdapter(): BehaviorTransportAdapter {
  return {
    async sendBatch(payload: BehaviorBatchPayload): Promise<void> {
      const { default: apiClient } = await import('../api/apiClient');
      await apiClient.post('/recommendations/events/batch', payload);
    },
  };
}

let mobileTrackerSingleton: BehaviorTracker | null = null;

export function getMobileBehaviorTracker(): BehaviorTracker {
  if (!mobileTrackerSingleton) {
    mobileTrackerSingleton = new BehaviorTracker({
      storage: createExpoStorageAdapter(),
      transport: createExpoTransportAdapter(),
      lifecycle: createExpoLifecycleAdapter(),
    });
  }
  return mobileTrackerSingleton;
}
