import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/features/catalog/server", () => ({
  getProducts: vi.fn(),
  getSuggestions: vi.fn(),
  getSearchHints: vi.fn(),
  getAvailability: vi.fn(),
}));
import { ApiError } from "@/shared/api/errors";
import * as catalog from "@/features/catalog/server";
import { GET as products } from "@/app/api/catalog/products/route";
import { GET as suggest } from "@/app/api/catalog/suggest/route";
import { GET as hints } from "@/app/api/catalog/search-hints/route";
import { GET as availability } from "@/app/api/catalog/availability/route";
import { GET as history, POST as saveHistory } from "@/app/api/catalog/search-history/route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("preserves 429 and Retry-After through every catalog BFF read route", async () => {
  const error = new ApiError(429, "HTTP_429", undefined, "Fri, 27 Nov 2026 10:00:50 GMT");
  for (const loader of [catalog.getProducts, catalog.getSuggestions, catalog.getSearchHints, catalog.getAvailability]) vi.mocked(loader).mockRejectedValue(error);
  const uuid = "00000000-0000-4000-8000-000000000001";
  for (const [handler, query] of [
    [products, ""],
    [suggest, "?q=serum"],
    [hints, "?q=serum"],
    [availability, `?productId=${uuid}&variantId=${uuid}`],
  ] as const) {
    const response = await handler(new Request(`http://localhost:3001/api/catalog/test${query}`));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe(error.retryAfter);
    expect(response.headers.get("cache-control")).toContain("no-store");
  }
});

it("does not turn search history read/write 429 into a successful response or retry writes", async () => {
  vi.stubEnv("BACKEND_API_BASE_URL", "http://backend.test/api/v1");
  const fetcher = vi.fn(async () =>
    Response.json({ code: "HTTP_429" }, { status: 429, headers: { "Retry-After": "45" } }),
  );
  vi.stubGlobal("fetch", fetcher);
  for (const response of [
    await history(),
    await saveHistory(
      new Request("http://localhost:3001/api/catalog/search-history", {
        method: "POST",
        body: JSON.stringify({ query: "serum" }),
      }),
    ),
  ]) {
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("45");
  }
  expect(fetcher).toHaveBeenCalledTimes(2);
});
