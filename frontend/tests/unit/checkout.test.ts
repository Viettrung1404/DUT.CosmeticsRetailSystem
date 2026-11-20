import { describe, expect, it } from "vitest";
import { safeVnpayUrl } from "../../src/features/checkout/payment-url";
import { paymentOutcome } from "../../src/features/checkout/payment-status";
import { parseSepayTransfer } from "../../src/features/checkout/sepay-transfer";
import {
  createOrderInputSchema,
  paymentStatusSchema,
  shippingQuoteResponseSchema,
  shippingSchema,
} from "../../src/features/checkout/contracts";
import { isCurrentAddress } from "../../src/features/addresses/vietnam-divisions";
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

describe("FE-01: Real-time Shipping Quotes Checkout", () => {
  it("validates shipping quote response schema including Express 2H and GHN Standard", () => {
    const rawQuote = {
      quoteGroupId: "87a0c10b-554f-4d32-9cb7-e5473778dfcb",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      options: [
        {
          id: "opt-ahamove-2h",
          carrierCode: "AHAMOVE",
          serviceCode: "EXPRESS_2H",
          serviceName: "Giao hỏa tốc 2H",
          sourceLocationId: "wh-danang",
          sourceLocationName: "Kho Trung Tâm Đà Nẵng",
          estimatedFee: 25000,
          estimatedDeliveryTime: "Trong 2 giờ",
          distanceKm: 4.8,
          isAvailable: true,
        },
        {
          id: "opt-ghn-standard",
          carrierCode: "GHN",
          serviceCode: "STANDARD",
          serviceName: "Giao hàng tiêu chuẩn",
          sourceLocationId: "wh-danang",
          sourceLocationName: "Kho Trung Tâm Đà Nẵng",
          estimatedFee: 18000,
          estimatedDeliveryTime: "1-2 ngày làm việc",
          distanceKm: 4.8,
          isAvailable: true,
        },
      ],
    };

    const parsed = shippingQuoteResponseSchema.parse(rawQuote);
    expect(parsed.quoteGroupId).toBe("87a0c10b-554f-4d32-9cb7-e5473778dfcb");
    expect(parsed.options).toHaveLength(2);
    expect(parsed.options[0]?.carrierCode).toBe("AHAMOVE");
    expect(parsed.options[0]?.isAvailable).toBe(true);
    expect(parsed.options[1]?.carrierCode).toBe("GHN");
  });

  it("handles unavailable options with reason (DEC-01 >10km)", () => {
    const rawQuote = {
      quoteGroupId: "87a0c10b-554f-4d32-9cb7-e5473778dfcb",
      expiresAt: new Date().toISOString(),
      options: [
        {
          id: "opt-ahamove-2h",
          carrierCode: "AHAMOVE",
          serviceCode: "EXPRESS_2H",
          serviceName: "Giao hỏa tốc 2H",
          sourceLocationId: "wh-danang",
          sourceLocationName: "Kho Đà Nẵng",
          estimatedFee: 50000,
          estimatedDeliveryTime: "Không khả dụng",
          distanceKm: 14.5,
          isAvailable: false,
          unavailableReason: "Vượt quá bán kính phục vụ 10km (khoảng cách thực tế 14.5km)",
        },
      ],
    };

    const parsed = shippingQuoteResponseSchema.parse(rawQuote);
    expect(parsed.options[0]?.isAvailable).toBe(false);
    expect(parsed.options[0]?.unavailableReason).toContain("10km");
  });

  it("validates createOrderInputSchema forwards quoteGroupId and shippingOptionId", () => {
    const payload = {
      items: [{ variantId: "9c9592e4-098e-432b-a043-ce8c559f4cbb", quantity: 2 }],
      quoteVersion: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      shippingAddress: {
        recipientName: "Nguyễn Văn A",
        phone: "0901234567",
        addressLine: "123 Lê Duẩn",
        ward: "Thạch Thang",
        district: "Hải Châu",
        city: "Đà Nẵng",
      },
      paymentMethod: "COD" as const,
      idempotencyKey: "9c9592e4-098e-432b-a043-ce8c559f4cbb",
      quoteGroupId: "87a0c10b-554f-4d32-9cb7-e5473778dfcb",
      shippingOptionId: "opt-ahamove-2h",
    };

    const parsed = createOrderInputSchema.parse(payload);
    expect(parsed.quoteGroupId).toBe("87a0c10b-554f-4d32-9cb7-e5473778dfcb");
    expect(parsed.shippingOptionId).toBe("opt-ahamove-2h");
  });

  it("validates guest shipping address with two-level divisions (Da Nang - Hai Chau)", () => {
    const guestAddress = {
      recipientName: "Nguyễn Việt Trung",
      phone: "0868935440",
      city: "Thành phố Đà Nẵng",
      ward: "Phường Hải Châu",
      district: "",
      addressLine: "345 Âu Cơ",
      latitude: 16.081009,
      longitude: 108.21843,
    };

    const parsed = shippingSchema.safeParse(guestAddress);
    expect(parsed.success).toBe(true);

    const isCurrent = isCurrentAddress(guestAddress) || isCurrentAddress({ ...guestAddress, district: "" });
    expect(isCurrent).toBe(true);
  });
});
