import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UpstashRedisService } from '@core/cache/upstash-redis.service';
import {
  GHNClient,
  GHN_FALLBACK_RATES,
} from '../ghn-client';
import { QuoteRequestDto } from '../../../../domain/dtos/shipping-provider.dto';

describe('GHNClient (EP06-T01)', () => {
  let client: GHNClient;
  let mockRedis: Partial<UpstashRedisService>;
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(async () => {
    const redisStore = new Map<string, any>();
    mockRedis = {
      get: jest.fn().mockImplementation(async (key: string) => redisStore.get(key) || null),
      set: jest.fn().mockImplementation(async (key: string, val: any) => {
        redisStore.set(key, val);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GHNClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => {
              if (key === 'GHN_API_URL') return 'https://online-gateway.ghn.vn/shiip/public-api/v2';
              if (key === 'GHN_API_TOKEN' || key === 'GHN_TOKEN') return 'TEST_GHN_TOKEN_123';
              if (key === 'GHN_SHOP_ID') return '190001';
              if (key === 'GHN_CLIENT_TIMEOUT_MS') return 5000;
              return defaultVal;
            }),
          },
        },
        {
          provide: UpstashRedisService,
          useValue: mockRedis,
        },
      ],
    }).compile();

    client = module.get<GHNClient>(GHNClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AC1: Gửi đúng địa chỉ nhận hàng tại Đà Nẵng, GHN trả về cước phí chuẩn xác', () => {
    it('should calculate shipping fee successfully when GHN API returns 200 OK', async () => {
      const mockFeeResponse = {
        code: 200,
        message: 'Success',
        data: {
          total: 28500,
          service_fee: 25000,
          insurance_fee: 3500,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockFeeResponse,
      } as Response);

      const quoteReq: QuoteRequestDto = {
        carrierCode: 'GHN',
        senderAddress: {
          addressLine: 'Kho Trung Tâm GlowUp, 123 Lê Duẩn',
          province: 'Hồ Chí Minh',
          district: '1444', // Quận 10
          ward: '20314',
        },
        recipientAddress: {
          addressLine: '456 Bạch Đằng, Phường Hải Châu 1',
          province: 'Đà Nẵng',
          district: '1530', // Quận Hải Châu
          ward: '340101',
        },
        parcel: {
          weightGrams: 350,
          lengthCm: 15,
          widthCm: 10,
          heightCm: 8,
        },
        insuranceValueVnd: 500000,
      };

      const result = await client.calculateFee(quoteReq);

      expect(result).toBeDefined();
      expect(result.carrierCode).toBe('GHN');
      expect(result.serviceCode).toBe('GHN_STANDARD');
      expect(result.feeAmountVnd).toBe(28500);
      expect(result.estimatedDeliveryDays).toBe(4); // Khác tỉnh: 4 ngày

      expect(global.fetch).toHaveBeenCalledWith(
        'https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Token: 'TEST_GHN_TOKEN_123',
            ShopId: '190001',
          }),
        }),
      );
    });

    it('should calculate fee for same province delivery (estimated 2 days)', async () => {
      const mockFeeResponse = {
        code: 200,
        message: 'Success',
        data: {
          total: 16500,
          service_fee: 16500,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockFeeResponse,
      } as Response);

      const quoteReq: QuoteRequestDto = {
        carrierCode: 'GHN',
        senderAddress: {
          addressLine: '123 Lê Duẩn, Q1',
          province: 'Hồ Chí Minh',
          district: '1444',
        },
        recipientAddress: {
          addressLine: '789 Nguyễn Trãi, Q5',
          province: 'Hồ Chí Minh',
          district: '1445',
          ward: '20315',
        },
        parcel: {
          weightGrams: 200,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 5,
        },
      };

      const result = await client.calculateFee(quoteReq);
      expect(result.feeAmountVnd).toBe(16500);
      expect(result.estimatedDeliveryDays).toBe(2);
    });
  });

  describe('AC2: Lỗi timeout trả về cước fallback theo bảng giá tĩnh dự phòng', () => {
    it('should return fallback fee (35.000 VND inter-province) when fetch times out', async () => {
      const timeoutError = new Error('The operation was aborted due to timeout');
      timeoutError.name = 'TimeoutError';

      global.fetch = jest.fn().mockRejectedValue(timeoutError);

      const quoteReq: QuoteRequestDto = {
        carrierCode: 'GHN',
        senderAddress: {
          addressLine: 'Kho HCM',
          province: 'Hồ Chí Minh',
          district: '1444',
        },
        recipientAddress: {
          addressLine: 'Đà Nẵng',
          province: 'Đà Nẵng',
          district: '1530',
          ward: '340101',
        },
        parcel: {
          weightGrams: 400,
          lengthCm: 15,
          widthCm: 10,
          heightCm: 10,
        },
      };

      const result = await client.calculateFee(quoteReq);

      expect(result).toBeDefined();
      expect(result.carrierCode).toBe('GHN');
      expect(result.feeAmountVnd).toBe(GHN_FALLBACK_RATES.INTER_PROVINCE_VND); // 35.000 VND
      expect(result.estimatedDeliveryDays).toBe(3);
    });

    it('should return fallback fee (22.000 VND same-province) when fetch throws HTTP error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      } as Response);

      const quoteReq: QuoteRequestDto = {
        carrierCode: 'GHN',
        senderAddress: {
          addressLine: 'Kho HCM',
          province: 'Hồ Chí Minh',
          district: '1444',
        },
        recipientAddress: {
          addressLine: 'Quận 7, HCM',
          province: 'Hồ Chí Minh',
          district: '1448',
          ward: '20320',
        },
        parcel: {
          weightGrams: 200,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 5,
        },
      };

      const result = await client.calculateFee(quoteReq);

      expect(result.feeAmountVnd).toBe(GHN_FALLBACK_RATES.SAME_PROVINCE_VND); // 22.000 VND
    });

    it('should return fallback fee if recipient district cannot be resolved', async () => {
      // Mock getProvinces returning empty
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, data: [] }),
      } as Response);

      const quoteReq: QuoteRequestDto = {
        carrierCode: 'GHN',
        senderAddress: {
          addressLine: 'Kho HCM',
          province: 'Hồ Chí Minh',
          district: '1444',
        },
        recipientAddress: {
          addressLine: 'Đảo không tên',
          province: 'Tỉnh Chưa Biết',
          district: 'Huyện Không Tồn Tại',
        },
        parcel: {
          weightGrams: 100,
          lengthCm: 5,
          widthCm: 5,
          heightCm: 5,
        },
      };

      const result = await client.calculateFee(quoteReq);
      expect(result.feeAmountVnd).toBe(GHN_FALLBACK_RATES.INTER_PROVINCE_VND);
    });
  });

  describe('Address Master Data & Upstash Redis Cache', () => {
    it('should fetch provinces from GHN and store in Redis', async () => {
      const mockProvinces = [
        { ProvinceID: 201, ProvinceName: 'Hà Nội', Code: 'HN' },
        { ProvinceID: 202, ProvinceName: 'Hồ Chí Minh', Code: 'HCM' },
        { ProvinceID: 203, ProvinceName: 'Đà Nẵng', Code: 'DN' },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, data: mockProvinces }),
      } as Response);

      const provinces = await client.getProvinces();
      expect(provinces).toHaveLength(3);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'ghn:address:provinces',
        mockProvinces,
        86400000,
      );

      // Call again: should return from Redis without calling fetch
      (global.fetch as jest.Mock).mockClear();
      const cachedProvinces = await client.getProvinces();
      expect(cachedProvinces).toHaveLength(3);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch districts and cache with provinceId key', async () => {
      const mockDistricts = [
        { DistrictID: 1530, ProvinceID: 203, DistrictName: 'Quận Hải Châu', Code: '1530' },
        { DistrictID: 1531, ProvinceID: 203, DistrictName: 'Quận Thanh Khê', Code: '1531' },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, data: mockDistricts }),
      } as Response);

      const districts = await client.getDistricts(203);
      expect(districts).toHaveLength(2);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'ghn:address:districts:203',
        mockDistricts,
        86400000,
      );
    });

    it('should fetch wards and cache with districtId key', async () => {
      const mockWards = [
        { WardCode: '340101', DistrictID: 1530, WardName: 'Phường Hải Châu 1' },
        { WardCode: '340102', DistrictID: 1530, WardName: 'Phường Hải Châu 2' },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, data: mockWards }),
      } as Response);

      const wards = await client.getWards(1530);
      expect(wards).toHaveLength(2);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'ghn:address:wards:1530',
        mockWards,
        86400000,
      );
    });

    it('should resolve district ID and ward code by fuzzy name', async () => {
      // Mock Redis returning provinces and districts
      (mockRedis.get as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'ghn:address:provinces') {
          return [{ ProvinceID: 203, ProvinceName: 'Đà Nẵng', Code: 'DN' }];
        }
        if (key === 'ghn:address:districts:203') {
          return [{ DistrictID: 1530, ProvinceID: 203, DistrictName: 'Quận Hải Châu', Code: '1530' }];
        }
        if (key === 'ghn:address:wards:1530') {
          return [{ WardCode: '340101', DistrictID: 1530, WardName: 'Phường Hải Châu 1' }];
        }
        return null;
      });

      const districtId = await client.resolveDistrictId('Đà Nẵng', 'Hải Châu');
      expect(districtId).toBe(1530);

      const wardCode = await client.resolveWardCode(1530, 'Hải Châu 1');
      expect(wardCode).toBe('340101');
    });
  });
});
