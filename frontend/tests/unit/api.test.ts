import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { readApiResponse } from "@/shared/api/response";
import { ApiError, apiErrorMessage } from "@/shared/api/errors";
import { fetchWithTimeout } from "@/shared/api/transport";

const envelope = (data: unknown) => ({ statusCode: 200, success: true, message: "OK", timestamp: "2026-10-26T00:00:00.000Z", data });

describe("API boundary", () => {
  it("unwraps exactly one envelope, validates data and strips unapproved fields", async () => {
    const response = Response.json(envelope({ data: [{ id: "p1", costPrice: 12 }], meta: { total: 1 } }));
    const schema = z.object({ data: z.array(z.object({ id: z.string() })), meta: z.object({ total: z.number() }) });
    expect((await readApiResponse(response, schema)).data).toEqual({ data: [{ id: "p1" }], meta: { total: 1 } });
  });

  it.each([
    { status: "ok" },
    envelope({ status: 2 }),
    { ...envelope({ status: "ok" }), success: false },
    { ...envelope({ status: "ok" }), statusCode: 201 },
  ])("rejects malformed success envelopes instead of asserting generated types", async (body) => {
    await expect(readApiResponse(Response.json(body), z.object({ status: z.literal("ok") }))).rejects.toMatchObject({ code: "INVALID_RESPONSE", status: 502 });
  });

  it("preserves conflict details, HTTP status and rate-limit headers", async () => {
    const response = Response.json({ code: "ORDER_PRICE_CHANGED", message: "private upstream message", details: { quoteVersion: "new" } }, {
      status: 409, headers: { "Retry-After": "30", "X-Request-Id": "request-1" },
    });
    await expect(readApiResponse(response, z.unknown())).rejects.toMatchObject({
      status: 409, code: "ORDER_PRICE_CHANGED", details: { quoteVersion: "new" }, retryAfter: "30", requestId: "request-1",
    });
  });

  it("preserves an HTTP error when a gateway returns HTML", async () => {
    await expect(readApiResponse(new Response("<html>unavailable</html>", { status: 503 }), z.unknown())).rejects.toMatchObject({ status: 503, code: "HTTP_503" });
  });

  it("does not expose backend details or infer flow from translated messages", async () => {
    const response = Response.json({ message: "ORDER_PRICE_CHANGED", details: { email: "private" } }, { status: 400 });
    await expect(readApiResponse(response, z.unknown())).rejects.toMatchObject({ code: "HTTP_400" });
    expect(apiErrorMessage(new ApiError(500, "SECRET", { password: "secret" }))).not.toContain("secret");
  });

  it("forces no-store, rejects redirects and never retries mutations", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("network"));
    await expect(fetchWithTimeout("https://backend.invalid/api/v1/orders", { method: "POST", cache: "force-cache" }, 1000, fetcher)).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 503 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "POST", cache: "no-store", redirect: "error" }));
  });

  it("bounds a hung upstream request", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    }));
    await expect(fetchWithTimeout("https://backend.invalid", {}, 20, fetcher)).rejects.toMatchObject({ code: "REQUEST_TIMEOUT", status: 504 });
  });

  it("preserves caller cancellation so stale search requests can be ignored", async () => {
    const controller = new AbortController();
    controller.abort();
    const reason = controller.signal.reason;
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(reason);
    await expect(fetchWithTimeout("https://backend.invalid", { signal: controller.signal }, 1000, fetcher)).rejects.toBe(reason);
  });
});
