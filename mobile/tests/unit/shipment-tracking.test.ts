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
import { orderApi } from '@/api/orderApi';
import { TrackingData } from '@/screens/order/ShipmentTrackingScreen';

describe('MB-02: Multi-package Tracking & Ahamove Live Map', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. getOrderTracking should fetch order tracking with multiple shipments and packages', async () => {
    const mockTrackingData: TrackingData = {
      id: 'ord-split-100',
      status: 'PARTIALLY_DELIVERED',
      shipments: [
        {
          id: 'shipment-1',
          shipmentCode: 'SHIP-GLW-01',
          carrierCode: 'AHAMOVE',
          carrierServiceCode: 'EXPRESS_2H',
          trackingCode: 'AHA-HCM-998822',
          trackingUrl: 'https://tracking.ahamove.com/share/route/live-abc123xyz',
          status: 'OUT_FOR_DELIVERY',
          failedAttempts: 0,
          packages: [
            {
              package: {
                id: 'pkg-1',
                packageCode: 'PKG-01',
                actualWeightGrams: 450,
                items: [
                  {
                    quantity: 1,
                    variant: {
                      sku: 'ROSE-SERUM-50ML',
                      option1Value: '50ml',
                      product: { name: 'Serum Rose Berry B5' },
                    },
                  },
                ],
              },
            },
          ],
          events: [
            {
              id: 'ev-1',
              status: 'OUT_FOR_DELIVERY',
              occurredAt: '2026-11-19T10:30:00.000Z',
              description: 'Tài xế đang giao hàng',
              location: 'Quận 1, TP. Hồ Chí Minh',
            },
          ],
        },
        {
          id: 'shipment-2',
          shipmentCode: 'SHIP-GLW-02',
          carrierCode: 'GHN',
          carrierServiceCode: 'STANDARD',
          trackingCode: 'GHN-VN-445566',
          status: 'DELIVERED',
          failedAttempts: 1,
          attempts: [
            {
              id: 'att-1',
              attemptNumber: 1,
              attemptedAt: '2026-11-18T16:00:00.000Z',
              failureReasonCode: 'RECIPIENT_UNREACHABLE',
              failureReasonDetail: 'Người nhận không bắt máy, hẹn giao lại',
            },
          ],
          packages: [
            {
              package: {
                id: 'pkg-2',
                packageCode: 'PKG-02',
                actualWeightGrams: 850,
                items: [
                  {
                    quantity: 2,
                    variant: {
                      sku: 'CREAM-BARRIER-50G',
                      option1Value: '50g',
                      product: { name: 'Kem Dưỡng Barrier Cream' },
                    },
                  },
                ],
              },
            },
          ],
          events: [
            {
              id: 'ev-2',
              status: 'DELIVERED',
              occurredAt: '2026-11-19T09:00:00.000Z',
              description: 'Đã giao hàng thành công',
            },
          ],
        },
      ],
    };

    (apiClient.get as any).mockResolvedValueOnce({ data: { data: mockTrackingData } });

    const result = await orderApi.getOrderTracking('ord-split-100');

    expect(apiClient.get).toHaveBeenCalledWith('/orders/ord-split-100/tracking');
    expect(result.shipments).toHaveLength(2);

    // Kiện 1: Ahamove có live map
    const pkg1 = result.shipments[0];
    expect(pkg1.carrierCode).toBe('AHAMOVE');
    expect(pkg1.trackingUrl).toContain('tracking.ahamove.com');
    expect(pkg1.packages[0].package.actualWeightGrams).toBe(450);

    // Kiện 2: GHN có failed attempt history
    const pkg2 = result.shipments[1];
    expect(pkg2.carrierCode).toBe('GHN');
    expect(pkg2.status).toBe('DELIVERED');
    expect(pkg2.attempts).toHaveLength(1);
    expect(pkg2.attempts[0].failureReasonCode).toBe('RECIPIENT_UNREACHABLE');
  });
});
