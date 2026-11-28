import { describe, expect, it } from "vitest";
import { trackingSchema, shipmentTrackingSchema } from "../../src/features/account/contracts";

describe("FE-02: Multi-package Shipment Tracking", () => {
  it("parses multi-package shipments with individual tracking codes, weights, and items", () => {
    const rawData = {
      id: "9c9592e4-098e-432b-a043-ce8c559f4cbb",
      status: "SHIPPING",
      statusHistories: [
        { status: "CONFIRMED", createdAt: "2026-11-19T08:00:00.000Z" },
        { status: "PROCESSING", createdAt: "2026-11-19T08:30:00.000Z" },
        { status: "SHIPPING", createdAt: "2026-11-19T09:00:00.000Z" },
      ],
      shipments: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          shipmentCode: "SHIP-001",
          carrierCode: "AHAMOVE",
          carrierServiceCode: "EXPRESS_2H",
          trackingCode: "AHA-TRACK-1234",
          status: "DELIVERING",
          trackingUrl: "https://ahamove.com/tracking/AHA-TRACK-1234?token=live123",
          failedAttempts: 0,
          packages: [
            {
              id: "pkg-1",
              packageCode: "PKG-001",
              actualWeightGrams: 450,
              items: [
                {
                  quantity: 1,
                  productName: "Serum Trắng Da Vitamin C",
                  variantName: "Chai 30ml",
                },
              ],
            },
          ],
          attempts: [],
          events: [
            {
              id: "evt-1",
              status: "PICKED_UP",
              occurredAt: "2026-11-19T09:15:00.000Z",
            },
            {
              id: "evt-2",
              status: "DELIVERING",
              occurredAt: "2026-11-19T09:30:00.000Z",
            },
          ],
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          shipmentCode: "SHIP-002",
          carrierCode: "GHN",
          carrierServiceCode: "STANDARD",
          trackingCode: "GHN-TRACK-5678",
          status: "READY_FOR_DISPATCH",
          trackingUrl: "https://tracking.ghn.vn/?order_code=GHN-TRACK-5678",
          failedAttempts: 0,
          packages: [
            {
              id: "pkg-2",
              packageCode: "PKG-002",
              actualWeightGrams: 1200,
              items: [
                {
                  quantity: 2,
                  productName: "Sữa Rửa Mặt Dịu Nhẹ",
                  variantName: "Tuýp 150ml",
                },
              ],
            },
          ],
          attempts: [],
          events: [
            {
              id: "evt-3",
              status: "READY_FOR_DISPATCH",
              occurredAt: "2026-11-19T09:00:00.000Z",
            },
          ],
        },
      ],
    };

    const parsed = trackingSchema.parse(rawData);
    expect(parsed.shipments).toHaveLength(2);

    // Package 1: Ahamove Live Tracking Map
    const pkg1 = parsed.shipments[0];
    expect(pkg1?.carrierCode).toBe("AHAMOVE");
    expect(pkg1?.trackingCode).toBe("AHA-TRACK-1234");
    expect(pkg1?.trackingUrl).toContain("ahamove.com/tracking");
    expect(pkg1?.packages).toHaveLength(1);
    expect(pkg1?.packages[0]?.actualWeightGrams).toBe(450);
    expect(pkg1?.packages[0]?.items[0]?.productName).toBe("Serum Trắng Da Vitamin C");

    // Package 2: GHN Standard
    const pkg2 = parsed.shipments[1];
    expect(pkg2?.carrierCode).toBe("GHN");
    expect(pkg2?.packages[0]?.actualWeightGrams).toBe(1200);
    expect(pkg2?.packages[0]?.items[0]?.quantity).toBe(2);
  });

  it("handles delivery retry and failure history correctly", () => {
    const rawShipment = {
      id: "33333333-3333-3333-3333-333333333333",
      carrierCode: "GHN",
      trackingCode: "GHN-RETRY-999",
      status: "DELIVERY_FAILED",
      failedAttempts: 2,
      packages: [],
      attempts: [
        {
          attemptNumber: 1,
          attemptedAt: "2026-11-18T10:00:00.000Z",
          failureReasonCode: "CONTACT_FAILED",
          failureReasonDetail: "Không liên lạc được với khách hàng",
        },
        {
          attemptNumber: 2,
          attemptedAt: "2026-11-19T10:00:00.000Z",
          failureReasonCode: "CUSTOMER_RESCHEDULED",
          failureReasonDetail: "Khách hẹn giao lại vào buổi chiều",
        },
      ],
      events: [],
    };

    const parsed = shipmentTrackingSchema.parse(rawShipment);
    expect(parsed.failedAttempts).toBe(2);
    expect(parsed.attempts).toHaveLength(2);
    expect(parsed.attempts[0]?.failureReasonCode).toBe("CONTACT_FAILED");
    expect(parsed.attempts[1]?.failureReasonDetail).toContain("Khách hẹn giao lại");
  });
});
