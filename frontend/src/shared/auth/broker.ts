import "server-only";
import { ApiError } from "@/shared/api/errors";
import type { AuthUser } from "./contracts";
import { opaqueId, type SessionStore } from "./store";

export interface Session {
  version: number;
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  state: "active" | "refreshing" | "recovery";
  retryAt?: number;
  retryAfter?: string;
}
type Tokens = Pick<Session, "accessToken" | "refreshToken">;
const unauthorized = () => new ApiError(401, "SESSION_EXPIRED");

export function createBroker(store: SessionStore, refresh: (token: string) => Promise<Tokens>, timeoutMs = 5000) {
  async function session(id: string) {
    const current = await store.get<Session>(id);
    if (!current || current.expiresAt <= Date.now()) throw unauthorized();
    if (current.state === "recovery") throw new ApiError(401, "SESSION_RECOVERY_REQUIRED");
    if (current.retryAt && current.retryAt > Date.now()) throw new ApiError(429, "REFRESH_BACKOFF", undefined, current.retryAfter ?? "2");
    return current;
  }
  async function rotate(id: string, previous: Session): Promise<Session> {
    const owner = opaqueId();
    const deadline = Date.now() + timeoutMs + 1500;
    while (!(await store.lock(id, owner, timeoutMs + 2000))) {
      if (Date.now() >= deadline) throw new ApiError(503, "SESSION_BUSY", undefined, "2");
      await new Promise((resolve) => setTimeout(resolve, 50));
      const latest = await session(id);
      if (latest.state === "active" && latest.version !== previous.version) return latest;
    }
    try {
      const latest = await session(id);
      // A crashed/expired owner may already have rotated upstream. Never reuse its token.
      if (latest.state === "refreshing") throw new ApiError(401, "SESSION_RECOVERY_REQUIRED");
      if (latest.version !== previous.version) return latest;
      const pending: Session = { ...latest, version: latest.version + 1, state: "refreshing" };
      if (!(await store.cas(id, owner, latest.version, pending, latest.expiresAt))) throw unauthorized();
      let tokens: Tokens;
      try { tokens = await refresh(latest.refreshToken); }
      catch (error) {
        if (error instanceof ApiError && error.status === 401) await store.remove(id);
        else {
          const rateLimited = error instanceof ApiError && error.status === 429;
          const state = rateLimited ? "active" : "recovery";
          const retryAfter = rateLimited ? error.retryAfter ?? "60" : undefined;
          const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : 60;
          await store.cas(id, owner, pending.version, { ...pending, state, version: pending.version + 1, ...(rateLimited ? { retryAt: Date.now() + seconds * 1000, retryAfter } : {}) }, pending.expiresAt);
        }
        throw error;
      }
      const next: Session = { ...pending, ...tokens, state: "active", version: pending.version + 1 };
      if (!(await store.cas(id, owner, pending.version, next, next.expiresAt))) throw unauthorized();
      return next;
    } finally { await store.release(id, owner); }
  }
  return {
    session,
    async read<T>(id: string, request: (token: string) => Promise<T>): Promise<T> {
      let current = await session(id);
      if (current.state === "refreshing") current = await rotate(id, current);
      try { return await request(current.accessToken); }
      catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        const next = await rotate(id, current);
        return request(next.accessToken); // Exactly one authenticated read retry.
      }
    },
    async write<T>(id: string, request: (token: string) => Promise<T>, validate: (token: string) => Promise<unknown>): Promise<T> {
      await this.read(id, validate); // Refresh on a safe read, never replay a write.
      const current = await session(id);
      return request(current.accessToken);
    },
  };
}
