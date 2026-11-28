import { ApiError } from "./errors";

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = 5000,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try {
    const isRead = !init.method || ["GET", "HEAD"].includes(init.method.toUpperCase());
    const cache = isRead ? (init.cache ?? (init.next ? undefined : "no-store")) : "no-store";
    return await fetcher(input, { ...init, signal, cache, redirect: "error" });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(
      timeout.aborted ? 504 : 503,
      timeout.aborted ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
    );
  }
}
