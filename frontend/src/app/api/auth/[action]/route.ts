import { cookies } from "next/headers";
import { ApiError } from "@/shared/api/errors";
import { authInputs, loginSchema, messageSchema, type AuthAction } from "@/shared/auth/contracts";
import { authRuntime, cookieName, cookieOptions, currentUser, establishSession, sessionId, sessionTtl, upstream } from "@/shared/auth/server";
import { failure, json, mutationBody } from "@/shared/auth/http";
import { mergeGuestCart } from "@/shared/auth/cart";
import { validId } from "@/shared/auth/store";
import type { Session } from "@/shared/auth/broker";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    if ((await context.params).action !== "session") throw new ApiError(404, "NOT_FOUND");
    return json({ user: await currentUser() });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const input = await mutationBody(request);
    const { action } = await context.params;
    if (action === "logout") {
      const jar = await cookies();
      const id = jar.get(cookieName())?.value;
      let revoked = true;
      try {
        if (validId(id)) {
          const { store } = authRuntime();
          const value = await store.get<Session>(id);
          await store.remove(id); // Delete before revoke; a refresh CAS cannot resurrect this ID.
          if (value) {
            try { await upstream("/auth/logout", messageSchema, { refreshToken: value.refreshToken }); }
            catch { revoked = false; }
          }
        }
      } finally { jar.set(cookieName(), "", { ...cookieOptions(), maxAge: 0 }); }
      return json({ revoked });
    }
    if (action === "merge-cart") return json({ cart: await mergeGuestCart(await sessionId()) });
    if (!Object.hasOwn(authInputs, action)) throw new ApiError(404, "NOT_FOUND");
    const parsed = authInputs[action as AuthAction].safeParse(input);
    if (!parsed.success) throw new ApiError(400, "INVALID_INPUT", parsed.error.flatten());
    if (action === "login") {
      sessionTtl();
      const startedAt = Date.now();
      const data = await upstream("/auth/login", loginSchema, parsed.data);
      const id = await establishSession(data, startedAt);
      return json({ user: data.user, cart: await mergeGuestCart(id) });
    }
    await upstream(`/auth/${action}`, messageSchema, parsed.data);
    return json({ success: true }, action === "register" ? 201 : 200);
  } catch (error) { return failure(error); }
}
