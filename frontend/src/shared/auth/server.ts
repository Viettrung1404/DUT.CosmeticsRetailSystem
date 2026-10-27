import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { z } from "zod";
import { getServerEnv } from "@/shared/config/env";
import { fetchWithTimeout } from "@/shared/api/transport";
import { readApiResponse } from "@/shared/api/response";
import { ApiError } from "@/shared/api/errors";
import { createBroker, type Session } from "./broker";
import { tokensSchema, userSchema } from "./contracts";
import { createRedisStore, opaqueId, validId } from "./store";

export const cookieName = () => process.env.NODE_ENV === "production" ? "__Host-glowup-session" : "glowup-session";
export const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production" || getServerEnv().SITE_URL.startsWith("https:"), sameSite: "lax" as const, path: "/" });
export async function upstream<T>(path: string, schema: z.ZodType<T>, body?: unknown, token?: string, method = body === undefined ? "GET" : "POST") {
  const env = getServerEnv();
  const response = await fetchWithTimeout(`${env.BACKEND_API_BASE_URL.replace(/\/$/, "")}${path}`, {
    method, headers: { Accept: "application/json", "Content-Type": "application/json", "X-Request-Id": crypto.randomUUID(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }, env.BACKEND_TIMEOUT_MS);
  return (await readApiResponse(response, schema)).data;
}
export function authRuntime() {
  const store = createRedisStore();
  const broker = createBroker(store, (token) => upstream("/auth/refresh-token", tokensSchema, { refreshToken: token }), getServerEnv().BACKEND_TIMEOUT_MS);
  return { store, broker };
}
export function sessionTtl() {
  // Backend opaque tokens have no expiry metadata. Deployment must provide a verified upper bound.
  const seconds = Number(process.env.SESSION_MAX_AGE_SECONDS);
  if (!Number.isInteger(seconds) || seconds < 60 || seconds > 604800) throw new ApiError(503, "SESSION_CONFIGURATION_REQUIRED");
  return seconds;
}
export async function establishSession(data: z.infer<typeof tokensSchema> & { user: z.infer<typeof userSchema> }, startedAt: number) {
  const expiresAt = startedAt + sessionTtl() * 1000;
  const jar = await cookies();
  const { store } = authRuntime();
  const old = jar.get(cookieName())?.value;
  const id = opaqueId();
  const value: Session = { ...data, state: "active", version: 0, expiresAt };
  await store.create(id, value, expiresAt);
  if (validId(old)) await store.remove(old);
  jar.set(cookieName(), id, { ...cookieOptions(), expires: new Date(expiresAt) });
  return id;
}
export async function sessionId() {
  const id = (await cookies()).get(cookieName())?.value;
  if (!validId(id)) throw new ApiError(401, "SESSION_EXPIRED");
  return id;
}
export const currentUser = cache(async function currentUser() {
  const id = await sessionId();
  return authRuntime().broker.read(id, (token) => upstream("/auth/me", userSchema, undefined, token));
});
