import { ApiError } from "./errors";

export function retryAfterMs(value: string | null, now = Date.now()): number {
  if (!value) return 0;
  if (/^\d+(\.\d+)?$/.test(value.trim())) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

// Only opt-in browser catalog GETs retry. SSR and all mutations fail promptly.
export function catalogRetry(count: number, error: unknown) {
  return count < 2 && error instanceof ApiError && [429, 502, 503, 504].includes(error.status);
}

export function catalogRetryDelay(attempt: number, error: unknown) {
  const minimum = error instanceof ApiError ? retryAfterMs(error.retryAfter) : 0;
  return Math.max(minimum, Math.min(1000 * 2 ** attempt, 30_000)) + Math.random() * 250;
}

export function pollingDelay(error: unknown, interval: number) {
  return error instanceof ApiError && error.status === 429
    ? Math.max(interval, retryAfterMs(error.retryAfter) || 60_000)
    : interval;
}
