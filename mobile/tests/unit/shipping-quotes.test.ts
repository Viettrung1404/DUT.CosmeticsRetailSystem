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
import { orderApi, CalculateShippingQuoteInput, ShippingQuoteResponse } from '@/api/orderApi';

describe('MB-01: Real-time Shipping Quotes in Mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. getShippingQuotes should call POST /shipping/quotes with items & address', async () => {
    const mockQuoteResponse: ShippingQuoteResponse = {
      quoteGroupId: 'quote-grp-1234',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      options: [
        {
          id: 'opt-ahamove-2h',
          carrierCode: 'AHAMOVE',
          serviceCode: 'EXPRESS_2H',
          serviceName: 'Hỏa tốc 2H (Ahamove Silk-Drop)',
          sourceLocationId: 'store-1',
          sourceLocationName: 'Showroom Đồng Khởi',
          estimatedFee: 25000,
          estimatedDeliveryTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
          distanceKm: 4.2,
          isAvailable: true,
        },
        {
          id: 'opt-ghn-standard',
          carrierCode: 'GHN',
          serviceCode: 'STANDARD',
          serviceName: 'Giao Tiêu Chuẩn (GHN)',
          sourceLocationId: 'wh-main',
          sourceLocationName: 'Tổng kho Tân Bình',
          estimatedFee: 18000,
          estimatedDeliveryTime: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          distanceKm: 12.5,
          isAvailable: true,
        },
      ],
    };

    (apiClient.post as any).mockResolvedValueOnce({ data: { data: mockQuoteResponse } });

    const quoteInput: CalculateShippingQuoteInput = {
      items: [{ variantId: 'var-sku-001', quantity: 2 }],
      shippingAddress: {
        provinceCity: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        addressLine: '123 Đồng Khởi, Bến Nghé',
      },
    };

    const result = await orderApi.getShippingQuotes(quoteInput);

    expect(apiClient.post).toHaveBeenCalledWith('/shipping/quotes', quoteInput);
    expect(result.quoteGroupId).toBe('quote-grp-1234');
    expect(result.options).toHaveLength(2);
    expect(result.options[0].carrierCode).toBe('AHAMOVE');
    expect(result.options[0].isAvailable).toBe(true);
    expect(result.options[0].estimatedFee).toBe(25000);
  });

  it('2. should correctly identify DEC-01 unavailable reason when Ahamove > 10km', async () => {
    const mockUnavailableQuote: ShippingQuoteResponse = {
      quoteGroupId: 'quote-grp-far-away',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      options: [
        {
          id: 'opt-ahamove-far',
          carrierCode: 'AHAMOVE',
          serviceCode: 'EXPRESS_2H',
          serviceName: 'Hỏa tốc 2H (Ahamove)',
          sourceLocationId: 'store-1',
          estimatedFee: 55000,
          distanceKm: 18.7,
          isAvailable: false,
          unavailableReason: 'Vượt quá bán kính giao hỏa tốc 10km theo chính sách DEC-01',
        },
        {
          id: 'opt-ghn-standard',
          carrierCode: 'GHN',
          serviceCode: 'STANDARD',
          serviceName: 'Giao Tiêu Chuẩn (GHN)',
          sourceLocationId: 'wh-main',
          estimatedFee: 22000,
          isAvailable: true,
        },
      ],
    };

    (apiClient.post as any).mockResolvedValueOnce({ data: { data: mockUnavailableQuote } });

    const result = await orderApi.getShippingQuotes({
      items: [{ variantId: 'var-sku-002', quantity: 1 }],
      shippingAddress: {
        provinceCity: 'Bình Dương',
        district: 'Thủ Dầu Một',
        addressLine: 'Đại lộ Bình Dương',
      },
    });

    const ahamoveOpt = result.options.find((o) => o.carrierCode === 'AHAMOVE');
    expect(ahamoveOpt).toBeDefined();
    expect(ahamoveOpt?.isAvailable).toBe(false);
    expect(ahamoveOpt?.distanceKm).toBe(18.7);
    expect(ahamoveOpt?.unavailableReason).toContain('10km');

    const ghnOpt = result.options.find((o) => o.carrierCode === 'GHN');
    expect(ghnOpt?.isAvailable).toBe(true);
  });

  it('3. createOrder should forward quoteGroupId and shippingOptionId in payload', async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        id: 'order-12345',
        orderNumber: 'GLW-202611-999',
        totalAmount: 495000,
        status: 'CONFIRMED',
      },
    });

    const orderPayload = {
      shippingAddress: {
        recipientName: 'Trần Minh Quân',
        phone: '0909123456',
        addressLine: '456 Lê Duẩn',
        city: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
      },
      paymentMethod: 'COD' as const,
      quoteGroupId: 'quote-grp-1234',
      shippingOptionId: 'opt-ahamove-2h',
    };

    const res = await orderApi.createOrder(orderPayload, 'idemp-quote-test');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/orders',
      orderPayload,
      expect.objectContaining({
        headers: {
          'Idempotency-Key': 'idemp-quote-test',
        },
      })
    );
    expect(res.id).toBe('order-12345');
  });
});
