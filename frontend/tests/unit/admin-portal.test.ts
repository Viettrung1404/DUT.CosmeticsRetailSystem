import { describe, it, expect, vi, beforeEach } from "vitest";
import { ALLOWED_STAFF_ROLES } from "@/shared/auth/roles";
import {
  getStoredStoreScope,
  setStoredStoreScope,
  adminClient,
} from "@/shared/api/admin-client";
import {
  packageDimensionSchema,
  completePackingInputSchema,
} from "@/features/admin-fulfillment/contracts";
import {
  reconcileShipmentInputSchema,
  receiveRtoInputSchema,
} from "@/features/admin-shipping/contracts";
import {
  reconcileBatchInputSchema,
} from "@/features/admin-finance/contracts";
import {
  completeInspectionInputSchema,
} from "@/features/admin-returns/contracts";
import {
  lotQualityDetailSchema,
} from "@/features/admin-analytics/contracts";

describe("Admin Operations Portal Unit Tests (Phase 5: FE-05 to FE-11)", () => {
  describe("FE-05: RBAC Roles & Store Scope Client", () => {
    let storage: Record<string, string> = {};

    beforeEach(() => {
      storage = {};
      vi.stubGlobal("localStorage", {
        getItem: vi.fn((key: string) => storage[key] ?? null),
        setItem: vi.fn((key: string, val: string) => {
          storage[key] = val;
        }),
        removeItem: vi.fn((key: string) => {
          delete storage[key];
        }),
      });
    });

    it("danh sách ALLOWED_STAFF_ROLES chỉ bao gồm các vai trò nhân viên và quản lý nội bộ", () => {
      expect(ALLOWED_STAFF_ROLES).toContain("ADMIN");
      expect(ALLOWED_STAFF_ROLES).toContain("STORE_STAFF");
      expect(ALLOWED_STAFF_ROLES).toContain("STORE_MGR");
      expect(ALLOWED_STAFF_ROLES).toContain("WAREHOUSE_STAFF");
      expect(ALLOWED_STAFF_ROLES).toContain("WH_OPERATOR");
      expect(ALLOWED_STAFF_ROLES).toContain("QC_STAFF");
      expect(ALLOWED_STAFF_ROLES).toContain("FINANCE");
      expect(ALLOWED_STAFF_ROLES).not.toContain("CUSTOMER");
    });

    it("lưu và đọc Store Scope (x-store-id) qua localStorage", () => {
      setStoredStoreScope("store-danang-01");
      expect(getStoredStoreScope()).toBe("store-danang-01");

      setStoredStoreScope(null);
      expect(getStoredStoreScope()).toBeNull();
    });

    it("adminClient tự động gửi header x-store-id khi có phạm vi chi nhánh", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { success: true } }),
      });
      vi.stubGlobal("fetch", mockFetch);

      setStoredStoreScope("store-hcm-q1");
      await adminClient.get("/admin/fulfillment/tasks/picking");

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const headers = (callArgs?.[1] as { headers?: Record<string, string> } | undefined)?.headers;
      expect(headers?.["x-store-id"]).toBe("store-hcm-q1");
    });
  });

  describe("FE-06 & FE-07: WMS Fulfillment & Packing Validation", () => {
    it("kiểm tra validation kích thước và cân nặng kiện hàng phải lớn hơn 0", () => {
      // Hợp lệ
      const valid = packageDimensionSchema.safeParse({
        weight: 0.5,
        length: 20,
        width: 15,
        height: 10,
      });
      expect(valid.success).toBe(true);

      // Cân nặng <= 0
      const invalidWeight = packageDimensionSchema.safeParse({
        weight: 0,
        length: 20,
        width: 15,
        height: 10,
      });
      expect(invalidWeight.success).toBe(false);

      // Chiều dài <= 0
      const invalidLength = packageDimensionSchema.safeParse({
        weight: 1,
        length: -5,
        width: 15,
        height: 10,
      });
      expect(invalidLength.success).toBe(false);
    });

    it("yêu cầu ít nhất 1 kiện hàng khi hoàn tất đóng gói", () => {
      const emptyPackages = completePackingInputSchema.safeParse({
        packages: [],
      });
      expect(emptyPackages.success).toBe(false);

      const validPackages = completePackingInputSchema.safeParse({
        packages: [{ weight: 1.2, length: 25, width: 20, height: 15 }],
      });
      expect(validPackages.success).toBe(true);
    });
  });

  describe("FE-08: Shipment Recovery & RTO Reception", () => {
    it("xác thực schema đối soát sự cố CREATION_UNKNOWN", () => {
      const foundWithTracking = reconcileShipmentInputSchema.safeParse({
        carrierFound: true,
        trackingCode: "GHN-RECONCILED-123",
      });
      expect(foundWithTracking.success).toBe(true);

      const notFound = reconcileShipmentInputSchema.safeParse({
        carrierFound: false,
      });
      expect(notFound.success).toBe(true);
    });

    it("xác thực schema tiếp nhận hàng chuyển hoàn RTO (INTACT vs DAMAGED)", () => {
      const intact = receiveRtoInputSchema.safeParse({
        condition: "INTACT",
        notes: "Bao bì nguyên vẹn",
      });
      expect(intact.success).toBe(true);

      const damaged = receiveRtoInputSchema.safeParse({
        condition: "DAMAGED",
        notes: "Vỡ hộp trong lúc giao",
      });
      expect(damaged.success).toBe(true);

      const invalid = receiveRtoInputSchema.safeParse({
        condition: "UNKNOWN_STATE",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("FE-09: COD Reconciliation Batch", () => {
    it("xác thực schema bảng kê đối soát COD từ GHN/Ahamove", () => {
      const batchPayload = {
        reconciliationCode: "REC-GHN-20261119-01",
        carrierCode: "GHN",
        reconciliationDate: "2026-11-19",
        bankStatementRef: "FT2611198899",
        items: [
          {
            trackingCode: "GHN123456",
            carrierPaidCodAmount: 350000,
            carrierFeeCharged: 22000,
          },
        ],
      };

      const parsed = reconcileBatchInputSchema.safeParse(batchPayload);
      expect(parsed.success).toBe(true);
    });

    it("từ chối bảng kê không có danh sách bưu kiện", () => {
      const emptyBatch = {
        reconciliationCode: "REC-GHN-EMPTY",
        carrierCode: "GHN",
        reconciliationDate: "2026-11-19",
        items: [],
      };

      const parsed = reconcileBatchInputSchema.safeParse(emptyBatch);
      expect(parsed.success).toBe(false);
    });
  });

  describe("FE-10: RMA Operations & QC Disposition", () => {
    it("xác thực biên bản kiểm định chất lượng KCS với 4 loại quyết định tồn kho (Disposition)", () => {
      const validInspection = completeInspectionInputSchema.safeParse({
        generalConditionNotes: "Đã kiểm tra tem seal và bao bì bên ngoài",
        items: [
          {
            returnItemId: "item-001",
            sealCondition: "INTACT",
            packagingCondition: "INTACT",
            disposition: "RESTOCK",
            inspectorNote: "Đạt chuẩn nhập lại kho bán",
          },
          {
            returnItemId: "item-002",
            sealCondition: "BROKEN",
            packagingCondition: "DAMAGED",
            disposition: "SCRAP",
            inspectorNote: "Rách seal và bể chai nước hoa",
          },
        ],
      });

      expect(validInspection.success).toBe(true);
      if (validInspection.success) {
        expect(validInspection.data.items[0]?.disposition).toBe("RESTOCK");
        expect(validInspection.data.items[1]?.disposition).toBe("SCRAP");
      }
    });
  });

  describe("FE-11: Logistics Analytics & Lot Quality Defect Alerts", () => {
    it("phân tích chất lượng theo lô và cảnh báo LOT_DEFECT_ALERT", () => {
      const normalLot = lotQualityDetailSchema.safeParse({
        lotId: "lot-01",
        batchCode: "LOT2026A",
        sku: "SKU-SERUM-01",
        productName: "Serum Vitamin C Glow",
        totalSold: 500,
        totalReturned: 3,
        defectRate: 0.6,
        isDefectAlert: false,
      });
      expect(normalLot.success).toBe(true);
      if (normalLot.success) {
        expect(normalLot.data.isDefectAlert).toBe(false);
      }

      const defectiveLot = lotQualityDetailSchema.safeParse({
        lotId: "lot-02",
        batchCode: "LOT2026B",
        sku: "SKU-CREAM-02",
        productName: "Kem Dưỡng Retinol",
        totalSold: 200,
        totalReturned: 12,
        defectRate: 6.0,
        isDefectAlert: true,
        recommendedAction: "CÁCH LY TOÀN BỘ LÔ TRÊN KỆ",
      });
      expect(defectiveLot.success).toBe(true);
      if (defectiveLot.success) {
        expect(defectiveLot.data.isDefectAlert).toBe(true);
        expect(defectiveLot.data.defectRate).toBeGreaterThanOrEqual(3);
      }
    });
  });
});
