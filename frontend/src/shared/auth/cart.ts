import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authRuntime, cookieOptions, upstream } from "./server";
import { userSchema } from "./contracts";
import { createRedisStore, opaqueId, validId } from "./store";

export const guestCookie = "glowup-guest-cart";
interface GuestCart {
  backendSession: string;
  expiresAt: number;
}
export async function guestCartSession(create = false): Promise<string | null> {
  const jar = await cookies();
  const reference = jar.get(guestCookie)?.value;
  const store = createRedisStore();
  const existing = validId(reference) ? await store.get<GuestCart>(reference) : null;
  if (
    existing &&
    existing.expiresAt > Date.now() &&
    z.uuid().safeParse(existing.backendSession).success
  )
    return existing.backendSession;
  if (!create) return null;
  const id = opaqueId();
  const value: GuestCart = { backendSession: randomUUID(), expiresAt: Date.now() + 604800000 };
  await store.create(id, value, value.expiresAt);
  jar.set(guestCookie, id, { ...cookieOptions(), expires: new Date(value.expiresAt) });
  return value.backendSession;
}
export async function mergeGuestCart(id: string): Promise<"none" | "merged" | "pending"> {
  const jar = await cookies();
  try {
    const guest = await guestCartSession();
    if (!guest) return "none";
    await authRuntime().broker.write(
      id,
      (token) =>
        upstream(
          "/cart/merge",
          z.object({ items: z.array(z.unknown()) }),
          { sessionId: guest },
          token,
        ),
      (token) => upstream("/auth/me", userSchema, undefined, token),
    );
    const reference = jar.get(guestCookie)?.value;
    if (validId(reference)) await createRedisStore().remove(reference);
    jar.delete(guestCookie);
    return "merged";
  } catch {
    return "pending";
  } // Keep the guest reference for an explicit retry.
}
