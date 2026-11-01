import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/shared/api/errors";

vi.mock("server-only", () => ({}));
const fixture = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  records: new Map<string, unknown>(),
  getProduct: vi.fn(),
  write: vi.fn(),
  upstream: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      fixture.cookies.has(name) ? { value: fixture.cookies.get(name) } : undefined,
    set: (name: string, value: string) => fixture.cookies.set(name, value),
    delete: (name: string) => fixture.cookies.delete(name),
  }),
}));
vi.mock("@/features/catalog/server", () => ({ getProduct: fixture.getProduct }));
vi.mock("@/shared/auth/server", () => ({
  authRuntime: () => ({ broker: { write: fixture.write } }),
  cookieOptions: () => ({ httpOnly: true }),
  upstream: fixture.upstream,
}));
vi.mock("@/shared/auth/store", async (original) => ({
  ...(await original<typeof import("@/shared/auth/store")>()),
  createRedisStore: () => ({
    get: async (key: string) => fixture.records.get(key) ?? null,
    create: async (key: string, value: unknown) => {
      fixture.records.set(key, value);
    },
    remove: async (key: string) => {
      fixture.records.delete(key);
    },
    lock: async () => true,
    release: async () => {},
    cas: async (key: string, _owner: string, version: number, value: unknown) => {
      const current = fixture.records.get(key) as { version: number } | undefined;
      if (current?.version !== version) return false;
      fixture.records.set(key, value);
      return true;
    },
  }),
}));

import { changeGuestWishlist, listGuestWishlist, mergeGuestWishlist } from "@/shared/auth/wishlist";

describe("guest wishlist", () => {
  const product = { id: randomUUID(), slug: "test-product", name: "Test product" };

  beforeEach(() => {
    fixture.cookies.clear();
    fixture.records.clear();
    vi.clearAllMocks();
    fixture.getProduct.mockResolvedValue(product);
    fixture.write.mockImplementation(async (_session, operation) => operation("access-token"));
    fixture.upstream.mockResolvedValue({ productId: product.id, isWishlisted: true });
  });

  it("saves a validated product for a guest and lists it", async () => {
    fixture.getProduct.mockResolvedValueOnce({ ...product, id: randomUUID() });
    await expect(changeGuestWishlist(product.id, "other-product", true)).rejects.toMatchObject({
      status: 400,
    });
    expect(fixture.cookies.size).toBe(0);

    await expect(changeGuestWishlist(product.id, product.slug, true)).resolves.toEqual({
      productId: product.id,
      isWishlisted: true,
    });
    expect((await listGuestWishlist(1, 10)).items).toMatchObject([
      { id: product.id, isWishlisted: true },
    ]);
  });

  it("keeps the guest list when merge fails, then clears it after retry", async () => {
    await changeGuestWishlist(product.id, product.slug, true);
    fixture.upstream.mockRejectedValueOnce(new ApiError(503, "BACKEND_UNAVAILABLE"));

    expect(await mergeGuestWishlist("session")).toBe("pending");
    expect(fixture.cookies.size).toBe(1);
    expect(fixture.records.size).toBe(1);

    expect(await mergeGuestWishlist("session")).toBe("merged");
    expect(fixture.upstream).toHaveBeenCalledWith(
      `/wishlists/${product.id}`,
      expect.anything(),
      { selected: true },
      "access-token",
      "PUT",
      { "Idempotency-Key": expect.any(String) },
    );
    expect(fixture.cookies.size).toBe(0);
    expect(fixture.records.size).toBe(0);
  });
});
