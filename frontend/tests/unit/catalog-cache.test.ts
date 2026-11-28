import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  entries: new Map<string, { value: unknown; expires: number }>(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache:
    (
      load: (...args: unknown[]) => Promise<unknown>,
      keys: string[],
      options: { revalidate: number },
    ) =>
    async (...args: unknown[]) => {
      const key = JSON.stringify([keys, args]);
      const hit = state.entries.get(key);
      if (hit && hit.expires > Date.now()) return hit.value;
      const value = await load(...args);
      state.entries.set(key, { value, expires: Date.now() + options.revalidate * 1000 });
      return value;
    },
  revalidateTag: vi.fn(() => state.entries.clear()),
}));
vi.mock("@/shared/auth/server", () => ({
  sessionId: vi.fn(async () => "valid-session"),
  authRuntime: () => ({
    broker: { session: async () => ({ accessToken: "staff-token", user: { roleName: "ADMIN" } }) },
  }),
}));

import {
  getBrands,
  getCategories,
  getProduct,
  getAvailability,
  getPromotions,
} from "@/features/catalog/server";
import { POST } from "@/app/api/admin/[...parts]/route";
import { revalidateTag } from "next/cache";

const envelope = (data: unknown) =>
  Response.json({
    statusCode: 200,
    success: true,
    message: "OK",
    timestamp: new Date().toISOString(),
    data,
  });
beforeEach(() => {
  state.entries.clear();
  vi.stubEnv("BACKEND_API_BASE_URL", "http://backend.test/api/v1");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("caches anonymous reference DTOs, separates backend origins, and strips extra fields", async () => {
  const fetcher = vi.fn(async () =>
    envelope([{ id: "brand", name: "Brand", slug: "brand", privateNote: "secret" }]),
  );
  vi.stubGlobal("fetch", fetcher);
  expect(await getBrands(100)).toEqual([{ id: "brand", name: "Brand", slug: "brand" }]);
  await getBrands(100);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]).toEqual([
    expect.any(String),
    expect.objectContaining({
      headers: { Accept: "application/json" },
      cache: "no-store",
    }),
  ]);
  vi.stubEnv("BACKEND_API_BASE_URL", "http://other-backend.test/api/v1");
  await getBrands(100);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("does not persist malformed reference responses or HTTP errors", async () => {
  const fetcher = vi.fn(async () => envelope({ invalid: true }));
  vi.stubGlobal("fetch", fetcher);
  await expect(getCategories()).rejects.toMatchObject({ status: 502 });
  await expect(getCategories()).rejects.toMatchObject({ status: 502 });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(state.entries.size).toBe(0);
});

it("reads price, availability and promotion changes on the next request without a shared cache", async () => {
  let price = 100;
  const fetcher = vi.fn(async (url: string) =>
    envelope(
      url.includes("/availability")
        ? []
        : url.includes("/promotions/")
          ? { items: [], total: 0, page: 1, limit: 12, serverTime: new Date().toISOString() }
          : { id: "p", categoryId: "c", name: "Product", slug: "product", basePrice: price },
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  expect((await getProduct("product")).basePrice).toBe(100);
  price = 120;
  expect((await getProduct("product")).basePrice).toBe(120);
  await getAvailability("p", "v");
  await getAvailability("p", "v");
  await getPromotions();
  await getPromotions();
  expect(fetcher).toHaveBeenCalledTimes(6);
  expect(state.entries.size).toBe(0);
});

it("invalidates reference data only after a successful authenticated admin mutation", async () => {
  const invalidate = vi.mocked(revalidateTag);
  invalidate.mockClear();
  const fetcher = vi.fn(async () => envelope([{ id: "b", name: "Old", slug: "b" }]));
  vi.stubGlobal("fetch", fetcher);
  await getBrands();
  fetcher.mockImplementation(async () => Response.json({ success: false }, { status: 403 }));
  const request = () =>
    new NextRequest("http://localhost:3001/api/admin/brands/b", {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    });
  await POST(request(), { params: Promise.resolve({ parts: ["brands", "b"] }) });
  expect(invalidate).not.toHaveBeenCalled();
  expect(state.entries.size).toBe(1);
  fetcher.mockImplementation(async () => Response.json({ success: true }));
  await POST(request(), { params: Promise.resolve({ parts: ["brands", "b"] }) });
  expect(invalidate).toHaveBeenCalledWith("catalog-reference", { expire: 0 });
  expect(state.entries.size).toBe(0);
});
