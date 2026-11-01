import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { ApiError } from "@/shared/api/errors";
import { getProduct } from "@/features/catalog/server";
import { authRuntime, cookieOptions, upstream } from "./server";
import { userSchema } from "./contracts";
import { createRedisStore, opaqueId, validId } from "./store";

const guestCookie = () =>
  process.env.NODE_ENV === "production" ? "__Host-glowup-guest-wishlist" : "glowup-guest-wishlist";
const guestSchema = z.object({
  items: z.array(z.object({ id: z.uuid(), slug: z.string() })).max(30),
  version: z.number().int().nonnegative(),
  expiresAt: z.number(),
});
type GuestWishlist = z.infer<typeof guestSchema>;
const resultSchema = z.object({ productId: z.uuid(), isWishlisted: z.boolean() });
const expiresAt = () => Date.now() + 30 * 24 * 60 * 60 * 1000;

async function guestWishlist() {
  const reference = (await cookies()).get(guestCookie())?.value;
  if (!validId(reference)) return null;
  const raw = await createRedisStore().get<unknown>(reference);
  const parsed = guestSchema.safeParse(raw);
  if (!parsed.success || parsed.data.expiresAt <= Date.now()) return null;
  return { reference, value: parsed.data };
}

export async function guestWishlistIds() {
  const guest = await guestWishlist();
  return guest?.value.items.map((item) => item.id) ?? [];
}

export async function listGuestWishlist(page: number, limit: number) {
  const guest = await guestWishlist();
  if (!guest) return { items: [], page, limit, total: 0 };
  const products = await Promise.all(
    guest.value.items.map(async (item) => {
      try {
        const product = await getProduct(item.slug);
        return product.id === item.id ? product : null;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    }),
  );
  const items = products.filter((product) => product !== null);
  return {
    items: items.slice((page - 1) * limit, page * limit).map((product) => ({
      ...product,
      isWishlisted: true,
    })),
    page,
    limit,
    total: items.length,
  };
}

export async function changeGuestWishlist(
  productId: string,
  slug: string | undefined,
  selected: boolean,
) {
  if (selected) {
    if (!slug) throw new ApiError(400, "PRODUCT_SLUG_REQUIRED");
    const product = await getProduct(slug);
    if (product.id !== productId) throw new ApiError(400, "PRODUCT_MISMATCH");
  }
  const store = createRedisStore();
  const guest = await guestWishlist();
  if (!guest) {
    if (!selected) return { productId, isWishlisted: false };
    const reference = opaqueId();
    const value: GuestWishlist = {
      items: [{ id: productId, slug: slug! }],
      version: 0,
      expiresAt: expiresAt(),
    };
    await store.create(reference, value, value.expiresAt);
    (await cookies()).set(guestCookie(), reference, {
      ...cookieOptions(),
      expires: new Date(value.expiresAt),
    });
    return { productId, isWishlisted: true };
  }
  const owner = opaqueId();
  if (!(await store.lock(guest.reference, owner, 5000))) throw new ApiError(409, "WISHLIST_BUSY");
  try {
    const latest = guestSchema.parse(await store.get<unknown>(guest.reference));
    const items = latest.items.filter((item) => item.id !== productId);
    if (selected) {
      if (items.length >= 30) throw new ApiError(409, "WISHLIST_LIMIT");
      items.unshift({ id: productId, slug: slug! });
    }
    const value: GuestWishlist = {
      items,
      version: latest.version + 1,
      expiresAt: latest.expiresAt,
    };
    if (!(await store.cas(guest.reference, owner, latest.version, value, value.expiresAt)))
      throw new ApiError(409, "WISHLIST_BUSY");
    return { productId, isWishlisted: selected };
  } finally {
    await store.release(guest.reference, owner);
  }
}

export async function mergeGuestWishlist(session: string): Promise<"none" | "merged" | "pending"> {
  try {
    const guest = await guestWishlist();
    if (!guest) return "none";
    const store = createRedisStore();
    const owner = opaqueId();
    if (!(await store.lock(guest.reference, owner, 300000))) return "pending";
    try {
      const latest = guestSchema.parse(await store.get<unknown>(guest.reference));
      for (const item of latest.items) {
        try {
          await authRuntime().broker.write(
            session,
            (token) =>
              upstream(`/wishlists/${item.id}`, resultSchema, { selected: true }, token, "PUT", {
                "Idempotency-Key": randomUUID(),
              }),
            (token) => upstream("/auth/me", userSchema, undefined, token),
          );
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) continue;
          throw error;
        }
      }
      await store.remove(guest.reference);
      (await cookies()).delete(guestCookie());
      return "merged";
    } finally {
      await store.release(guest.reference, owner);
    }
  } catch {
    return "pending";
  }
}
