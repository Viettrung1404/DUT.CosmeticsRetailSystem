import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DistanceCalculatorService } from '../../services/distance-calculator.service';
import { InventoryBalanceService } from '@modules/inventory/application/services/inventory-balance.service';
import { LocationService } from '@modules/inventory/application/services/location.service';
import {
  HybridOrderRouter,
  RoutingOrderInput,
} from '../hybrid-order-router';

describe('HybridOrderRouter (Routing Engine - DEC-01 & DEC-02)', () => {
  let router: HybridOrderRouter;
  let prisma: any;
  let distanceCalculator: any;
  let inventoryBalanceService: any;
  let locationService: any;

  const mockCentralWhTB = {
    id: 'wh-tb-id',
    code: 'WH-TB',
    name: 'Tổng kho Tân Bình',
    type: 'WAREHOUSE',
    city: 'TP. Hồ Chí Minh',
    district: 'Tân Phú',
    latitude: 10.8142,
    longitude: 106.6264,
    openingHours: { mon_sat: '07:30-18:00' },
    fulfillmentCapacityPerDay: 2500,
    isActive: true,
  };

  const mockCentralWhHN = {
    id: 'wh-hn-id',
    code: 'WH-HN',
    name: 'Tổng kho Hà Nội',
    type: 'WAREHOUSE',
    city: 'Hà Nội',
    district: 'Mê Linh',
    latitude: 21.1926,
    longitude: 105.7513,
    openingHours: { mon_sat: '07:30-18:00' },
    fulfillmentCapacityPerDay: 2000,
    isActive: true,
  };

  const mockShowroomQ1 = {
    id: 'store-q1-id',
    code: 'STORE-03',
    name: 'GlowUp Showroom Quận 1',
    type: 'STORE',
    city: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    latitude: 10.7745,
    longitude: 106.7009,
    openingHours: { mon_sun: '08:00-22:00' },
    fulfillmentCapacityPerDay: 500,
    isActive: true,
  };

  const mockShowroomQ10 = {
    id: 'store-q10-id',
    code: 'STORE-06',
    name: 'GlowUp Showroom Quận 10',
    type: 'STORE',
    city: 'TP. Hồ Chí Minh',
    district: 'Quận 10',
    latitude: 10.7746,
    longitude: 106.6669,
    openingHours: { mon_sun: '08:00-22:00' },
    fulfillmentCapacityPerDay: 500,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      store: {
        findMany: jest.fn().mockResolvedValue([
          mockCentralWhTB,
          mockCentralWhHN,
          mockShowroomQ1,
          mockShowroomQ10,
        ]),
      },
    };

    distanceCalculator = {
      resolveCoordinates: jest.fn().mockReturnValue({ latitude: 10.77, longitude: 106.69 }),
      calculateDistance: jest.fn().mockResolvedValue({
        distanceKm: 3.5,
        provider: 'HAVERSINE_FALLBACK',
        isFallback: true,
      }),
    };

    inventoryBalanceService = {
      checkAvailability: jest.fn(),
      getBulkAtp: jest.fn(),
    };

    locationService = {
      checkIsOpenNow: jest.fn().mockReturnValue({ isOpenNow: true, currentLocalTime: '10:00', todayOpeningHours: '08:00-22:00' }),
      getLocationCapacity: jest.fn().mockResolvedValue({
        locationId: 'some-id',
        isCapacityAvailable: true,
        allocatedOrdersToday: 20,
        maxCapacityPerDay: 500,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridOrderRouter,
        { provide: PrismaService, useValue: prisma },
        { provide: DistanceCalculatorService, useValue: distanceCalculator },
        { provide: InventoryBalanceService, useValue: inventoryBalanceService },
        { provide: LocationService, useValue: locationService },
      ],
    }).compile();

    router = module.get<HybridOrderRouter>(HybridOrderRouter);
  });

  // =========================================================================
  // SCENARIO 1: Express 2H - Single Showroom (DEC-01)
  // =========================================================================
  describe('Kịch bản 1: Phân tuyến Hỏa Tốc 2H (Ahamove - DEC-01)', () => {
    it('phải phân tuyến thành công đơn lẻ từ 1 Showroom gần nhất thỏa mãn mọi điều kiện', async () => {
      // Showroom Q1 đủ hàng
      inventoryBalanceService.checkAvailability.mockImplementation(async (storeId: string) => {
        return {
          locationId: storeId,
          isAvailable: storeId === mockShowroomQ1.id,
          shortfalls: [],
        };
      });

      const input: RoutingOrderInput = {
        shippingServiceCode: 'EXPRESS_2H',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
        },
        items: [{ variantId: 'sku-son-moi', quantity: 2 }],
        netMerchandiseAmount: 400000,
      };

      const result = await router.routeOrder(input);

      expect(result.planType).toBe('SINGLE_FULFILLMENT');
      expect(result.isSplit).toBe(false);
      expect(result.fulfillmentOrders.length).toBe(1);
      expect(result.fulfillmentOrders[0].sourceLocationId).toBe(mockShowroomQ1.id);
      expect(result.fulfillmentOrders[0].shippingServiceCode).toBe('EXPRESS_2H');
      expect(result.companySubsidizedFee).toBe(0);
    });
  });

  // =========================================================================
  // SCENARIO 2: Express 2H - Insufficient Stock -> NO SPLIT
  // =========================================================================
  describe('Kịch bản 2: Hỏa Tốc 2H khi không showroom nào đủ 100% tồn kho', () => {
    it('phải từ chối phân tuyến và ném BadRequestException vì cấm tự động chia đơn hỏa tốc', async () => {
      // Không showroom nào có đủ tồn kho
      inventoryBalanceService.checkAvailability.mockResolvedValue({
        isAvailable: false,
        shortfalls: [{ variantId: 'sku-kem-chong-nang', requested: 2, availableAtp: 1, deficit: 1 }],
      });

      const input: RoutingOrderInput = {
        shippingServiceCode: 'EXPRESS_2H',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
        },
        items: [{ variantId: 'sku-kem-chong-nang', quantity: 2 }],
        netMerchandiseAmount: 550000,
      };

      await expect(router.routeOrder(input)).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // SCENARIO 3: Standard Delivery - Central Warehouse 100% Stock
  // =========================================================================
  describe('Kịch bản 3: Tiêu chuẩn - Kho Tổng có đủ 100% tồn kho', () => {
    it('phải ưu tiên phân tuyến đơn lẻ xuất từ Kho Tổng (WH-TB cho miền Nam)', async () => {
      // Kho Tổng Tân Bình có đủ 100% hàng
      inventoryBalanceService.checkAvailability.mockImplementation(async (storeId: string) => {
        return {
          locationId: storeId,
          isAvailable: storeId === mockCentralWhTB.id,
          shortfalls: [],
        };
      });

      const input: RoutingOrderInput = {
        shippingServiceCode: 'STANDARD',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 7',
        },
        items: [{ variantId: 'sku-toner', quantity: 3 }],
        netMerchandiseAmount: 350000,
      };

      const result = await router.routeOrder(input);

      expect(result.planType).toBe('SINGLE_FULFILLMENT');
      expect(result.isSplit).toBe(false);
      expect(result.fulfillmentOrders.length).toBe(1);
      expect(result.fulfillmentOrders[0].sourceLocationId).toBe(mockCentralWhTB.id);
      expect(result.fulfillmentOrders[0].sourceLocationType).toBe('WAREHOUSE');
    });
  });

  // =========================================================================
  // SCENARIO 4: Standard Delivery - Central WH short, but a Showroom has 100%
  // =========================================================================
  describe('Kịch bản 4: Tiêu chuẩn - Kho Tổng thiếu hàng nhưng có 1 Showroom có đủ 100% giỏ hàng', () => {
    it('phải phân tuyến xuất từ Showroom đó để tránh tách đơn không cần thiết', async () => {
      // Kho Tổng thiếu, nhưng Showroom Q10 có đủ
      inventoryBalanceService.checkAvailability.mockImplementation(async (storeId: string) => {
        return {
          locationId: storeId,
          isAvailable: storeId === mockShowroomQ10.id,
          shortfalls: [],
        };
      });

      const input: RoutingOrderInput = {
        shippingServiceCode: 'STANDARD',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 10',
        },
        items: [{ variantId: 'sku-serum', quantity: 2 }],
        netMerchandiseAmount: 600000,
      };

      const result = await router.routeOrder(input);

      expect(result.planType).toBe('SINGLE_FULFILLMENT');
      expect(result.isSplit).toBe(false);
      expect(result.fulfillmentOrders.length).toBe(1);
      expect(result.fulfillmentOrders[0].sourceLocationId).toBe(mockShowroomQ10.id);
      expect(result.notes).toContain('Không cần tách đơn');
    });
  });

  // =========================================================================
  // SCENARIO 5: Standard Delivery - Under 500k Threshold (DEC-02 - AC1)
  // =========================================================================
  describe('Kịch bản 5 (AC1): Đơn hàng 450.000đ thiếu hàng tại Central WH và không Showroom nào đủ hàng', () => {
    it('phải KHÔNG chia đơn và chuyển sang trạng thái chờ điều chuyển gom hàng nội bộ (DEC-02)', async () => {
      // Kho tổng và không showroom nào có đủ 100%
      inventoryBalanceService.checkAvailability.mockResolvedValue({
        isAvailable: false,
        shortfalls: [{ variantId: 'sku-b', requested: 1, availableAtp: 0, deficit: 1 }],
      });

      // Kho tổng có item A, thiếu item B
      inventoryBalanceService.getBulkAtp.mockImplementation(async (storeId: string) => {
        const map = new Map<string, number>();
        if (storeId === mockCentralWhTB.id) {
          map.set('sku-a', 1);
          map.set('sku-b', 0); // thiếu
        }
        return map;
      });

      // Showroom Q1 có item B
      inventoryBalanceService.checkAvailability.mockImplementation(
        async (storeId: string, items: Array<{ variantId: string; quantity: number }>) => {
          if (storeId === mockShowroomQ1.id && items.every((i) => i.variantId === 'sku-b')) {
            return { isAvailable: true, shortfalls: [] };
          }
          return { isAvailable: false, shortfalls: [] };
        },
      );

      const input: RoutingOrderInput = {
        shippingServiceCode: 'STANDARD',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
        },
        items: [
          { variantId: 'sku-a', quantity: 1 },
          { variantId: 'sku-b', quantity: 1 },
        ],
        // Giá trị đơn hàng 450.000đ (< 500.000đ)
        netMerchandiseAmount: 450000,
      };

      const result = await router.routeOrder(input);

      // Tiêu chí nghiệm thu AC1: Không chia đơn, chuyển sang chờ điều chuyển gom hàng
      expect(result.planType).toBe('INTERNAL_TRANSFER_REQUIRED');
      expect(result.isSplit).toBe(false);
      expect(result.fulfillmentOrders.length).toBe(0);
      expect(result.transferDetails).toBeDefined();
      expect(result.transferDetails?.toLocationId).toBe(mockCentralWhTB.id);
      expect(result.transferDetails?.items).toEqual([{ variantId: 'sku-b', quantity: 1 }]);
      expect(result.transferDetails?.reason).toContain('dưới ngưỡng cho phép chia đơn 500.000đ (DEC-02)');
    });
  });

  // =========================================================================
  // SCENARIO 6: Standard Delivery - Split Fulfillment Allowed (DEC-02 - AC2)
  // =========================================================================
  describe('Kịch bản 6 (AC2): Đơn hàng 600.000đ cước phát sinh 22.000đ - 30.000đ (<= 35.000đ)', () => {
    it('phải phân tuyến tách thành 2 Fulfillment Orders hợp lệ: Central WH + 1 Showroom (DEC-02)', async () => {
      // Kho tổng có item A, thiếu item B
      inventoryBalanceService.getBulkAtp.mockImplementation(async (storeId: string) => {
        const map = new Map<string, number>();
        if (storeId === mockCentralWhTB.id) {
          map.set('sku-a', 2);
          map.set('sku-b', 0); // thiếu
        }
        return map;
      });

      // Showroom Q1 có item B
      inventoryBalanceService.checkAvailability.mockImplementation(
        async (storeId: string, items: Array<{ variantId: string; quantity: number }>) => {
          if (storeId === mockShowroomQ1.id && items.every((i) => i.variantId === 'sku-b')) {
            return { isAvailable: true, shortfalls: [] };
          }
          return { isAvailable: false, shortfalls: [] };
        },
      );

      const input: RoutingOrderInput = {
        shippingServiceCode: 'STANDARD',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
        },
        items: [
          { variantId: 'sku-a', quantity: 2 },
          { variantId: 'sku-b', quantity: 1 },
        ],
        // Giá trị đơn hàng 600.000đ (>= 500.000đ)
        netMerchandiseAmount: 600000,
      };

      const result = await router.routeOrder(input);

      // Tiêu chí nghiệm thu AC2: Phân tuyến tách thành 2 FO hợp lệ
      expect(result.planType).toBe('SPLIT_FULFILLMENT');
      expect(result.isSplit).toBe(true);
      expect(result.fulfillmentOrders.length).toBe(2);

      // Kiện 1: Kho Tổng xuất sku-a
      const foWh = result.fulfillmentOrders.find((fo) => fo.sourceLocationId === mockCentralWhTB.id);
      expect(foWh).toBeDefined();
      expect(foWh?.items).toEqual([{ variantId: 'sku-a', quantity: 2 }]);

      // Kiện 2: Showroom Q1 xuất sku-b
      const foStore = result.fulfillmentOrders.find((fo) => fo.sourceLocationId === mockShowroomQ1.id);
      expect(foStore).toBeDefined();
      expect(foStore?.items).toEqual([{ variantId: 'sku-b', quantity: 1 }]);

      // Cước phát sinh 22.000đ (<= 35.000đ) do GlowUp trợ giá
      expect(result.companySubsidizedFee).toBe(22000);
      expect(result.customerShippingFee).toBe(22000);
      expect(result.totalShippingFee).toBe(44000);
    });
  });

  // =========================================================================
  // SCENARIO 7: Standard Delivery - Extra Fee Exceeds 35k Subsidy Limit
  // =========================================================================
  describe('Kịch bản 7: Đơn hàng >= 500.000đ nhưng cước phát sinh vượt trần trợ giá 35.000đ', () => {
    it('phải từ chối tách đơn và chuyển sang gom hàng nội bộ', async () => {
      // Mock cước phát sinh liên tỉnh hoặc phụ phí cao (> 35.000đ)
      // Tạo mock Store ở tỉnh xa khiến extra fee = 35.000đ nhưng có phụ phí
      // Ta có thể test logic khi extraFee vượt ngưỡng
      const customRouter = new HybridOrderRouter(
        prisma,
        distanceCalculator,
        inventoryBalanceService,
        locationService,
      );

      inventoryBalanceService.getBulkAtp.mockImplementation(async (storeId: string) => {
        const map = new Map<string, number>();
        if (storeId === mockCentralWhTB.id) {
          map.set('sku-a', 1);
          map.set('sku-b', 0);
        }
        return map;
      });

      // Showroom Hà Nội có sku-b nhưng khách ở TP.HCM (liên tỉnh 35.000đ)
      // Nếu có thêm cấu hình cước phát sinh > 35.000đ
      // Ở đây ta test bằng cách tạm thời override SPLIT_MAX_SHIPPING_SUBSIDY xuống 20.000đ
      const originalMax = (HybridOrderRouter as any).SPLIT_MAX_SHIPPING_SUBSIDY;
      (HybridOrderRouter as any).SPLIT_MAX_SHIPPING_SUBSIDY = 20000; // Nhỏ hơn cước 22.000đ

      inventoryBalanceService.checkAvailability.mockImplementation(
        async (storeId: string, items: Array<{ variantId: string; quantity: number }>) => {
          if (storeId === mockShowroomQ1.id && items.every((i) => i.variantId === 'sku-b')) {
            return { isAvailable: true, shortfalls: [] };
          }
          return { isAvailable: false, shortfalls: [] };
        },
      );

      const input: RoutingOrderInput = {
        shippingServiceCode: 'STANDARD',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
        },
        items: [
          { variantId: 'sku-a', quantity: 1 },
          { variantId: 'sku-b', quantity: 1 },
        ],
        netMerchandiseAmount: 800000,
      };

      const result = await customRouter.routeOrder(input);

      expect(result.planType).toBe('INTERNAL_TRANSFER_REQUIRED');
      expect(result.transferDetails?.reason).toContain('vượt trần trợ giá 35.000đ');

      // Khôi phục giá trị gốc
      (HybridOrderRouter as any).SPLIT_MAX_SHIPPING_SUBSIDY = originalMax;
    });
  });

  // =========================================================================
  // SCENARIO 8: Standard Delivery - Multiple missing items require > 2 locations
  // =========================================================================
  describe('Kịch bản 8: Đơn hàng cần nhiều hơn 2 địa điểm để hoàn tất (vượt quá max 2 FOs)', () => {
    it('phải từ chối chia 3 kho và chuyển sang gom hàng nội bộ', async () => {
      // Kho tổng có item A, thiếu B và C
      inventoryBalanceService.getBulkAtp.mockImplementation(async (storeId: string) => {
        const map = new Map<string, number>();
        if (storeId === mockCentralWhTB.id) {
          map.set('sku-a', 1);
          map.set('sku-b', 0);
          map.set('sku-c', 0);
        }
        return map;
      });

      // Showroom Q1 chỉ có B, không có C
      // Showroom Q10 chỉ có C, không có B
      // Không có showroom nào có CẢ B VÀ C
      inventoryBalanceService.checkAvailability.mockImplementation(
        async (storeId: string, items: Array<{ variantId: string; quantity: number }>) => {
          // Bắt buộc phải có cả B và C mới thỏa mãn
          return { isAvailable: false, shortfalls: [{ variantId: 'some-sku', requested: 1, availableAtp: 0, deficit: 1 }] };
        },
      );

      const input: RoutingOrderInput = {
        shippingServiceCode: 'STANDARD',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
        },
        items: [
          { variantId: 'sku-a', quantity: 1 },
          { variantId: 'sku-b', quantity: 1 },
          { variantId: 'sku-c', quantity: 1 },
        ],
        netMerchandiseAmount: 1200000, // Đơn hàng 1.200.000đ lớn
      };

      const result = await router.routeOrder(input);

      expect(result.planType).toBe('INTERNAL_TRANSFER_REQUIRED');
      expect(result.fulfillmentOrders.length).toBe(0);
      expect(result.transferDetails?.reason).toContain('Không có chi nhánh đơn lẻ nào có đủ phần hàng còn thiếu để chia tối đa 2 kiện');
    });
  });
});
