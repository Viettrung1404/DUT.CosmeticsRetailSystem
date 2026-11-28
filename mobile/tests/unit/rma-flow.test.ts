import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from '@/api/apiClient';
import {
  orderApi,
  OrderReturnEligibility,
  CreateRmaPayload,
  StoreLocation,
} from '@/api/orderApi';
import { RMA_STATUS_MAP } from '@/utils/rmaHelper';

describe('MB-03 & MB-04: Real RMA Request & Tracking in Mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. getOrderReturnEligibility should call GET /customers/me/orders/:id/return-eligibility', async () => {
    const mockEligibility: OrderReturnEligibility = {
      orderId: 'order-uuid-99',
      orderNumber: 'GLW-202611-100',
      deliveredAt: '2026-11-15T08:00:00.000Z',
      policyVersionId: 'pol-v3.1',
      isEligibleForReturn: true,
      items: [
        {
          orderItemId: 'item-101',
          variantId: 'var-sku-101',
          productName: 'Toner Hoa Cúc Calendula 250ml',
          unitPrice: 280000,
          paidQuantity: 2,
          alreadyReturnedQuantity: 0,
          availableReturnQuantity: 2,
          allowedReasons: ['DAMAGED_IN_TRANSIT', 'DEFECTIVE', 'CHANGE_OF_MIND'],
        },
      ],
      allowedRules: [
        {
          reasonCode: 'DAMAGED_IN_TRANSIT',
          requiresUnopenedSeal: false,
          requiresEvidenceVideo: true,
          maxReturnWindowDays: 2,
          customerPaysReturnShipping: false,
        },
      ],
    };

    (apiClient.get as any).mockResolvedValueOnce({ data: { data: mockEligibility } });

    const res = await orderApi.getOrderReturnEligibility('order-uuid-99');

    expect(apiClient.get).toHaveBeenCalledWith(
      '/customers/me/orders/order-uuid-99/return-eligibility'
    );
    expect(res.isEligibleForReturn).toBe(true);
    expect(res.items[0].availableReturnQuantity).toBe(2);
    expect(res.allowedRules?.[0].requiresEvidenceVideo).toBe(true);
  });

  it('2. getStores should return real store list from GET /stores for Store Drop-off', async () => {
    const mockStores: StoreLocation[] = [
      {
        id: 'store-dk',
        name: 'GlowUp Flagship Showroom Đồng Khởi',
        address: '123 Đồng Khởi, Quận 1, TP. Hồ Chí Minh',
        phone: '028 3822 1234',
        openingHours: '08:30 – 22:00',
      },
    ];

    (apiClient.get as any).mockResolvedValueOnce({ data: { data: mockStores } });

    const stores = await orderApi.getStores();

    expect(apiClient.get).toHaveBeenCalledWith('/stores');
    expect(stores).toHaveLength(1);
    expect(stores[0].name).toContain('Đồng Khởi');
  });

  it('3. createReturnRequest should submit Omnichannel RMA with STORE_DROPOFF', async () => {
    const rmaPayload: CreateRmaPayload = {
      orderId: 'order-uuid-99',
      returnChannel: 'STORE_DROPOFF',
      dropoffLocationId: 'store-dk',
      customerNote: 'Mang hàng ra showroom buổi sáng',
      items: [
        {
          orderItemId: 'item-101',
          quantity: 1,
          reasonCode: 'DEFECTIVE',
          customerNote: 'Sản phẩm đổi màu và mùi lạ',
          evidenceImages: ['attachment-id-img-01'],
          evidenceVideoUrl: 'attachment-id-vid-01',
        },
      ],
    };

    const mockCreatedRma = {
      id: 'rma-uuid-888',
      returnNumber: 'RMA-202611-001',
      status: 'SUBMITTED',
      returnChannel: 'STORE_DROPOFF',
    };

    (apiClient.post as any).mockResolvedValueOnce({ data: { data: mockCreatedRma } });

    const created = await orderApi.createReturnRequest(rmaPayload, 'custom-idemp-rma');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/returns',
      rmaPayload,
      expect.objectContaining({
        headers: {
          'Idempotency-Key': 'custom-idemp-rma',
        },
      })
    );
    expect(created.returnNumber).toBe('RMA-202611-001');
  });

  it('4. getReturnDetail should fetch RMA detail with QC and financial resolution', async () => {
    const mockRmaDetail = {
      id: 'rma-uuid-888',
      returnCode: 'RMA-202611-001',
      status: 'INSPECTED',
      returnChannel: 'STORE_DROPOFF',
      refundAmount: 280000,
      totalRefundApproved: 280000,
      items: [
        {
          id: 'rma-item-1',
          quantity: 1,
          condition: 'DEFECTIVE',
          note: 'Biến chất màng nhũ tương, đủ chuẩn hoàn tiền 100%',
        },
      ],
    };

    (apiClient.get as any).mockResolvedValueOnce({ data: { data: mockRmaDetail } });

    const detail = await orderApi.getReturnDetail('rma-uuid-888');

    expect(apiClient.get).toHaveBeenCalledWith('/returns/rma-uuid-888');
    expect(detail.status).toBe('INSPECTED');
    expect(detail.items[0].condition).toBe('DEFECTIVE');
  });

  it('5. RMA_STATUS_MAP should support all 11 RMA statuses correctly', () => {
    const expectedStatuses = [
      'DRAFT',
      'SUBMITTED',
      'REQUESTED',
      'APPROVED',
      'SHIPPED',
      'RECEIVED',
      'INSPECTING',
      'INSPECTED',
      'RESOLUTION_PENDING',
      'DISPUTED',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
    ];

    expectedStatuses.forEach((st) => {
      expect(RMA_STATUS_MAP[st]).toBeDefined();
      expect(RMA_STATUS_MAP[st].label).toBeTruthy();
      expect(RMA_STATUS_MAP[st].color).toBeTruthy();
      expect(RMA_STATUS_MAP[st].stepIndex).toBeGreaterThanOrEqual(0);
    });
  });
});
