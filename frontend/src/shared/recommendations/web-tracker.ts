"use client";

import {
  BehaviorBatchPayload,
  BehaviorLifecycleAdapter,
  BehaviorStorageAdapter,
  BehaviorTracker,
  BehaviorTransportAdapter,
  DEFAULT_DWELL_THRESHOLD_MS,
  TRACKER_STORAGE_KEYS,
} from "./behavior-tracker";

const fallbackMemoryStore = new Map<string, string>();

export function createWebStorageAdapter(): BehaviorStorageAdapter {
  return {
    getItem(key: string): string | null {
      if (typeof window !== "undefined") {
        try {
          if (typeof window.localStorage !== "undefined") {
            return window.localStorage.getItem(key);
          }
        } catch {
          // Ignore private-mode / sandbox errors
        }
      }
      return fallbackMemoryStore.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      if (typeof window !== "undefined") {
        try {
          if (typeof window.localStorage !== "undefined") {
            window.localStorage.setItem(key, value);
            return;
          }
        } catch {
          // Ignore quota / sandbox errors
        }
      }
      fallbackMemoryStore.set(key, value);
    },
    removeItem(key: string): void {
      if (typeof window !== "undefined") {
        try {
          if (typeof window.localStorage !== "undefined") {
            window.localStorage.removeItem(key);
          }
        } catch {
          // Ignore errors
        }
      }
      fallbackMemoryStore.delete(key);
    },
  };
}

export function createWebLifecycleAdapter(): BehaviorLifecycleAdapter {
  return {
    subscribe(onFlush) {
      if (typeof document === "undefined") {
        return () => {};
      }
      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          onFlush("hidden");
        }
      };
      const handlePageHide = () => {
        onFlush("hidden");
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      if (typeof window !== "undefined") {
        window.addEventListener("pagehide", handlePageHide);
      }
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (typeof window !== "undefined") {
          window.removeEventListener("pagehide", handlePageHide);
        }
      };
    },
  };
}

export function createWebTransportAdapter(
  endpoint = process.env.NEXT_PUBLIC_RECOMMENDATIONS_TRACKING_URL ||
    "/api/recommendations/events/batch",
): BehaviorTransportAdapter {
  return {
    async sendBatch(
      payload: BehaviorBatchPayload,
      options?: { keepalive?: boolean },
    ): Promise<void> {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        keepalive: Boolean(options?.keepalive),
      });
      if (!response.ok && response.status >= 500) {
        throw new Error(`TRACKING_HTTP_${response.status}`);
      }
    },
  };
}

let webTrackerSingleton: BehaviorTracker | null = null;

export function getWebBehaviorTracker(): BehaviorTracker {
  if (!webTrackerSingleton) {
    webTrackerSingleton = new BehaviorTracker({
      storage: createWebStorageAdapter(),
      transport: createWebTransportAdapter(),
      lifecycle: createWebLifecycleAdapter(),
    });
  }
  return webTrackerSingleton;
}

interface RecentWebView {
  productId: string;
  viewedAt: number;
  dwellMs: number;
}

const recentViewKey = TRACKER_STORAGE_KEYS.RECENT_VIEWS;

export function getRecentWebViews(): RecentWebView[] {
  const raw = createWebStorageAdapter().getItem(recentViewKey);
  if (typeof raw !== "string") return [];
  try {
    const views: RecentWebView[] = JSON.parse(raw);
    const now = Date.now();
    return views
      .filter(
        (view) =>
          view &&
          /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(view.productId) &&
          Number.isSafeInteger(view.viewedAt) &&
          view.viewedAt <= now &&
          now - view.viewedAt < 14 * 86_400_000 &&
          Number.isSafeInteger(view.dwellMs) &&
          view.dwellMs >= 0 &&
          view.dwellMs <= 60_000,
      )
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function trackWebProductVisit(productId: string, getVariantId: () => string | undefined) {
  const tracker = getWebBehaviorTracker();
  const storage = createWebStorageAdapter();
  const identityVersion = tracker.getIdentityVersion();
  let visibleSince = document.visibilityState === "visible" ? performance.now() : null;
  let elapsed = 0;
  let savedDwell = 0;
  let eventSent = false;

  const pause = () => {
    if (visibleSince !== null) elapsed += performance.now() - visibleSince;
    visibleSince = null;
  };
  const resume = () => {
    if (document.visibilityState === "visible" && visibleSince === null) {
      visibleSince = performance.now();
    }
  };
  const save = () => {
    if (identityVersion !== tracker.getIdentityVersion()) return;
    const dwellMs = Math.min(60_000, Math.round(elapsed));
    if (dwellMs < 250 || dwellMs === savedDwell) return;
    savedDwell = dwellMs;
    const views = [
      { productId, viewedAt: Date.now(), dwellMs },
      ...getRecentWebViews().filter((view) => view.productId !== productId),
    ].slice(0, 10);
    storage.setItem(recentViewKey, JSON.stringify(views));
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") resume();
    else {
      pause();
      save();
    }
  };
  const finish = (keepalive: boolean) => {
    pause();
    save();
    if (
      eventSent ||
      savedDwell < DEFAULT_DWELL_THRESHOLD_MS ||
      identityVersion !== tracker.getIdentityVersion()
    )
      return;
    eventSent = true;
    void tracker
      .trackProductView({ productId, variantId: getVariantId() }, savedDwell)
      .then(() => tracker.flush({ keepalive }));
  };
  const onPageHide = () => finish(true);

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", resume);
  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", resume);
    finish(false);
  };
}
