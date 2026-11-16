import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AhamoveClient, MAX_EXPRESS_RADIUS_KM } from '../ahamove-client';
import { QuoteRequestDto } from '../../../../domain/dtos/shipping-provider.dto';

describe('AhamoveClient (EP07-T01)', () => {
  let client: AhamoveClient;
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AhamoveClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => {
              if (key === 'AHAMOVE_API_URL') return 'https://partner-api.ahamove.com';
              if (key === 'AHAMOVE_API_KEY' || key === 'AHAMOVE_TOKEN') return 'AHAMOVE_SECRET_TOKEN_123';
              if (key === 'AHAMOVE_CLIENT_TIMEOUT_MS') return 5000;
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    client = module.get<AhamoveClient>(AhamoveClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AC1: Gửi đúng 2 điểm đi và đến trong nội thành, Ahamove trả về giá cước hợp lệ', () => {
    it('should calculate estimated fee successfully for SGN-BIKE within 10km radius', async () => {
      const mockEstimateResponse = {
        total_price: 32000,
        service_id: 'SGN-BIKE',
        distance: 4.5,
        duration: 20,
        currency: 'VND',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockEstimateResponse,
      } as Response);

      const quoteReq: QuoteRequestDto = {
        carrierCode: 'AHAMOVE',
        senderAddress: {
          addressLine: 'Showroom GlowUp Q1: 123 Lê Duẩn, P. Bến Nghé',
          province: 'Hồ Chí Minh',
          district: 'Quận 1',
          latitude: 10.7769,
          longitude: 106.7009,
        },
        recipientAddress: {
          addressLine: '789 Nguyễn Trãi, P. 14, Quận 5',
          province: 'Hồ Chí Minh',
          district: 'Quận 5',
          latitude: 10.7554,
          longitude: 106.6675,
        },
        parcel: {
          weightGrams: 500,
          lengthCm: 15,
          widthCm: 12,
          heightCm: 8,
        },
      };

      const result = await client.calculateFee(quoteReq);

      expect(result).toBeDefined();
      expect(result.carrierCode).toBe('AHAMOVE');
      expect(result.serviceCode).toBe('AHAMOVE_EXPRESS_2H');
      expect(result.feeAmountVnd).toBe(32000);
      expect(result.estimatedDeliveryDays).toBe(0); // Giao tức thời trong ngày
      expect(result.estimatedDeliveryAt).toBeDefined();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://partner-api.ahamove.com/v1/order/estimated_fee?token=AHAMOVE_SECRET_TOKEN_123',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"service_id":"SGN-BIKE"'),
        }),
      );
    });

    it('should select HAN-BIKE service_id for Hanoi delivery', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ total_price: 28000, service_id: 'HAN-BIKE' }),
      } as Response);

      const quoteReq: QuoteRequestDto = {
        carrierCode: 'AHAMOVE',
        senderAddress: {
          addressLine: 'Showroom GlowUp Hoàn Kiếm: 45 Tràng Tiền',
          province: 'Hà Nội',
          district: 'Hoàn Kiếm',
          latitude: 21.0285,
          longitude: 105.8542,
        },
        recipientAddress: {
          addressLine: '12 Bà Triệu, Hai Bà Trưng',
          province: 'Hà Nội',
          district: 'Hai Bà Trưng',
          latitude: 21.0074,
          longitude: 105.8524,
        },
        parcel: { weightGrams: 300, lengthCm: 10, widthCm: 10, heightCm: 5 },
      };

      const result = await client.calculateFee(quoteReq);
      expect(result.feeAmountVnd).toBe(28000);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/order/estimated_fee'),
        expect.objectContaining({
          body: expect.stringContaining('"service_id":"HAN-BIKE"'),
        }),
      );
    });
  });

  describe('AC2: Bán kính > 10 km hoặc ngoài vùng phục vụ => Báo lỗi không khả dụng dịch vụ', () => {
    it('should reject request when distance exceeds 10km (DEC-01)', async () => {
      // Khoảng cách từ Quận 1 TP.HCM đến Củ Chi / Biên Hòa (~ 30km)
      const quoteReq: QuoteRequestDto = {
        carrierCode: 'AHAMOVE',
        senderAddress: {
          addressLine: 'Quận 1',
          province: 'Hồ Chí Minh',
          district: 'Quận 1',
          latitude: 10.7769,
          longitude: 106.7009,
        },
        recipientAddress: {
          addressLine: 'Huyện Củ Chi',
          province: 'Hồ Chí Minh',
          district: 'Củ Chi',
          latitude: 11.0067,
          longitude: 106.5134, // ~33km
        },
        parcel: { weightGrams: 200, lengthCm: 10, widthCm: 10, heightCm: 5 },
      };

      await expect(client.calculateFee(quoteReq)).rejects.toThrow(BadRequestException);
      await expect(client.calculateFee(quoteReq)).rejects.toThrow(
        /vượt quá giới hạn phục vụ tối đa 10 km của dịch vụ Hỏa tốc 2H/,
      );
    });

    it('should throw BadRequestException when Ahamove API returns HTTP 400 (out of zone)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'OUT_OF_SERVICE_ZONE',
      } as Response);

      const quoteReq: QuoteRequestDto = {
        carrierCode: 'AHAMOVE',
        senderAddress: {
          addressLine: 'Quận 1',
          province: 'Hồ Chí Minh',
          district: 'Quận 1',
          latitude: 10.7769,
          longitude: 106.7009,
        },
        recipientAddress: {
          addressLine: 'Vùng đồi núi hẻo lánh',
          province: 'Hồ Chí Minh',
          district: 'Quận 1',
          latitude: 10.7770,
          longitude: 106.7010,
        },
        parcel: { weightGrams: 200, lengthCm: 10, widthCm: 10, heightCm: 5 },
      };

      await expect(client.calculateFee(quoteReq)).rejects.toThrow(
        /AHAMOVE_ESTIMATE_FEE_FAILED/,
      );
    });
  });

  describe('Haversine Distance & City Helpers', () => {
    it('should calculate distance with urban winding factor 1.3 correctly', () => {
      const p1 = { latitude: 10.7769, longitude: 106.7009 }; // Q1
      const p2 = { latitude: 10.7554, longitude: 106.6675 }; // Q5 (~4.4km straight, * 1.3 = ~5.7km)

      const dist = client.calculateHaversineDistanceKm(p1, p2);
      expect(dist).toBeGreaterThan(4);
      expect(dist).toBeLessThan(8);
      expect(dist).toBeLessThanOrEqual(MAX_EXPRESS_RADIUS_KM);
    });

    it('should resolve shared-link from GET /v3/orders/{id}/shared-link', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          shared_link: 'https://ahamove.com/share/ORDER_TEST_999',
        }),
      } as Response);

      const link = await client.getSharedLink('ORDER_TEST_999');
      expect(link).toBe('https://ahamove.com/share/ORDER_TEST_999');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://partner-api.ahamove.com/v3/orders/ORDER_TEST_999/shared-link?token=AHAMOVE_SECRET_TOKEN_123',
        expect.anything(),
      );
    });

    it('should return null when getSharedLink fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const link = await client.getSharedLink('ORDER_FAIL');
      expect(link).toBeNull();
    });

    it('should cancel order via POST /v1/order/cancel', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      } as Response);

      const success = await client.cancelOrder('ORDER_CANCEL_01', 'Khách đổi ý');
      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://partner-api.ahamove.com/v1/order/cancel?token=AHAMOVE_SECRET_TOKEN_123',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ order_id: 'ORDER_CANCEL_01', comment: 'Khách đổi ý' }),
        }),
      );
    });
  });
});
