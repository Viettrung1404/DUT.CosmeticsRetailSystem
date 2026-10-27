import { z } from "zod";
import { readApiResponse } from "./response";
import { fetchWithTimeout } from "./transport";

// BFF handlers are added in FE-01+. Never accept upstream URLs or browser Bearer tokens.
export async function readBff<T>(path: `/api/${string}`, schema: z.ZodType<T>, signal?: AbortSignal) {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/") || url.hash || path.includes("\\")) {
    throw new Error("Invalid BFF path");
  }
  const response = await fetchWithTimeout(url.href, {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  return readApiResponse(response, schema);
}
