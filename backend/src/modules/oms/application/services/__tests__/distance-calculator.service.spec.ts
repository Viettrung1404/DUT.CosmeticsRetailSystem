import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  DistanceCalculatorService,
  Coordinates,
} from '../distance-calculator.service';

describe('DistanceCalculatorService', () => {
  let service: DistanceCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistanceCalculatorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined), // Không mock API key -> kích hoạt fallback Haversine * 1.3
          },
        },
      ],
    }).compile();

    service = module.get<DistanceCalculatorService>(DistanceCalculatorService);
  });

  describe('Haversine Formula & Urban Winding Factor (DEC-01)', () => {
    it('phải tính toán chính xác khoảng cách đường thẳng giữa 2 tọa độ (Haversine)', () => {
      // Showroom Quận 1 (10.7745, 106.7009) -> Showroom Quận 10 (10.7746, 106.6669)
      const origin: Coordinates = { latitude: 10.7745, longitude: 106.7009 };
      const destination: Coordinates = { latitude: 10.7746, longitude: 106.6669 };

      const straightDistance = service.calculateStraightHaversine(
        origin,
        destination,
      );

      // Khoảng cách đường thẳng ~ 3.72 km
      expect(straightDistance).toBeGreaterThan(3.5);
      expect(straightDistance).toBeLessThan(4.0);
    });

    it('phải nhân chính xác hệ số uốn lượn đô thị 1.3 theo quyết định DEC-01', () => {
      const origin: Coordinates = { latitude: 10.7745, longitude: 106.7009 };
      const destination: Coordinates = { latitude: 10.7746, longitude: 106.6669 };

      const straight = service.calculateStraightHaversine(origin, destination);
      const roadDistance = service.calculateHaversineWithWindingFactor(
        origin,
        destination,
      );

      const expected = Math.round(straight * 1.3 * 100) / 100;
      expect(roadDistance).toBe(expected);
      expect(roadDistance).toBeGreaterThan(straight);
    });

    it('phải fallback an toàn sang Haversine x 1.3 khi không có API key hoặc lỗi mạng', async () => {
      const origin: Coordinates = { latitude: 10.8142, longitude: 106.6264 }; // Kho Tân Bình
      const destination: Coordinates = { latitude: 10.7745, longitude: 106.7009 }; // Quận 1

      const result = await service.calculateDistance(origin, destination);

      expect(result.provider).toBe('HAVERSINE_FALLBACK');
      expect(result.isFallback).toBe(true);
      expect(result.distanceKm).toBeGreaterThan(0);
      expect(result.durationMinutes).toBeGreaterThan(0);
    });
  });

  describe('Address Resolution to Coordinates', () => {
    it('phải ưu tiên sử dụng tọa độ nếu địa chỉ đã có sẵn latitude/longitude', () => {
      const address = {
        provinceCity: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        latitude: 10.1234,
        longitude: 106.5678,
      };

      const coords = service.resolveCoordinates(address);
      expect(coords).toEqual({ latitude: 10.1234, longitude: 106.5678 });
    });

    it('phải tra cứu tọa độ từ bảng danh mục quận/huyện TP.HCM chuẩn hóa', () => {
      const address = {
        provinceCity: 'TP. Hồ Chí Minh',
        district: 'Quận 10',
      };

      const coords = service.resolveCoordinates(address);
      expect(coords).toBeDefined();
      expect(coords?.latitude).toBeCloseTo(10.7746, 3);
      expect(coords?.longitude).toBeCloseTo(106.6669, 3);
    });

    it('phải tra cứu tọa độ từ danh mục Hà Nội và Đà Nẵng', () => {
      const hnAddress = {
        provinceCity: 'Hà Nội',
        district: 'Cầu Giấy',
      };
      const dnAddress = {
        provinceCity: 'Đà Nẵng',
        district: 'Hải Châu',
      };

      const hnCoords = service.resolveCoordinates(hnAddress);
      const dnCoords = service.resolveCoordinates(dnAddress);

      expect(hnCoords).toBeDefined();
      expect(hnCoords?.latitude).toBeCloseTo(21.0333, 3);

      expect(dnCoords).toBeDefined();
      expect(dnCoords?.latitude).toBeCloseTo(16.0678, 3);
    });

    it('phải trả về null nếu địa chỉ không khớp thành phố nào trong hệ thống', () => {
      const address = {
        provinceCity: 'Tỉnh Chưa Biết',
        district: 'Huyện Đảo',
      };

      const coords = service.resolveCoordinates(address);
      expect(coords).toBeNull();
    });
  });
});
