import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/errors";
import { catalogRetry, catalogRetryDelay, pollingDelay, retryAfterMs } from "@/shared/api/retry";

describe("catalog read recovery", () => {
  it("honors seconds and HTTP dates without retrying before the server deadline", () => {
    const now = Date.parse("2026-11-27T00:00:00Z");
    expect(retryAfterMs("45", now)).toBe(45000);
    expect(retryAfterMs("Fri, 27 Nov 2026 00:00:50 GMT", now)).toBe(50000);
    expect(retryAfterMs("Fri, 27 Nov 2026 00:00:00 GMT", now + 1000)).toBe(0);
    expect(retryAfterMs("invalid", now)).toBe(0);
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(catalogRetryDelay(1, new ApiError(429, "HTTP_429", undefined, "50"))).toBe(50125);
    expect(catalogRetryDelay(1, new ApiError(503, "HTTP_503"))).toBe(2125);
    random.mockRestore();
  });

  it("bounds retries and refuses validation, authorization and business errors", () => {
    expect(catalogRetry(0, new ApiError(429, "HTTP_429"))).toBe(true);
    expect(catalogRetry(2, new ApiError(429, "HTTP_429"))).toBe(false);
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(catalogRetry(0, new ApiError(status, "ERROR"))).toBe(false);
    }
  });

  it("backs off payment/order polling during a 429 block", () => {
    expect(pollingDelay(new ApiError(429, "HTTP_429", undefined, "50"), 5000)).toBe(50000);
    expect(pollingDelay(new ApiError(429, "HTTP_429"), 10000)).toBe(60000);
    expect(pollingDelay(null, 10000)).toBe(10000);
  });
});
