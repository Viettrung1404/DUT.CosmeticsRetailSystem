import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isStaffUser,
  verifyPickingBarcode,
  isPickingListComplete,
  calculatePickingProgress,
  verifyDropoffEligibility,
  PickItemState,
} from '../../src/utils/staffOperationsHelper';
import { staffFulfillmentApi } from '../../src/api/staffFulfillmentApi';
import apiClient from '../../src/api/apiClient';

vi.mock('../../src/api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Staff Operations Helper & Fulfillment Logic (Phase 4)', () => {
  describe('RBAC Role Checker (isStaffUser)', () => {
    it('cho phép các role nhân viên và quản lý truy cập Staff Mode', () => {
      expect(isStaffUser({ roleName: 'STORE_STAFF' })).toBe(true);
      expect(isStaffUser({ roleName: 'store_staff' })).toBe(true);
      expect(isStaffUser({ roleName: 'STORE_MGR' })).toBe(true);
      expect(isStaffUser({ roleName: 'ADMIN' })).toBe(true);
      expect(isStaffUser({ roleName: 'STAFF' })).toBe(true);
      expect(isStaffUser({ roleName: 'WH_OPERATOR' })).toBe(true);
      expect(isStaffUser({ roleName: 'WH_SUPERVISOR' })).toBe(true);
      expect(isStaffUser({ role: 'MANAGER' })).toBe(true);
    });

    it('từ chối tài khoản CUSTOMER và người dùng vãng lai', () => {
      expect(isStaffUser({ roleName: 'CUSTOMER' })).toBe(false);
      expect(isStaffUser({ role: 'customer' })).toBe(false);
      expect(isStaffUser(null)).toBe(false);
      expect(isStaffUser(undefined)).toBe(false);
      expect(isStaffUser({})).toBe(false);
      expect(isStaffUser({ roleName: 'GUEST' })).toBe(false);
    });
  });

  describe('MB-05: Picking Scanner & Barcode FEFO Verification', () => {
    const mockItem: PickItemState = {
      variantId: 'var-son-001',
      sku: 'SKU-LIP-ROSE',
      barcode: '8936001122334',
      productName: 'Son Dưỡng Rose Glow',
      lotId: 'lot-2026-01',
      batchCode: 'LOT2026A',
      expiryDate: '2027-12-31',
      quantity: 2,
      pickedCount: 0,
    };

    it('khớp chính xác khi quét đúng Barcode sản phẩm', () => {
      const res = verifyPickingBarcode('8936001122334', mockItem);
      expect(res.success).toBe(true);
      expect(res.type).toBe('EXACT_MATCH');
      expect(res.matchedVariantId).toBe('var-son-001');
    });

    it('khớp chính xác khi quét đúng SKU sản phẩm', () => {
      const res = verifyPickingBarcode('SKU-LIP-ROSE', mockItem);
      expect(res.success).toBe(true);
      expect(res.type).toBe('EXACT_MATCH');
    });

    it('khớp chính xác khi quét barcode tổng hợp SKU và Lô FEFO chỉ định', () => {
      const res = verifyPickingBarcode('SKU-LIP-ROSE|LOT2026A', mockItem);
      expect(res.success).toBe(true);
      expect(res.type).toBe('EXACT_MATCH');
    });

    it('cảnh báo lỗi WRONG_BATCH khi quét đúng SKU nhưng sai Lô FEFO chỉ định', () => {
      const res = verifyPickingBarcode('SKU-LIP-ROSE|LOT2025OLD', mockItem);
      expect(res.success).toBe(false);
      expect(res.type).toBe('WRONG_BATCH');
      expect(res.message).toContain('Sai số lô');
      expect(res.message).toContain('LOT2026A');
    });

    it('cảnh báo lỗi WRONG_SKU khi quét mã không liên quan', () => {
      const res = verifyPickingBarcode('WRONG-BARCODE-999', mockItem);
      expect(res.success).toBe(false);
      expect(res.type).toBe('WRONG_SKU');
      expect(res.message).toContain('không khớp');
    });

    it('chặn quét thêm khi sản phẩm đã nhặt đủ số lượng (ALREADY_COMPLETED)', () => {
      const completedItem: PickItemState = {
        ...mockItem,
        pickedCount: 2,
      };
      const res = verifyPickingBarcode('8936001122334', completedItem);
      expect(res.success).toBe(false);
      expect(res.type).toBe('ALREADY_COMPLETED');
      expect(res.message).toContain('đã nhặt đủ số lượng');
    });

    it('tính toán chính xác tiến độ nhặt hàng và kiểm tra hoàn tất 100%', () => {
      const items: PickItemState[] = [
        { ...mockItem, quantity: 2, pickedCount: 2 },
        {
          variantId: 'var-cream-002',
          sku: 'SKU-CREAM-01',
          productName: 'Kem Dưỡng Ẩm',
          batchCode: 'LOT2026B',
          quantity: 3,
          pickedCount: 1,
        },
      ];

      expect(isPickingListComplete(items)).toBe(false);
      let progress = calculatePickingProgress(items);
      expect(progress.totalRequired).toBe(5);
      expect(progress.totalPicked).toBe(3);
      expect(progress.percentage).toBe(60);
      expect(progress.isComplete).toBe(false);

      // Nhặt nốt 2 sản phẩm còn lại
      items[1].pickedCount = 3;
      expect(isPickingListComplete(items)).toBe(true);
      progress = calculatePickingProgress(items);
      expect(progress.totalPicked).toBe(5);
      expect(progress.percentage).toBe(100);
      expect(progress.isComplete).toBe(true);
    });
  });

  describe('MB-06: Handover Tracking Code & Concurrency', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('gọi API lấy danh sách kiện hàng chờ bàn giao theo chi nhánh', async () => {
      (apiClient.get as any).mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'fo-001',
              fulfillmentOrderNumber: 'FO-20261119-001',
              status: 'PACKED',
              shippingServiceCode: 'GHN_STANDARD',
              trackingCode: 'GHN123456',
            },
          ],
          total: 1,
        },
      });

      const res = await staffFulfillmentApi.getHandoverQueue({ storeId: 'store-danang-01' });
      expect(apiClient.get).toHaveBeenCalledWith('/admin/fulfillment/tasks/handover', {
        params: { storeId: 'store-danang-01' },
      });
      expect(res.items.length).toBe(1);
      expect(res.items[0].trackingCode).toBe('GHN123456');
    });

    it('gọi API xác nhận bàn giao kiện hàng cho tài xế', async () => {
      (apiClient.post as any).mockResolvedValueOnce({
        data: {
          success: true,
          status: 'HANDED_OVER',
          orderStatus: 'IN_TRANSIT',
          fulfillmentOrderId: 'fo-001',
          shipmentId: 'ship-001',
          trackingCode: 'AHA998877',
        },
      });

      const res = await staffFulfillmentApi.confirmHandover('fo-001', {
        driverName: 'Nguyễn Văn Tài',
        driverPhone: '0905123456',
        driverLicensePlate: '43C-12345',
        note: 'Bàn giao ca sáng Ahamove',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/admin/fulfillment-orders/fo-001/confirm-handover',
        {
          driverName: 'Nguyễn Văn Tài',
          driverPhone: '0905123456',
          driverLicensePlate: '43C-12345',
          note: 'Bàn giao ca sáng Ahamove',
        }
      );
      expect(res.status).toBe('HANDED_OVER');
      expect(res.success).toBe(true);
    });
  });

  describe('MB-07: Store Drop-off Receipt Eligibility & Quarantined Inventory', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('cho phép tiếp nhận khi hồ sơ hợp lệ và đúng showroom chỉ định', () => {
      const validRma = {
        id: 'rma-123',
        returnChannel: 'STORE_DROPOFF',
        status: 'APPROVED',
        dropoffLocationId: 'store-dn-01',
        dropoffLocation: { name: 'Showroom Đà Nẵng Hải Châu' },
      };

      const result = verifyDropoffEligibility(validRma, 'store-dn-01');
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('từ chối tiếp nhận khi khách mang nhầm showroom', () => {
      const wrongStoreRma = {
        id: 'rma-123',
        returnChannel: 'STORE_DROPOFF',
        status: 'SUBMITTED',
        dropoffLocationId: 'store-hcm-q1',
        dropoffLocation: { name: 'Showroom TP.HCM Quận 1' },
      };

      const result = verifyDropoffEligibility(wrongStoreRma, 'store-dn-01');
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Showroom [Showroom TP.HCM Quận 1]');
      expect(result.reason).toContain('mang nhầm cửa hàng tiếp nhận');
    });

    it('từ chối tiếp nhận khi hồ sơ không phải hình thức STORE_DROPOFF', () => {
      const postalRma = {
        id: 'rma-456',
        returnChannel: 'POSTAL_RETURN',
        status: 'APPROVED',
        dropoffLocationId: 'store-dn-01',
      };

      const result = verifyDropoffEligibility(postalRma, 'store-dn-01');
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('không phải trả tại Showroom');
    });

    it('từ chối tiếp nhận khi trạng thái RMA không hợp lệ (ví dụ REJECTED, COMPLETED)', () => {
      const rejectedRma = {
        id: 'rma-789',
        returnChannel: 'STORE_DROPOFF',
        status: 'REJECTED',
        dropoffLocationId: 'store-dn-01',
      };

      const result = verifyDropoffEligibility(rejectedRma, 'store-dn-01');
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('REJECTED');
    });

    it('gọi API tiếp nhận tại quầy và ghi nhận phiếu tiếp nhận ReturnReceipt', async () => {
      (apiClient.post as any).mockResolvedValueOnce({
        data: {
          receipt: {
            id: 'rcp-001',
            receiptCode: 'RCP-20261119-1234',
            returnOrderId: 'rma-123',
            locationId: 'store-dn-01',
            receivedBy: 'staff-user-01',
            receivedItemsCount: 2,
            packageConditionNote: 'Bao bì nguyên vẹn, seal chưa bóc',
            createdAt: '2026-11-19T10:00:00Z',
          },
          returnOrder: {
            id: 'rma-123',
            status: 'RECEIVED',
          },
        },
      });

      const res = await staffFulfillmentApi.receiveStoreDropoff('rma-123', {
        packageConditionNote: 'Bao bì nguyên vẹn, seal chưa bóc',
        receivedItemsCount: 2,
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/admin/returns/rma-123/receive-at-store',
        {
          packageConditionNote: 'Bao bì nguyên vẹn, seal chưa bóc',
          receivedItemsCount: 2,
        }
      );
      expect(res.receipt.receiptCode).toBe('RCP-20261119-1234');
      expect(res.returnOrder.status).toBe('RECEIVED');
    });
  });
});
