import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { ApiError } from "@/shared/api/errors";
import { createBroker, type Session } from "@/shared/auth/broker";
import { closeSessionStore, createRedisStore, opaqueId } from "@/shared/auth/store";

const enabled = process.env.RUN_REDIS_TESTS === "true";
describe.skipIf(!enabled)("real Redis distributed session guarantees", { timeout: 30000 }, () => {
  const ids: string[] = [];
  beforeAll(() => { process.env.SESSION_REDIS_URL = process.env.TEST_SESSION_REDIS_URL || "redis://127.0.0.1:6379"; process.env.SESSION_KEY_PREFIX = `glowup:test:${opaqueId()}:`; });
  afterAll(async () => { for (const id of ids) await createRedisStore().remove(id); await closeSessionStore(); });
  async function fixture() {
    const id = opaqueId(); ids.push(id);
    const session: Session = { user: { id: "user-a", email: "a@example.com", fullName: "Lan" }, version: 0, accessToken: "old", refreshToken: "refresh-old", expiresAt: Date.now() + 60000, state: "active" };
    const store = createRedisStore(); await store.create(id, session, session.expiresAt);
    return { id, session, store };
  }
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  it("coordinates two independent brokers and concurrent tab reads with a single refresh", async () => {
    const { id, store } = await fixture();
    const refresh = vi.fn(async () => { await wait(80); return { accessToken: "new", refreshToken: "refresh-new" }; });
    const first = createBroker(store, refresh); const second = createBroker(createRedisStore(), refresh);
    const read = vi.fn(async (token: string) => { if (token === "old") throw new ApiError(401, "EXPIRED"); return token; });
    expect(await Promise.all(Array.from({ length: 12 }, (_, i) => (i % 2 ? first : second).read(id, read)))).toEqual(Array(12).fill("new"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("cannot resurrect a logged-out session after an in-flight refresh", async () => {
    const { id, store } = await fixture();
    let started!: () => void; let finish!: () => void;
    const startedPromise = new Promise<void>((resolve) => { started = resolve; }); const finishPromise = new Promise<void>((resolve) => { finish = resolve; });
    const broker = createBroker(store, async () => { started(); await finishPromise; return { accessToken: "new", refreshToken: "new" }; });
    const result = broker.read(id, async () => { throw new ApiError(401, "EXPIRED"); }).catch((error: unknown) => error);
    await startedPromise; await createRedisStore().remove(id); finish();
    expect(await result).toMatchObject({ status: 401 });
    expect(await store.get(id)).toBeNull();
  });
  it("rejects a stale CAS and a lock owner after TTL expiration", async () => {
    const { id, store, session } = await fixture(); const owner = opaqueId();
    expect(await store.lock(id, owner, 20)).toBe(true);
    expect(await store.cas(id, owner, 10, session, session.expiresAt)).toBe(false);
    await wait(40);
    expect(await store.cas(id, owner, 0, session, session.expiresAt)).toBe(false);
    const nextOwner = opaqueId(); expect(await store.lock(id, nextOwner, 1000)).toBe(true);
    await store.release(id, owner); // Previous owner cannot release the new owner's lock.
    expect(await store.lock(id, opaqueId(), 100)).toBe(false);
    await store.release(id, nextOwner);
  });
  it("does not retry a refresh left in progress after owner crash/lock expiry", async () => {
    const { id, store, session } = await fixture(); const owner = opaqueId();
    await store.lock(id, owner, 20); await store.cas(id, owner, 0, { ...session, state: "refreshing", version: 1 }, session.expiresAt); await wait(40);
    const refresh = vi.fn(); const broker = createBroker(store, refresh);
    await expect(broker.read(id, async () => "unused")).rejects.toMatchObject({ code: "SESSION_RECOVERY_REQUIRED" });
    expect(refresh).not.toHaveBeenCalled();
  });
  it.each([403, 429, 503])("does not refresh an ordinary private response with HTTP %s", async (status) => {
    const { id, store } = await fixture(); const refresh = vi.fn();
    await expect(createBroker(store, refresh).read(id, async () => { throw new ApiError(status, "UPSTREAM"); })).rejects.toMatchObject({ status });
    expect(refresh).not.toHaveBeenCalled(); expect(await store.get(id)).not.toBeNull();
  });
  it("deletes the session on a definitive refresh 401", async () => {
    const { id, store } = await fixture(); const broker = createBroker(store, async () => { throw new ApiError(401, "REVOKED"); });
    await expect(broker.read(id, async () => { throw new ApiError(401, "EXPIRED"); })).rejects.toMatchObject({ status: 401 });
    expect(await store.get(id)).toBeNull();
  });
  it("keeps a rate-limited session and enforces Retry-After across instances", async () => {
    const { id, store } = await fixture(); const refresh = vi.fn(async () => { throw new ApiError(429, "RATE_LIMITED", undefined, "30"); });
    const read = async () => { throw new ApiError(401, "EXPIRED"); };
    await expect(createBroker(store, refresh).read(id, read)).rejects.toMatchObject({ status: 429, retryAfter: "30" });
    await expect(createBroker(createRedisStore(), refresh).read(id, read)).rejects.toMatchObject({ status: 429, retryAfter: "30" });
    expect(refresh).toHaveBeenCalledTimes(1); expect(await store.get(id)).not.toBeNull();
  });
  it.each([503, 504])("retains an uncertain refresh outcome without reusing its token (%s)", async (status) => {
    const { id, store } = await fixture(); const refresh = vi.fn(async () => { throw new ApiError(status, "UNCERTAIN"); }); const broker = createBroker(store, refresh);
    await expect(broker.read(id, async () => { throw new ApiError(401, "EXPIRED"); })).rejects.toMatchObject({ status });
    expect(await store.get(id)).toMatchObject({ state: "recovery" });
    await expect(broker.read(id, async () => "unused")).rejects.toMatchObject({ code: "SESSION_RECOVERY_REQUIRED" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("replays a read once and never replays writes after 401 or timeout", async () => {
    const { id, store } = await fixture(); const refresh = vi.fn(async () => ({ accessToken: "new", refreshToken: "new" })); const broker = createBroker(store, refresh);
    const read = vi.fn(async () => { throw new ApiError(401, "EXPIRED"); });
    await expect(broker.read(id, read)).rejects.toMatchObject({ status: 401 }); expect(read).toHaveBeenCalledTimes(2); expect(refresh).toHaveBeenCalledTimes(1);
    for (const status of [401, 504]) {
      const write = vi.fn(async () => { throw new ApiError(status, "WRITE_FAILED"); });
      await expect(broker.write(id, write, async () => true)).rejects.toMatchObject({ status }); expect(write).toHaveBeenCalledTimes(1);
    }
  });
  it("expires session records at the fixed refresh upper bound", async () => {
    const { id, store, session } = await fixture(); const owner = opaqueId(); await store.lock(id, owner, 1000);
    expect(await store.cas(id, owner, 0, { ...session, expiresAt: Date.now() + 20 }, Date.now() + 20)).toBe(true); await store.release(id, owner); await wait(50);
    // The broker enforces the deadline even if the Redis host clock lags this process.
    await expect(createBroker(store, vi.fn()).session(id)).rejects.toMatchObject({ status: 401 });
  });
  it("returns unavailable when the store is not configured, with no memory fallback", async () => {
    const previous = process.env.SESSION_REDIS_URL;
    delete process.env.SESSION_REDIS_URL;
    try { await expect(createRedisStore().get(opaqueId())).rejects.toMatchObject({ status: 503, code: "SESSION_UNAVAILABLE" }); }
    finally { process.env.SESSION_REDIS_URL = previous; }
  });
});
