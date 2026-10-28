import { describe, expect, it } from "vitest";
import { safeVnpayUrl } from "../../src/features/checkout/payment-url";

describe("VNPAY redirect boundary", () => {
  it("accepts only HTTPS VNPAY hosts without credentials or fragments", () => {
    expect(safeVnpayUrl("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?a=1")).toBe("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?a=1");
    expect(safeVnpayUrl("https://pay.vnpay.vn/pay")).toBe("https://pay.vnpay.vn/pay");
    for (const value of ["http://sandbox.vnpayment.vn/pay", "https://vnpay.vn.evil.test/pay", "https://user@vnpay.vn/pay", "https://vnpay.vn/pay#token", "javascript:alert(1)"]) expect(safeVnpayUrl(value)).toBeNull();
  });
});
