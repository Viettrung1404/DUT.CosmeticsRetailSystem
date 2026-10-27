import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { ApiError } from "@/shared/api/errors";
import { authRuntime, cookieOptions, establishSession, sessionId, sessionTtl, upstream } from "./server";
import { createRedisStore, opaqueId, validId } from "./store";
import { loginSchema, messageSchema, userSchema } from "./contracts";
import { mergeGuestCart } from "./cart";

const flowCookie = "glowup-oauth";
const challengeSchema = z.object({ code: z.enum(["ACCOUNT_LINK_REQUIRED", "EMAIL_VERIFICATION_REQUIRED"]), challenge: z.string().length(64), expiresIn: z.number().int().positive().max(600) });
interface Flow { clientNonce: string; challenge: string; code: string; expiresAt: number }
export async function oauthFlow() {
  const id = (await cookies()).get(flowCookie)?.value;
  const flow = validId(id) ? await createRedisStore().get<Flow>(id) : null;
  if (!id || !flow || flow.expiresAt <= Date.now()) throw new ApiError(401, "OAUTH_FLOW_EXPIRED");
  return { id, flow };
}
export async function oauthAction(action: string, input: unknown) {
  const jar = await cookies();
  if (action === "google" || action === "facebook") {
    if (process.env[`OAUTH_${action.toUpperCase()}_VERIFIED`] !== "true") throw new ApiError(404, "PROVIDER_DISABLED");
    const field = action === "google" ? "idToken" : "accessToken";
    const data = z.object({ [field]: z.string().min(20).max(16384) }).strict().safeParse(input);
    if (!data.success) throw new ApiError(400, "INVALID_INPUT");
    sessionTtl();
    const startedAt = Date.now();
    const clientNonce = opaqueId();
    const result = await upstream(`/auth/oauth/${action}`, z.union([loginSchema, challengeSchema]), { ...data.data, clientNonce });
    if ("accessToken" in result) {
      const id = await establishSession(result, startedAt);
      return { user: result.user, cart: await mergeGuestCart(id) };
    }
    const store = createRedisStore();
    const previous = jar.get(flowCookie)?.value;
    if (validId(previous)) await store.remove(previous);
    const id = opaqueId(); const expiresAt = startedAt + result.expiresIn * 1000;
    await store.create(id, { clientNonce, challenge: result.challenge, code: result.code, expiresAt }, expiresAt);
    jar.set(flowCookie, id, { ...cookieOptions(), expires: new Date(expiresAt) });
    return { code: result.code };
  }
  if (!["email", "complete", "link"].includes(action)) throw new ApiError(404, "NOT_FOUND");
  const { id, flow } = await oauthFlow();
  const parsed = (action === "email" ? z.object({ email: z.email().max(255) }).strict() : z.object({ verificationToken: z.string().length(64) }).strict()).safeParse(input);
  if (!parsed.success) throw new ApiError(400, "INVALID_INPUT");
  const body = { ...parsed.data, challenge: flow.challenge, clientNonce: flow.clientNonce };
  if (action === "email") { await upstream("/auth/oauth/email", messageSchema, body); return { success: true }; }
  if (flow.code === "ACCOUNT_LINK_REQUIRED" && action !== "link") throw new ApiError(403, "ACCOUNT_LINK_REQUIRED");
  sessionTtl();
  const startedAt = Date.now();
  const result = action === "link"
    ? await authRuntime().broker.write(await sessionId(), (token) => upstream("/auth/oauth/link", loginSchema, body, token), (token) => upstream("/auth/me", userSchema, undefined, token))
    : await upstream("/auth/oauth/complete", loginSchema, body);
  const session = await establishSession(result, startedAt);
  await createRedisStore().remove(id); jar.delete(flowCookie);
  return { user: result.user, cart: await mergeGuestCart(session) };
}
