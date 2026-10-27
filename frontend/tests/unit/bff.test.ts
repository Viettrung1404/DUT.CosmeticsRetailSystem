import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { requestBff } from "@/shared/api/browser";
beforeEach(() => { vi.stubGlobal("window", { location: { origin: "http://localhost:3001" } }); });
afterEach(() => { vi.unstubAllGlobals(); });
it("reads the projected BFF DTO without unwrapping a second envelope", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ user: { id: "a", fullName: "Lan", unexpected: "private" } })); vi.stubGlobal("fetch", fetcher);
  expect(await requestBff("/api/auth/session", z.object({ user: z.object({ id: z.string(), fullName: z.string() }) }))).toEqual({ user: { id: "a", fullName: "Lan" } });
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store", credentials: "same-origin", redirect: "error" });
});
it("preserves error code/details/Retry-After and never retries a mutation", async () => {
  const fetcher = vi.fn(async () => Response.json({ code: "RATE_LIMITED", details: { field: "email" } }, { status: 429, headers: { "Retry-After": "45" } })); vi.stubGlobal("fetch", fetcher);
  await expect(requestBff("/api/auth/login", z.object({ success: z.boolean() }), { method: "POST", body: { email: "a@example.com" } })).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED", retryAfter: "45", details: { field: "email" } });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("rejects malformed success responses and paths that escape the BFF", async () => {
  const fetcher = vi.fn(async () => Response.json({ user: "invalid" })); vi.stubGlobal("fetch", fetcher);
  await expect(requestBff("/api/auth/session", z.object({ user: z.object({ id: z.string() }) }))).rejects.toMatchObject({ code: "INVALID_RESPONSE", status: 502 });
  for (const path of ["/api/../../evil", "/api/\\evil", "/api/auth/session#token"] as const) await expect(requestBff(path, z.unknown())).rejects.toThrow("Invalid BFF path");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
