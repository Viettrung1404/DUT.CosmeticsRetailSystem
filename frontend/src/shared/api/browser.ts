import { z } from "zod";
import { ApiError, normalizeApiError } from "./errors";
import { fetchWithTimeout } from "./transport";
import { retryAfterMs } from "./retry";

// Public catalog cooldowns contain no DTOs or user identifiers. Query changes must
// not bypass the same upstream handler's Retry-After period.
const catalogCooldowns = new Map<string, number>();

// BFF returns a projected DTO; only the server client unwraps the Nest envelope.
// Browser requests never carry upstream Bearer tokens or caller-selected upstream URLs.
export async function requestBff<T>(
  path: `/api/${string}`,
  schema: z.ZodType<T>,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    signal?: AbortSignal;
  } = {},
) {
  const url = new URL(path, window.location.origin);
  if (
    url.origin !== window.location.origin ||
    !url.pathname.startsWith("/api/") ||
    url.hash ||
    path.includes("\\")
  ) {
    throw new Error("Invalid BFF path");
  }
  const catalogRead =
    (!options.method || options.method === "GET") && url.pathname.startsWith("/api/catalog/");
  if (catalogRead) {
    const until = catalogCooldowns.get(url.pathname) ?? 0;
    if (until > Date.now()) {
      throw new ApiError(
        429,
        "HTTP_429",
        undefined,
        String(Math.ceil((until - Date.now()) / 1000)),
      );
    }
    catalogCooldowns.delete(url.pathname);
  }
  const response = await fetchWithTimeout(
    url.href,
    {
      method: options.method ?? "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      signal: options.signal,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    },
    20000,
  );
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = normalizeApiError(response, body);
    if (catalogRead && response.status === 429) {
      if (catalogCooldowns.size >= 100) catalogCooldowns.clear();
      catalogCooldowns.set(url.pathname, Date.now() + (retryAfterMs(error.retryAfter) || 60_000));
    }
    throw error;
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(502, "INVALID_RESPONSE");
  return parsed.data;
}
export function readBff<T>(path: `/api/${string}`, schema: z.ZodType<T>, signal?: AbortSignal) {
  return requestBff(path, schema, { signal });
}
