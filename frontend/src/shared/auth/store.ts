import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "redis";
import { ApiError } from "@/shared/api/errors";

export interface SessionStore {
  get<T>(id: string): Promise<T | null>;
  create(id: string, value: unknown, expiresAt: number): Promise<void>;
  remove(id: string): Promise<void>;
  lock(id: string, owner: string, ttl: number): Promise<boolean>;
  release(id: string, owner: string): Promise<void>;
  cas(id: string, owner: string, version: number, value: unknown, expiresAt: number): Promise<boolean>;
}
export const opaqueId = () => randomBytes(32).toString("hex");
export const validId = (id: string | undefined): id is string => !!id && /^[a-f0-9]{64}$/.test(id);

let client: ReturnType<typeof createClient> | undefined;
let connecting: Promise<unknown> | undefined;
async function redis() {
  if (!process.env.SESSION_REDIS_URL) throw new ApiError(503, "SESSION_UNAVAILABLE");
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_REDIS_URL.startsWith("rediss://")) throw new ApiError(503, "SESSION_UNAVAILABLE");
  if (!client) {
    client = createClient({ url: process.env.SESSION_REDIS_URL, disableOfflineQueue: true, commandOptions: { timeout: 2000 }, socket: { connectTimeout: 2000, reconnectStrategy: false } });
    client.on("error", () => { /* Never log credentials or session contents. */ });
  }
  if (connecting) await connecting;
  if (!client.isOpen) {
    connecting ??= client.connect().finally(() => { connecting = undefined; });
    await connecting;
  }
  return client;
}
export async function closeSessionStore() {
  if (client?.isOpen) await client.close();
  client = undefined;
}
const casScript = `
if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
local current = redis.call('GET', KEYS[1])
if not current or cjson.decode(current).version ~= tonumber(ARGV[2]) then return 0 end
redis.call('SET', KEYS[1], ARGV[3], 'PXAT', ARGV[4])
return 1`;
const releaseScript = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end`;

export function createRedisStore(): SessionStore {
  const prefix = process.env.SESSION_KEY_PREFIX || "glowup:web:session:";
  if (!/^[a-zA-Z0-9:_-]+:$/.test(prefix)) throw new ApiError(503, "SESSION_UNAVAILABLE");
  const key = (id: string) => `${prefix}{${createHash("sha256").update(id).digest("hex")}}`;
  async function run<T>(fn: (connection: Awaited<ReturnType<typeof redis>>) => Promise<T>): Promise<T> {
    try { return await fn(await redis()); } catch { throw new ApiError(503, "SESSION_UNAVAILABLE"); }
  }
  return {
    get: <T>(id: string) => run(async (c) => { const raw = await c.get(key(id)); return raw ? JSON.parse(raw) as T : null; }),
    create: (id, value, expiresAt) => run(async (c) => { if (await c.set(key(id), JSON.stringify(value), { expiration: { type: "PXAT", value: expiresAt }, condition: "NX" }) !== "OK") throw new Error("collision"); }),
    remove: (id) => run(async (c) => { await c.del(key(id)); }),
    lock: (id, owner, ttl) => run(async (c) => (await c.set(`${key(id)}:lock`, owner, { expiration: { type: "PX", value: ttl }, condition: "NX" })) === "OK"),
    release: (id, owner) => run(async (c) => { await c.eval(releaseScript, { keys: [`${key(id)}:lock`], arguments: [owner] }); }),
    cas: (id, owner, version, value, expiresAt) => run(async (c) => (await c.eval(casScript, { keys: [key(id), `${key(id)}:lock`], arguments: [owner, String(version), JSON.stringify(value), String(expiresAt)] })) === 1),
  };
}
