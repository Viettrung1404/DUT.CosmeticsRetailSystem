import { describe, expect, it } from "vitest";
import { safeVnpayUrl } from "../../src/features/checkout/payment-url";
import { paymentOutcome } from "../../src/features/checkout/payment-status";
import { parseSepayTransfer } from "../../src/features/checkout/sepay-transfer";
import { createOrderInputSchema, paymentStatusSchema } from "../../src/features/checkout/contracts";
import { paymentMethodsSchema } from "../../src/features/checkout/payment-methods";

describe("SePay checkout", () => {
  const reference = `GU${"A".repeat(32)}`;
  const data = {
    bank: "ACB",
    accountNumber: "0123456789",
    accountName: "GLOWUP",
    amount: 299100,
    content: reference,
    mode: "live",
    imageUrl: "https://evil.test/image",
  };
  it("builds a QR URL on the fixed provider origin with exact transfer details", () => {
    const transfer = parseSepayTransfer(JSON.stringify(data));
    const url = new URL(transfer!.imageUrl);
    expect(url.origin).toBe("https://vietqr.app");
    expect(url.searchParams.get("amount")).toBe("299100");
    expect(url.searchParams.get("des")).toBe(reference);
    expect(url.searchParams.get("acc")).toBe("0123456789");
  });
  it("rejects malformed instructions, invalid references and fractional amounts", () => {
    for (const raw of [
      "broken",
      "null",
      JSON.stringify({ ...data, amount: 1.5 }),
      JSON.stringify({ ...data, content: "other" }),
      JSON.stringify({ ...data, mode: "other" }),
    ])
      expect(parseSepayTransfer(raw)).toBeNull();
  });
  it("uses SePay availability and accepts QR data in the server status contract", () => {
    expect(paymentMethodsSchema.parse({ COD: true, SEPAY: false })).toEqual({
      COD: true,
      SEPAY: false,
    });
    expect(createOrderInputSchema.shape.paymentMethod.safeParse("SEPAY").success).toBe(true);
    expect(createOrderInputSchema.shape.paymentMethod.safeParse("VNPAY").success).toBe(false);
    const id = "9c9592e4-098e-432b-a043-ce8c559f4cbb";
    expect(
      paymentStatusSchema.parse({
        paymentId: id,
        orderId: id,
        method: "SEPAY",
        status: "PAYABLE",
        paymentStatus: "PAYABLE",
        orderStatus: "PENDING",
        paymentUrl: null,
        qrCodeData: JSON.stringify(data),
        verificationPending: false,
        refundPending: false,
      }).qrCodeData,
    ).toBe(JSON.stringify(data));
  });
});

describe("VNPAY redirect boundary", () => {
  it("accepts only HTTPS VNPAY hosts without credentials or fragments", () => {
    expect(safeVnpayUrl("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?a=1")).toBe(
      "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?a=1",
    );
    expect(safeVnpayUrl("https://pay.vnpay.vn/pay")).toBe("https://pay.vnpay.vn/pay");
    for (const value of [
      "http://sandbox.vnpayment.vn/pay",
      "https://vnpay.vn.evil.test/pay",
      "https://user@vnpay.vn/pay",
      "https://vnpay.vn/pay#token",
      "javascript:alert(1)",
    ])
      expect(safeVnpayUrl(value)).toBeNull();
  });
});

describe("VNPay result reflects verified payment and order state", () => {
  const paid = {
    paymentStatus: "COMPLETED",
    orderStatus: "CONFIRMED",
    verificationPending: false,
    refundPending: false,
  };
  it("confirms only a reconciled payment whose order was accepted", () => {
    expect(paymentOutcome(paid)).toBe("success");
    expect(paymentOutcome({ ...paid, verificationPending: true })).toBe("pending");
    expect(paymentOutcome({ ...paid, orderStatus: "PENDING" })).toBe("success");
    expect(paymentOutcome({ ...paid, orderStatus: "PENDING_PAYMENT" })).toBe("pending");
    expect(paymentOutcome(null)).toBe("pending");
  });
  it("does not show late or excess payments as successful orders", () => {
    expect(paymentOutcome({ ...paid, refundPending: true })).toBe("refund");
    expect(paymentOutcome({ ...paid, orderStatus: "CANCELLED" })).toBe("refund");
    expect(paymentOutcome({ ...paid, paymentStatus: "NEEDS_REVIEW" })).toBe("review");
    expect(paymentOutcome({ ...paid, paymentStatus: "FAILED" })).toBe("failed");
  });
});
