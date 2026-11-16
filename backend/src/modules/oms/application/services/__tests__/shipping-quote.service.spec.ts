import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CACHE_SERVICE } from '@core/cache/cache.service.interface';
import { LocationService } from '@modules/inventory/application/services/location.service';
import { InventoryBalanceService } from '@modules/inventory/application/services/inventory-balance.service';
import { DistanceCalculatorService } from '../distance-calculator.service';
import { ShippingQuoteService } from '../shipping-quote.service';
import { CalculateShippingQuoteDto } from '../../../presentation/dtos/shipping-quote.dto';

describe('ShippingQuoteService', () => {
  let service: ShippingQuoteService;
  let prisma: any;
  let distanceCalculator: any;
  let locationService: any;
  let inventoryBalanceService: any;
  let cacheService: any;

  const mockStoreQ1 = {
    id: 'store-q1-id',
    code: 'STORE-03',
    name: 'Showroom Quận 1',
    type: 'STORE',
    city: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    address: '45 Lê Lợi',
    latitude: 10.7745,
    longitude: 106.7009,
    openingHours: { mon_sun: '08:00-22:00' },
    fulfillmentCapacityPerDay: 500,
    isActive: true,
  };

  const mockStoreQ10 = {
    id: 'store-q10-id',
    code: 'STORE-06',
    name: 'Showroom Quận 10',
    type: 'STORE',
    city: 'TP. Hồ Chí Minh',
    district: 'Quận 10',
    address: '280 Ba Tháng Hai',
    latitude: 10.7746,
    longitude: 106.6669,
    openingHours: { mon_sun: '08:00-22:00' },
    fulfillmentCapacityPerDay: 500,
    isActive: true,
  };

  const mockWarehouseTB = {
    id: 'wh-tb-id',
    code: 'WH-TB',
    name: 'Tổng kho Tân Bình',
    type: 'WAREHOUSE',
    city: 'TP. Hồ Chí Minh',
    district: 'Tân Phú',
    address: 'KCN Tân Bình',
    latitude: 10.8142,
    longitude: 106.6264,
    openingHours: { mon_sat: '07:30-18:00' },
    fulfillmentCapacityPerDay: 2500,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      store: {
        findMany: jest.fn().mockResolvedValue([mockStoreQ1, mockStoreQ10, mockWarehouseTB]),
      },
      shippingQuote: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn(),
      },
    };

    distanceCalculator = {
      resolveCoordinates: jest.fn().mockReturnValue({ latitude: 10.75, longitude: 106.65 }),
      calculateDistance: jest.fn().mockResolvedValue({
        distanceKm: 4.5,
        provider: 'HAVERSINE_FALLBACK',
        isFallback: true,
        durationMinutes: 10,
      }),
    };

    locationService = {
      checkIsOpenNow: jest.fn().mockReturnValue({ isOpenNow: true, currentLocalTime: '10:00', todayOpeningHours: '08:00-22:00' }),
      getLocationCapacity: jest.fn().mockResolvedValue({
        locationId: 'some-id',
        isCapacityAvailable: true,
        allocatedOrdersToday: 50,
        maxCapacityPerDay: 500,
      }),
    };

    inventoryBalanceService = {
      checkAvailability: jest.fn().mockResolvedValue({
        locationId: 'some-id',
        isAvailable: true,
        shortfalls: [],
      }),
    };

    const cacheStore = new Map<string, any>();
    cacheService = {
      get: jest.fn().mockImplementation(async (key: string) => cacheStore.get(key) || null),
      set: jest.fn().mockImplementation(async (key: string, val: any) => {
        cacheStore.set(key, val);
      }),
      del: jest.fn().mockImplementation(async (key: string) => {
        cacheStore.delete(key);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingQuoteService,
        { provide: PrismaService, useValue: prisma },
        { provide: DistanceCalculatorService, useValue: distanceCalculator },
        { provide: LocationService, useValue: locationService },
        { provide: InventoryBalanceService, useValue: inventoryBalanceService },
        { provide: CACHE_SERVICE, useValue: cacheService },
      ],
    }).compile();

    service = module.get<ShippingQuoteService>(ShippingQuoteService);
  });

  describe('Acceptance Criteria 1: DEC-01 10km Express Boundary', () => {
    it('phải từ chối giao hỏa tốc 2H (isAvailable = false) khi khách hàng cách 10.5 km đường bộ', async () => {
      // Giả lập khoảng cách đường bộ là 10.5 km (> 10.0 km)
      distanceCalculator.calculateDistance.mockResolvedValue({
        distanceKm: 10.5,
        provider: 'HAVERSINE_FALLBACK',
        isFallback: true,
        durationMinutes: 21,
      });

      const dto: CalculateShippingQuoteDto = {
        items: [{ variantId: 'var-1', quantity: 2 }],
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 12',
          addressLine: '123 Đường Tô Ký',
        },
      };

      const result = await service.calculateQuotes(dto);

      expect(result.quoteGroupId).toBeDefined();
      expect(result.options.length).toBe(2);

      const expressOption = result.options.find((o) => o.serviceCode === 'EXPRESS_2H');
      expect(expressOption).toBeDefined();
      expect(expressOption?.isAvailable).toBe(false);
      expect(expressOption?.unavailableReason).toContain('Vượt quá bán kính phục vụ hỏa tốc 10 km (10.5 km)');
      expect(expressOption?.distanceKm).toBe(10.5);
    });

    it('phải chấp nhận giao hỏa tốc 2H (isAvailable = true) khi khoảng cách <= 10.0 km và đủ mọi điều kiện', async () => {
      // Giả lập khoảng cách đường bộ là 4.2 km (<= 10.0 km)
      distanceCalculator.calculateDistance.mockResolvedValue({
        distanceKm: 4.2,
        provider: 'OPENROUTESERVICE',
        isFallback: false,
        durationMinutes: 12,
      });

      const dto: CalculateShippingQuoteDto = {
        items: [{ variantId: 'var-1', quantity: 2 }],
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
          addressLine: '45 Lê Lợi',
        },
      };

      const result = await service.calculateQuotes(dto);

      const expressOption = result.options.find((o) => o.serviceCode === 'EXPRESS_2H');
      expect(expressOption).toBeDefined();
      expect(expressOption?.isAvailable).toBe(true);
      expect(expressOption?.distanceKm).toBe(4.2);
      // Cước phí 25.000 + ceil(4.2 - 3.0) * 5.000 = 25.000 + 6.000 = 31.000đ
      expect(expressOption?.estimatedFee).toBe(31000);
      expect(expressOption?.sourceLocationId).toBe(mockStoreQ1.id);
    });
  });

  describe('Showroom Capacity, Operating Hours & Inventory Availability', () => {
    it('phải trả về isAvailable = false khi chi nhánh gần nhất đã đóng cửa', async () => {
      distanceCalculator.calculateDistance.mockResolvedValue({
        distanceKm: 3.0,
        provider: 'HAVERSINE_FALLBACK',
        isFallback: true,
      });

      // Showroom đóng cửa
      locationService.checkIsOpenNow.mockReturnValue({ isOpenNow: false, currentLocalTime: '23:00', todayOpeningHours: '08:00-22:00' });

      const dto: CalculateShippingQuoteDto = {
        items: [{ variantId: 'var-1', quantity: 1 }],
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
        },
      };

      const result = await service.calculateQuotes(dto);
      const expressOption = result.options.find((o) => o.serviceCode === 'EXPRESS_2H');

      expect(expressOption?.isAvailable).toBe(false);
      expect(expressOption?.unavailableReason).toContain('hiện đang ngoài giờ mở cửa');
    });

    it('phải trả về isAvailable = false khi chi nhánh gần nhất đã đạt công suất hoàn tất tối đa trong ngày', async () => {
      distanceCalculator.calculateDistance.mockResolvedValue({
        distanceKm: 3.0,
        provider: 'HAVERSINE_FALLBACK',
        isFallback: true,
      });

      locationService.checkIsOpenNow.mockReturnValue({ isOpenNow: true, currentLocalTime: '10:00', todayOpeningHours: '08:00-22:00' });
      // Hết công suất
      locationService.getLocationCapacity.mockResolvedValue({
        locationId: 'store-q1-id',
        isCapacityAvailable: false,
        allocatedOrdersToday: 500,
        maxCapacityPerDay: 500,
      });

      const dto: CalculateShippingQuoteDto = {
        items: [{ variantId: 'var-1', quantity: 1 }],
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
        },
      };

      const result = await service.calculateQuotes(dto);
      const expressOption = result.options.find((o) => o.serviceCode === 'EXPRESS_2H');

      expect(expressOption?.isAvailable).toBe(false);
      expect(expressOption?.unavailableReason).toContain('đã đạt giới hạn công suất');
    });

    it('phải trả về isAvailable = false khi chi nhánh gần nhất không đủ tồn kho khả dụng (ATP)', async () => {
      distanceCalculator.calculateDistance.mockResolvedValue({
        distanceKm: 3.0,
        provider: 'HAVERSINE_FALLBACK',
        isFallback: true,
      });

      locationService.checkIsOpenNow.mockReturnValue({ isOpenNow: true, currentLocalTime: '10:00', todayOpeningHours: '08:00-22:00' });
      locationService.getLocationCapacity.mockResolvedValue({
        isCapacityAvailable: true,
      });

      // Thiếu hàng
      inventoryBalanceService.checkAvailability.mockResolvedValue({
        isAvailable: false,
        shortfalls: [{ variantId: 'var-1', requested: 5, availableAtp: 2, deficit: 3 }],
      });

      const dto: CalculateShippingQuoteDto = {
        items: [{ variantId: 'var-1', quantity: 5 }],
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
        },
      };

      const result = await service.calculateQuotes(dto);
      const expressOption = result.options.find((o) => o.serviceCode === 'EXPRESS_2H');

      expect(expressOption?.isAvailable).toBe(false);
      expect(expressOption?.unavailableReason).toContain('không đủ tồn kho khả dụng');
    });
  });

  describe('Standard Shipping Option (GHN Standard)', () => {
    it('phải tính phí 22.000đ cho đơn hàng cùng thành phố với kho xuất hàng', async () => {
      const dto: CalculateShippingQuoteDto = {
        items: [{ variantId: 'var-1', quantity: 1 }],
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 7',
        },
      };

      const result = await service.calculateQuotes(dto);
      const standardOption = result.options.find((o) => o.serviceCode === 'STANDARD');

      expect(standardOption).toBeDefined();
      expect(standardOption?.isAvailable).toBe(true);
      expect(standardOption?.estimatedFee).toBe(22000);
      expect(standardOption?.carrierCode).toBe('GHN');
    });

    it('phải tính phí 35.000đ cho đơn hàng liên tỉnh', async () => {
      const dto: CalculateShippingQuoteDto = {
        items: [{ variantId: 'var-1', quantity: 1 }],
        shippingAddress: {
          provinceCity: 'Bình Thuận',
          district: 'Phan Thiết',
        },
      };

      const result = await service.calculateQuotes(dto);
      const standardOption = result.options.find((o) => o.serviceCode === 'STANDARD');

      expect(standardOption).toBeDefined();
      expect(standardOption?.isAvailable).toBe(true);
      expect(standardOption?.estimatedFee).toBe(35000);
    });
  });

  describe('Acceptance Criteria 2: Quote Persistence & Client Tampering Protection', () => {
    it('phải lưu các báo giá vào database và Redis với TTL 15 phút', async () => {
      const dto: CalculateShippingQuoteDto = {
        items: [{ variantId: 'var-1', quantity: 1 }],
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
        },
      };

      const result = await service.calculateQuotes(dto);

      expect(prisma.shippingQuote.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            quoteGroupId: result.quoteGroupId,
            carrierCode: 'GHN',
            serviceCode: 'STANDARD',
          }),
        ]),
      });

      expect(cacheService.set).toHaveBeenCalledWith(
        `shipping:quote_group:${result.quoteGroupId}`,
        expect.any(Object),
        ShippingQuoteService.QUOTE_TTL_MS,
      );
    });

    it('validateQuote phải xác thực thành công báo giá hợp lệ chưa hết hạn', async () => {
      const quoteGroupId = 'test-group-id';
      const validQuoteGroup = {
        quoteGroupId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Còn hạn 10 phút
        options: [
          {
            carrierCode: 'GHN',
            serviceCode: 'STANDARD',
            sourceLocationId: 'wh-tb-id',
            estimatedFee: 22000,
            isAvailable: true,
          },
        ],
      };

      // Mock cache hit
      cacheService.get.mockResolvedValue(validQuoteGroup);

      const validated = await service.validateQuote(quoteGroupId, 'STANDARD', 'wh-tb-id');

      expect(validated.estimatedFee).toBe(22000);
      expect(validated.isAvailable).toBe(true);
      expect(validated.serviceCode).toBe('STANDARD');
    });

    it('validateQuote phải ném lỗi BadRequestException khi báo giá đã hết hạn quá 15 phút', async () => {
      const quoteGroupId = 'expired-group-id';
      const expiredQuoteGroup = {
        quoteGroupId,
        expiresAt: new Date(Date.now() - 5000), // Đã hết hạn 5 giây trước
        options: [
          {
            carrierCode: 'GHN',
            serviceCode: 'STANDARD',
            sourceLocationId: 'wh-tb-id',
            estimatedFee: 22000,
            isAvailable: true,
          },
        ],
      };

      cacheService.get.mockResolvedValue(expiredQuoteGroup);

      await expect(
        service.validateQuote(quoteGroupId, 'STANDARD'),
      ).rejects.toThrow(BadRequestException);
    });

    it('validateQuote phải ném lỗi khi khách chọn tùy chọn không khả dụng', async () => {
      const quoteGroupId = 'unavailable-group-id';
      const unavailableGroup = {
        quoteGroupId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        options: [
          {
            carrierCode: 'AHAMOVE',
            serviceCode: 'EXPRESS_2H',
            sourceLocationId: 'store-q1-id',
            estimatedFee: 35000,
            isAvailable: false,
            unavailableReason: 'Vượt quá 10km',
          },
        ],
      };

      cacheService.get.mockResolvedValue(unavailableGroup);

      await expect(
        service.validateQuote(quoteGroupId, 'EXPRESS_2H'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
