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
import { orderApi, CreateOrderPayload } from '@/api/orderApi';

describe('orderApi Service (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. createOrder should send POST /orders with Idempotency-Key header', async () => {
    const mockOrderResponse = {
      statusCode: 201,
      success: true,
      data: {
        id: 'ord-uuid-123',
        orderNumber: 'GLW-202611-101',
        totalAmount: 420000,
        status: 'PENDING',
      },
    };

    (apiClient.post as any).mockResolvedValueOnce({ data: mockOrderResponse });

    const payload: CreateOrderPayload = {
      shippingAddress: {
        recipientName: 'Thảo Linh Nguyễn',
        phone: '0912345678',
        addressLine: 'Landmark 81, 720A Điện Biên Phủ',
        city: 'TP. Hồ Chí Minh',
      },
      paymentMethod: 'COD',
      note: 'Giao giờ hành chính',
    };

    const res = await orderApi.createOrder(payload, 'custom-idempotency-key-1');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/orders',
      payload,
      expect.objectContaining({
        headers: {
          'Idempotency-Key': 'custom-idempotency-key-1',
        },
      })
    );
    expect(res).toEqual(mockOrderResponse);
  });

  it('2. previewOrder should call POST /orders/preview', async () => {
    const mockPreview = {
      statusCode: 200,
      success: true,
      data: {
        subtotal: 500000,
        shippingFee: 30000,
        discount: 50000,
        total: 480000,
      },
    };

    (apiClient.post as any).mockResolvedValueOnce({ data: mockPreview });

    const previewPayload = {
      shippingAddress: { city: 'TP. Hồ Chí Minh' },
      items: [{ variantId: 'var-1', quantity: 1 }],
    };

    const res = await orderApi.previewOrder(previewPayload);

    expect(apiClient.post).toHaveBeenCalledWith('/orders/preview', previewPayload);
    expect(res).toEqual(mockPreview);
  });
});
