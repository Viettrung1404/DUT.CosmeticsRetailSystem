import { z } from "zod";
import { ApiError, normalizeApiError } from "./errors";
import { fetchWithTimeout } from "./transport";

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
  if (!response.ok) throw normalizeApiError(response, body);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(502, "INVALID_RESPONSE");
  return parsed.data;
}
export function readBff<T>(path: `/api/${string}`, schema: z.ZodType<T>, signal?: AbortSignal) {
  return requestBff(path, schema, { signal });
}
