"use client";

import {
  BehaviorBatchPayload,
  BehaviorLifecycleAdapter,
  BehaviorStorageAdapter,
  BehaviorTracker,
  BehaviorTransportAdapter,
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
