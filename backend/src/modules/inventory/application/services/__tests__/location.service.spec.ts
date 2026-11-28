import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LocationService } from '../location.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CACHE_SERVICE } from '@core/cache/cache.service.interface';

describe('EP01-T04: LocationService Unit Tests', () => {
  let service: LocationService;
  let prismaMock: {
    store: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    order: {
      count: jest.Mock;
    };
  };
  let cacheMock: {
    get: jest.Mock;
    set: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      store: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      order: {
        count: jest.fn(),
      },
    };

    cacheMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CACHE_SERVICE, useValue: cacheMock },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
  });

  describe('1. checkIsOpenNow (Asia/Ho_Chi_Minh Timezone Evaluation)', () => {
    it('phải đánh giá đúng giờ mở cửa Mon-Sun cho Showroom', () => {
      const openingHours = { mon_sun: '08:00-22:00' };

      // Thứ 2 lúc 10:00 sáng VN (03:00 UTC)
      const mondayMorningUtc = new Date(Date.UTC(2026, 10, 16, 3, 0, 0));
      const statusOpen = service.checkIsOpenNow(openingHours, mondayMorningUtc);

      expect(statusOpen.isOpenNow).toBe(true);
      expect(statusOpen.currentLocalTime).toBe('10:00');
      expect(statusOpen.todayOpeningHours).toBe('08:00-22:00');

      // Thứ 2 lúc 23:30 đêm VN (16:30 UTC)
      const mondayNightUtc = new Date(Date.UTC(2026, 10, 16, 16, 30, 0));
      const statusClosed = service.checkIsOpenNow(openingHours, mondayNightUtc);

      expect(statusClosed.isOpenNow).toBe(false);
      expect(statusClosed.currentLocalTime).toBe('23:30');
    });

    it('phải đóng cửa vào Chủ Nhật đối với cấu hình Mon-Sat của Kho Tổng', () => {
      const openingHours = { mon_sat: '07:30-18:00' };

      // Thứ 7 lúc 14:00 chiều VN (07:00 UTC) -> MỞ
      const satAfternoonUtc = new Date(Date.UTC(2026, 10, 14, 7, 0, 0));
      const satStatus = service.checkIsOpenNow(openingHours, satAfternoonUtc);
      expect(satStatus.isOpenNow).toBe(true);
      expect(satStatus.currentLocalTime).toBe('14:00');

      // Chủ Nhật lúc 10:00 sáng VN (03:00 UTC) -> ĐÓNG CỬA
      const sunMorningUtc = new Date(Date.UTC(2026, 10, 15, 3, 0, 0));
      const sunStatus = service.checkIsOpenNow(openingHours, sunMorningUtc);
      expect(sunStatus.isOpenNow).toBe(false);
      expect(sunStatus.todayOpeningHours).toBeNull();
    });

    it('phải xử lý an toàn khi openingHours là null hoặc rỗng', () => {
      const status = service.checkIsOpenNow(null);
      expect(status.isOpenNow).toBe(false);
      expect(status.todayOpeningHours).toBeNull();
    });
  });

  describe('2. listLocations Query & Cache', () => {
    it('phải truy vấn danh sách locations từ database và bổ sung operatingStatus', async () => {
      const mockStores = [
        {
          id: 'store_01',
          code: 'STORE-03',
          name: 'Showroom Q1',
          type: 'STORE',
          address: '45 Lê Lợi',
          district: 'Quận 1',
          city: 'TP. Hồ Chí Minh',
          phone: '028 3999 0003',
          email: 'quan1@glowup.vn',
          latitude: 10.7745,
          longitude: 106.7009,
          fulfillmentCapacityPerDay: 500,
          openingHours: { mon_sun: '08:00-22:00' },
        },
      ];
      prismaMock.store.findMany.mockResolvedValue(mockStores);

      const fixedTime = new Date(Date.UTC(2026, 10, 16, 3, 0, 0)); // 10:00 VN
      const result = await service.listLocations({ type: 'STORE' }, fixedTime);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('STORE-03');
      expect(result[0].operatingStatus.isOpenNow).toBe(true);
      expect(prismaMock.store.findMany).toHaveBeenCalledWith({
        where: { isActive: true, type: 'STORE' },
        orderBy: [{ type: 'asc' }, { code: 'asc' }],
      });
      expect(cacheMock.set).toHaveBeenCalled();
    });

    it('phải trả về từ cache nếu có cache hợp lệ', async () => {
      const cachedData = [
        {
          id: 'store_01',
          code: 'STORE-03',
          name: 'Showroom Q1',
          type: 'STORE',
          address: '45 Lê Lợi',
          district: 'Quận 1',
          city: 'TP. Hồ Chí Minh',
          phone: '028 3999 0003',
          email: 'quan1@glowup.vn',
          latitude: 10.7745,
          longitude: 106.7009,
          fulfillmentCapacityPerDay: 500,
          openingHours: { mon_sun: '08:00-22:00' },
        },
      ];
      cacheMock.get.mockResolvedValue(cachedData);

      const fixedTime = new Date(Date.UTC(2026, 10, 16, 3, 0, 0));
      const result = await service.listLocations({}, fixedTime);

      expect(result).toHaveLength(1);
      expect(prismaMock.store.findMany).not.toHaveBeenCalled();
      expect(result[0].operatingStatus.isOpenNow).toBe(true);
    });
  });

  describe('3. getLocationCapacity (Acceptance Criteria)', () => {
    it('AC2: nếu số đơn trong ngày >= capacity => isCapacityAvailable phải trả về false', async () => {
      prismaMock.store.findUnique.mockResolvedValue({
        id: 'wh_tb',
        code: 'WH-TB',
        name: 'Tổng kho Tân Bình',
        type: 'WAREHOUSE',
        fulfillmentCapacityPerDay: 2500,
        openingHours: { mon_sat: '07:30-18:00' },
      });

      // Giả lập đã đạt đúng 2500 đơn trong ngày hôm nay
      prismaMock.order.count.mockResolvedValue(2500);

      const capacity = await service.getLocationCapacity('wh_tb');

      expect(capacity).toBeDefined();
      expect(capacity.capacityPerDay).toBe(2500);
      expect(capacity.allocatedOrdersToday).toBe(2500);
      expect(capacity.remainingCapacityToday).toBe(0);
      expect(capacity.isCapacityAvailable).toBe(false); // CHẶN NHẬN ĐƠN
    });

    it('nếu số đơn trong ngày < capacity => isCapacityAvailable trả về true và tính đúng remaining', async () => {
      prismaMock.store.findUnique.mockResolvedValue({
        id: 'store_03',
        code: 'STORE-03',
        name: 'Showroom Quận 1',
        type: 'STORE',
        fulfillmentCapacityPerDay: 500,
        openingHours: { mon_sun: '08:00-22:00' },
      });

      prismaMock.order.count.mockResolvedValue(150);

      const capacity = await service.getLocationCapacity('store_03');

      expect(capacity.capacityPerDay).toBe(500);
      expect(capacity.allocatedOrdersToday).toBe(150);
      expect(capacity.remainingCapacityToday).toBe(350);
      expect(capacity.isCapacityAvailable).toBe(true); // CÒN NĂNG LỰC
    });

    it('phải ném NotFoundException nếu location không tồn tại', async () => {
      prismaMock.store.findUnique.mockResolvedValue(null);

      await expect(service.getLocationCapacity('invalid_id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
