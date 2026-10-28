import { describe, expect, it } from "vitest";
import { canAcceptQuote } from "../../src/features/post-purchase/return-quote";

describe("exchange quote acceptance", () => {
  const base = { returnType: "EXCHANGE", status: "INSPECTED", quoteSnapshot: { payable: 100000 }, quoteExpiresAt: "2026-10-29T03:00:00.000Z", settlement: null };
  it("accepts only a current inspected quote without settlement", () => {
    const now = Date.parse("2026-10-29T02:00:00.000Z");
    expect(canAcceptQuote(base, now)).toBe(true);
    expect(canAcceptQuote(base, Date.parse(base.quoteExpiresAt))).toBe(false);
    expect(canAcceptQuote({ ...base, status: "REQUESTED" }, now)).toBe(false);
    expect(canAcceptQuote({ ...base, settlement: { status: "ACTIVE" } }, now)).toBe(false);
    expect(canAcceptQuote({ ...base, quoteExpiresAt: "invalid" }, now)).toBe(false);
  });
});
