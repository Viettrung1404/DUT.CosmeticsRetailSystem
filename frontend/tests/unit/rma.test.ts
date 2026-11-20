import { describe, expect, it } from "vitest";
import {
  orderEligibilitySchema,
  submitReturnInputSchema,
  returnStatusSchema,
  returnDetailSchema,
  storeLocationsSchema,
} from "../../src/features/post-purchase/contracts";

describe("FE-03: Omnichannel RMA Submission", () => {
  it("parses order return eligibility with policy rules, available return quantities, and video requirements", () => {
    const rawEligibility = {
      orderId: "9c9592e4-098e-432b-a043-ce8c559f4cbb",
      orderCode: "ORD-20261119-001",
      deliveredAt: "2026-11-15T10:00:00.000Z",
      policyVersionName: "Chính sách đổi trả GlowUp v2.1",
      isEligible: true,
      ineligibleReasons: [],
      items: [
        {
          orderItemId: "item-111",
          productId: "prod-1",
          productVariantId: "var-1",
          productName: "Serum Tinh Chất Phục Hồi B5",
          variantName: "Chai 50ml",
          sku: "SERUM-B5-50",
          thumbnailUrl: "https://example.com/b5.png",
          unitPrice: 350000,
          purchasedQuantity: 2,
          alreadyReturnedQuantity: 0,
          availableReturnQuantity: 2,
          isEligible: true,
          allowedRules: [
            {
              reasonCode: "DEFECTIVE",
              windowDays: 30,
              daysRemaining: 26,
              requiresOriginalSeal: false,
              requiresEvidenceVideo: true,
              requiresEvidenceImage: true,
              allowStoreDropoff: true,
              allowCarrierPickup: true,
            },
            {
              reasonCode: "CHANGE_OF_MIND",
              windowDays: 7,
              daysRemaining: 3,
              requiresOriginalSeal: true,
              requiresEvidenceVideo: false,
              requiresEvidenceImage: true,
              allowStoreDropoff: true,
              allowCarrierPickup: true,
            },
          ],
        },
        {
          orderItemId: "item-222",
          productName: "Mặt Nạ Dưỡng Ẩm Chuyên Sâu",
          purchasedQuantity: 5,
          alreadyReturnedQuantity: 5,
          availableReturnQuantity: 0,
          isEligible: false,
          ineligibleReason: "Sản phẩm đã được hoàn trả hết số lượng đã mua",
          allowedRules: [],
        },
      ],
    };

    const parsed = orderEligibilitySchema.parse(rawEligibility);
    expect(parsed.isEligible).toBe(true);
    expect(parsed.policyVersionName).toBe("Chính sách đổi trả GlowUp v2.1");
    expect(parsed.items).toHaveLength(2);

    const item1 = parsed.items[0];
    expect(item1?.availableReturnQuantity).toBe(2);
    expect(item1?.allowedRules).toHaveLength(2);
    expect(item1?.allowedRules[0]?.requiresEvidenceVideo).toBe(true);

    const item2 = parsed.items[1];
    expect(item2?.isEligible).toBe(false);
    expect(item2?.availableReturnQuantity).toBe(0);
  });

  it("validates showroom list schema for STORE_DROPOFF", () => {
    const rawStores = [
      {
        id: "store-danang-1",
        name: "Showroom GlowUp Lê Duẩn",
        code: "STR-DAD-01",
        address: "123 Lê Duẩn, P. Hải Châu 1",
        city: "Đà Nẵng",
        district: "Hải Châu",
        phone: "0236.3888.999",
        openingHours: "08:00 - 22:00 hàng ngày",
      },
    ];

    const parsed = storeLocationsSchema.parse(rawStores);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.name).toBe("Showroom GlowUp Lê Duẩn");
  });

  it("validates submitReturnInputSchema for STORE_DROPOFF and CARRIER_PICKUP", () => {
    // 1. CARRIER_PICKUP
    const carrierClaim = {
      orderId: "9c9592e4-098e-432b-a043-ce8c559f4cbb",
      returnChannel: "CARRIER_PICKUP" as const,
      pickupAddress: {
        recipientName: "Nguyễn Thị B",
        phone: "0912345678",
        addressLine: "456 Nguyễn Tri Phương",
        city: "Đà Nẵng",
      },
      customerNote: "Giao lại buổi sáng giúp mình",
      items: [
        {
          orderItemId: "item-111",
          quantity: 1,
          reasonCode: "DEFECTIVE",
          customerNote: "Vòi bơm bị kẹt không nhấn được",
          evidenceImages: ["att-img-1", "att-img-2"],
          evidenceVideoUrl: "https://storage.glowup.vn/videos/clip1.mp4",
        },
      ],
    };

    const parsedCarrier = submitReturnInputSchema.parse(carrierClaim);
    expect(parsedCarrier.returnChannel).toBe("CARRIER_PICKUP");
    expect(parsedCarrier.items[0]?.evidenceImages).toHaveLength(2);
    expect(parsedCarrier.items[0]?.evidenceVideoUrl).toBe("https://storage.glowup.vn/videos/clip1.mp4");

    // 2. STORE_DROPOFF
    const storeClaim = {
      orderId: "9c9592e4-098e-432b-a043-ce8c559f4cbb",
      returnChannel: "STORE_DROPOFF" as const,
      dropoffLocationId: "store-danang-1",
      items: [
        {
          orderItemId: "item-111",
          quantity: 1,
          reasonCode: "CHANGE_OF_MIND",
          evidenceImages: ["att-img-3"],
        },
      ],
    };

    const parsedStore = submitReturnInputSchema.parse(storeClaim);
    expect(parsedStore.returnChannel).toBe("STORE_DROPOFF");
    expect(parsedStore.dropoffLocationId).toBe("store-danang-1");
  });

  it("rejects RMA submission without evidence images", () => {
    const invalidClaim = {
      orderId: "9c9592e4-098e-432b-a043-ce8c559f4cbb",
      returnChannel: "STORE_DROPOFF",
      dropoffLocationId: "store-danang-1",
      items: [
        {
          orderItemId: "item-111",
          quantity: 1,
          reasonCode: "CHANGE_OF_MIND",
          evidenceImages: [], // Invalid: min 1 required
        },
      ],
    };

    expect(() => submitReturnInputSchema.parse(invalidClaim)).toThrow();
  });
});

describe("FE-04: RMA List & Detail (11 Statuses & QC Inspection)", () => {
  it("supports all 11 RMA statuses in returnStatusSchema", () => {
    const allStatuses = [
      "DRAFT",
      "SUBMITTED",
      "REQUESTED",
      "APPROVED",
      "REJECTED",
      "SHIPPED",
      "RECEIVED",
      "INSPECTING",
      "INSPECTED",
      "RESOLUTION_PENDING",
      "DISPUTED",
      "COMPLETED",
      "CANCELLED",
    ];

    for (const status of allStatuses) {
      expect(returnStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("parses full returnDetailSchema with Showroom dropoff, QC outcomes, and refund summary", () => {
    const rawDetail = {
      id: "ret-12345",
      returnCode: "RET-20261119-0001",
      orderId: "9c9592e4-098e-432b-a043-ce8c559f4cbb",
      returnType: "REFUND",
      status: "COMPLETED",
      reason: "DEFECTIVE",
      refundAmount: 350000,
      createdAt: "2026-11-19T09:00:00.000Z",
      returnChannel: "STORE_DROPOFF",
      dropoffLocation: {
        id: "store-danang-1",
        name: "Showroom GlowUp Lê Duẩn",
        address: "123 Lê Duẩn, Đà Nẵng",
        phone: "0236.3888.999",
      },
      order: {
        orderNumber: "ORD-20261119-001",
        totalAmount: 350000,
        createdAt: "2026-11-15T10:00:00.000Z",
      },
      policyVersion: {
        id: "pol-v2",
        versionName: "Chính sách bảo hành đổi trả v2.1",
      },
      items: [
        {
          id: "ret-item-1",
          orderItemId: "item-111",
          quantity: 1,
          reasonCode: "DEFECTIVE",
          inspectionStatus: "PASSED",
          inspectionCondition: "DEFECTIVE",
          disposition: "SCRAP",
          inspectionNote: "Xác nhận vòi nhấn bị lỗi kẹt cơ học của nhà sản xuất.",
          refundAmount: 350000,
          evidenceImages: ["att-1"],
          evidenceVideoUrl: "https://storage.glowup.vn/videos/clip1.mp4",
          variant: {
            sku: "SERUM-B5-50",
            option1Value: "Chai 50ml",
            price: 350000,
            product: {
              name: "Serum Tinh Chất Phục Hồi B5",
            },
          },
        },
      ],
      refunds: [
        {
          id: "ref-001",
          amount: 350000,
          status: "COMPLETED",
        },
      ],
      history: [
        { status: "SUBMITTED", note: "Khách nộp yêu cầu trực tuyến", createdAt: "2026-11-19T09:00:00.000Z" },
        { status: "RECEIVED", note: "Showroom tiếp nhận sản phẩm", createdAt: "2026-11-19T10:30:00.000Z" },
        { status: "INSPECTING", note: "QC bắt đầu kiểm tra", createdAt: "2026-11-19T10:45:00.000Z" },
        { status: "COMPLETED", note: "Hoàn tiền 350.000đ thành công", createdAt: "2026-11-19T11:00:00.000Z" },
      ],
    };

    const parsed = returnDetailSchema.parse(rawDetail);
    expect(parsed.returnCode).toBe("RET-20261119-0001");
    expect(parsed.status).toBe("COMPLETED");
    expect(parsed.dropoffLocation?.name).toBe("Showroom GlowUp Lê Duẩn");
    expect(parsed.items).toHaveLength(1);

    const item = parsed.items[0];
    expect(item?.inspectionStatus).toBe("PASSED");
    expect(item?.inspectionCondition).toBe("DEFECTIVE");
    expect(item?.disposition).toBe("SCRAP");
    expect(item?.inspectionNote).toContain("lỗi kẹt cơ học");
    expect(parsed.refunds).toHaveLength(1);
    expect(parsed.history).toHaveLength(4);
  });
});
