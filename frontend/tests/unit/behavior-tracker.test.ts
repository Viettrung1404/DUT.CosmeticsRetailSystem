import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BehaviorTracker,
  type BehaviorBatchPayload,
  type BehaviorStorageAdapter,
} from "@/shared/recommendations/behavior-tracker";

function createMemoryStorage(): BehaviorStorageAdapter & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

describe("Web BehaviorTracker (Adapter Pattern)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("auto-generates UUID v4 anonymousId, batches events, and flushes at batch size 10 or 10s interval", async () => {
    const storage = createMemoryStorage();
    const sent: BehaviorBatchPayload[] = [];
    const tracker = new BehaviorTracker({
      storage,
      transport: {
        sendBatch: async (payload) => {
          sent.push(payload);
        },
      },
      maxBatchSize: 10,
      flushIntervalMs: 10_000,
    });

    const anonId = await tracker.getAnonymousId();
    expect(anonId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    // 9 events -> buffered, not sent yet
    for (let i = 0; i < 9; i++) {
      const ev = await tracker.trackEvent({
        eventType: "SEARCH_CLICK",
        productId: `prod-${i}`,
      });
      expect(ev.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
    expect(sent).toHaveLength(0);

    // 10th event -> immediate flush
    await tracker.trackEvent({ eventType: "ADD_TO_WISHLIST", productId: "prod-9" });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.events).toHaveLength(10);
    expect(sent[0]!.anonymousId).toBe(anonId);

    // Timer flush after 10s
    await tracker.trackEvent({ eventType: "SEARCH_QUERY", metadata: { query: "serum" } });
    expect(sent).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sent).toHaveLength(2);
    expect(sent[1]!.events[0]!.eventType).toBe("SEARCH_QUERY");

    tracker.destroy();
  });

  it("enforces >= 4s dwell time and 5-minute VIEW_PRODUCT deduplication, while tracking max 5 recentIds", async () => {
    let now = 1_700_000_000_000;
    const storage = createMemoryStorage();
    const sent: BehaviorBatchPayload[] = [];
    const tracker = new BehaviorTracker({
      storage,
      transport: {
        sendBatch: async (p) => {
          sent.push(p);
        },
      },
      now: () => now,
    });

    // < 4s dwell is ignored
    expect(await tracker.trackProductView({ productId: "p1" }, 2500)).toBe(false);
    expect(tracker.getPendingCount()).toBe(0);

    // >= 4s dwell is recorded
    expect(await tracker.trackProductView({ productId: "p1" }, 4500)).toBe(true);
    expect(tracker.getPendingCount()).toBe(1);

    // Duplicate view within 5 minutes is deduped
    now += 2 * 60 * 1000;
    expect(await tracker.trackProductView({ productId: "p1" }, 5000)).toBe(false);
    expect(tracker.getPendingCount()).toBe(1);

    // After 5 minutes, allowed again
    now += 4 * 60 * 1000;
    expect(await tracker.trackProductView({ productId: "p1" }, 5000)).toBe(true);
    expect(tracker.getPendingCount()).toBe(2);

    // Recent IDs capped at 5, newest first
    for (const id of ["p2", "p3", "p4", "p5", "p6"]) {
      await tracker.recordRecentProduct(id);
    }
    expect(await tracker.getRecentIds()).toEqual(["p6", "p5", "p4", "p3", "p2"]);

    tracker.destroy();
  });

  it("stores 24h attribution from ?ref=rec_* and expires after 24h", async () => {
    let now = 1_700_000_000_000;
    const storage = createMemoryStorage();
    const tracker = new BehaviorTracker({
      storage,
      transport: { sendBatch: async () => {} },
      now: () => now,
    });

    const captured = await tracker.captureAttributionFromQuery(
      "prod-1",
      "?ref=rec_similar&utm_source=web",
    );
    expect(captured).toBe("rec_similar");
    expect(await tracker.getAttribution("prod-1")).toBe("rec_similar");

    // Non-rec ref is ignored
    expect(
      await tracker.captureAttributionFromQuery("prod-2", "?ref=newsletter"),
    ).toBeNull();

    // Expires after 24 hours
    now += 24 * 60 * 60 * 1000 + 1;
    expect(await tracker.getAttribution("prod-1")).toBeNull();

    tracker.destroy();
  });

  it("flushes with keepalive on lifecycle hidden and generates new anonymousId on logout", async () => {
    const storage = createMemoryStorage();
    const calls: Array<{ payload: BehaviorBatchPayload; keepalive?: boolean }> = [];
    let triggerLifecycle: ((reason: "hidden" | "background") => void) | undefined;

    const tracker = new BehaviorTracker({
      storage,
      transport: {
        sendBatch: async (payload, options) => {
          calls.push({ payload, keepalive: options?.keepalive });
        },
      },
      lifecycle: {
        subscribe: (cb) => {
          triggerLifecycle = cb;
          return () => {
            triggerLifecycle = undefined;
          };
        },
      },
    });

    const firstAnonId = await tracker.getAnonymousId();
    await tracker.recordRecentProduct("prod-1");
    await tracker.recordAttribution("prod-1", "rec_home");
    await tracker.trackEvent({ eventType: "TRY_ON_COLOR", productId: "prod-1" });

    (triggerLifecycle as ((reason: "hidden" | "background") => void) | undefined)?.("hidden");
    await Promise.resolve();
    await Promise.resolve();

    expect(calls).toHaveLength(1);
    expect(calls[0]!.keepalive).toBe(true);
    expect(calls[0]!.payload.anonymousId).toBe(firstAnonId);

    const nextAnonId = await tracker.resetAnonymousIdOnLogout();
    expect(nextAnonId).not.toBe(firstAnonId);
    expect(await tracker.getAnonymousId()).toBe(nextAnonId);
    expect(await tracker.getRecentIds()).toEqual([]);
    expect(await tracker.getAttribution("prod-1")).toBeNull();

    tracker.destroy();
  });
});
