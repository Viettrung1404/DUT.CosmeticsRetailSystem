import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const fixture = vi.hoisted(() => ({ cookies: new Map<string, string>(), records: new Map<string, unknown>(), upstream: vi.fn(), establish: vi.fn(), sessionId: vi.fn(), write: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (key: string) => fixture.cookies.has(key) ? { value: fixture.cookies.get(key) } : undefined, set: (key: string, value: string) => fixture.cookies.set(key, value), delete: (key: string) => fixture.cookies.delete(key) }) }));
vi.mock("@/shared/auth/server", () => ({ upstream: fixture.upstream, establishSession: fixture.establish, sessionId: fixture.sessionId, sessionTtl: () => 3600, cookieOptions: () => ({ httpOnly: true }), authRuntime: () => ({ broker: { write: fixture.write } }) }));
vi.mock("@/shared/auth/cart", () => ({ mergeGuestCart: async () => "none" }));
vi.mock("@/shared/auth/store", async (original) => ({ ...await original<typeof import("@/shared/auth/store")>(), createRedisStore: () => ({ get: async (key: string) => fixture.records.get(key) ?? null, create: async (key: string, value: unknown) => { fixture.records.set(key, value); }, remove: async (key: string) => { fixture.records.delete(key); } }) }));
import { oauthAction, oauthFlow } from "@/shared/auth/oauth";
import { ApiError } from "@/shared/api/errors";
const challenge = "c".repeat(64);
const providerToken = "provider-token-for-fixtures-only";
async function start(code = "EMAIL_VERIFICATION_REQUIRED") {
  fixture.upstream.mockResolvedValueOnce({ code, challenge, expiresIn: 600 });
  return oauthAction("google", { idToken: providerToken });
}
describe("bound OAuth flow", () => {
  beforeEach(() => { fixture.cookies.clear(); fixture.records.clear(); vi.clearAllMocks(); process.env.OAUTH_GOOGLE_ENABLED = "true"; process.env.GOOGLE_OAUTH_CLIENT_ID = "123-fixture.apps.googleusercontent.com"; fixture.establish.mockResolvedValue("session"); fixture.sessionId.mockResolvedValue("target-session"); });
  it("keeps nonce and challenge server-side, returning only the continuation code", async () => {
    expect(await start()).toEqual({ code: "EMAIL_VERIFICATION_REQUIRED" });
    const call = fixture.upstream.mock.calls[0];
    expect(call?.[2]).toMatchObject({ idToken: providerToken, clientNonce: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(fixture.establish).not.toHaveBeenCalled();
    expect((await oauthFlow()).flow.challenge).toBe(challenge);
  });
  it("refuses client overrides of the binding nonce or challenge", async () => {
    await expect(oauthAction("google", { idToken: providerToken, clientNonce: "attacker" })).rejects.toMatchObject({ status: 400 });
    await start();
    await expect(oauthAction("email", { email: "lan@example.com", challenge: "attacker" })).rejects.toMatchObject({ status: 400 });
  });
  it("forwards email proof with the stored binding and consumes successful onboarding", async () => {
    await start(); const nonce = (await oauthFlow()).flow.clientNonce;
    fixture.upstream.mockResolvedValueOnce({ message: "SENT" });
    await oauthAction("email", { email: "lan@example.com" });
    expect(fixture.upstream.mock.calls[1]?.[2]).toEqual({ email: "lan@example.com", challenge, clientNonce: nonce });
    fixture.upstream.mockResolvedValueOnce({ accessToken: "access", refreshToken: "refresh", user: { id: "user" } });
    expect(await oauthAction("complete", { verificationToken: "p".repeat(64) })).toMatchObject({ cart: "none" });
    expect(fixture.cookies.has("glowup-oauth")).toBe(false); expect(fixture.records.size).toBe(0);
  });
  it("requires authenticated target session for linking and never treats the challenge as login", async () => {
    await start("ACCOUNT_LINK_REQUIRED");
    await expect(oauthAction("complete", { verificationToken: "p".repeat(64) })).rejects.toMatchObject({ code: "ACCOUNT_LINK_REQUIRED" });
    fixture.sessionId.mockRejectedValueOnce(new ApiError(401, "SESSION_EXPIRED"));
    await expect(oauthAction("link", { verificationToken: "p".repeat(64) })).rejects.toMatchObject({ status: 401 });
    expect(fixture.establish).not.toHaveBeenCalled();
    fixture.write.mockResolvedValueOnce({ accessToken: "access", refreshToken: "refresh", user: { id: "target" } });
    await oauthAction("link", { verificationToken: "p".repeat(64) });
    expect(fixture.write.mock.calls[0]?.[0]).toBe("target-session");
  });
  it("rejects missing/expired flows and disabled providers", async () => {
    await expect(oauthFlow()).rejects.toMatchObject({ code: "OAUTH_FLOW_EXPIRED" });
    await start();
    const { id, flow } = await oauthFlow(); fixture.records.set(id, { ...flow, expiresAt: Date.now() - 1 });
    await expect(oauthFlow()).rejects.toMatchObject({ code: "OAUTH_FLOW_EXPIRED" });
    process.env.OAUTH_GOOGLE_ENABLED = "false";
    await expect(oauthAction("google", { idToken: providerToken })).rejects.toMatchObject({ code: "PROVIDER_DISABLED" });
  });
});
