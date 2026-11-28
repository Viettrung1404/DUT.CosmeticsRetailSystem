import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from '../location.controller';
import { LocationService } from '../../../application/services/location.service';

describe('EP01-T04: LocationController Unit Tests', () => {
  let controller: LocationController;
  let locationServiceMock: {
    listLocations: jest.Mock;
    getLocationCapacity: jest.Mock;
  };

  beforeEach(async () => {
    locationServiceMock = {
      listLocations: jest.fn(),
      getLocationCapacity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [
        {
          provide: LocationService,
          useValue: locationServiceMock,
        },
      ],
    }).compile();

    controller = module.get<LocationController>(LocationController);
  });

  describe('GET /locations', () => {
    it('phải gọi locationService.listLocations với đúng tham số query', async () => {
      const mockResult = [
        {
          id: 'store_01',
          code: 'STORE-03',
          name: 'Showroom Q1',
          type: 'STORE',
          address: '45 Lê Lợi',
          district: 'Quận 1',
          city: 'TP. Hồ Chí Minh',
          phone: null,
          email: null,
          latitude: 10.7745,
          longitude: 106.7009,
          fulfillmentCapacityPerDay: 500,
          openingHours: { mon_sun: '08:00-22:00' },
          operatingStatus: {
            isOpenNow: true,
            currentLocalTime: '10:00',
            todayOpeningHours: '08:00-22:00',
          },
        },
      ];
      locationServiceMock.listLocations.mockResolvedValue(mockResult);

      const query = { type: 'STORE', city: 'TP. Hồ Chí Minh', isActive: true };
      const response = await controller.listLocations(query);

      expect(response).toEqual(mockResult);
      expect(locationServiceMock.listLocations).toHaveBeenCalledWith(query);
    });
  });

  describe('GET /locations/:id/capacity', () => {
    it('phải gọi locationService.getLocationCapacity với id truyền vào', async () => {
      const mockCapacity = {
        locationId: 'store_01',
        locationCode: 'STORE-03',
        locationName: 'Showroom Q1',
        locationType: 'STORE',
        capacityPerDay: 500,
        allocatedOrdersToday: 200,
        remainingCapacityToday: 300,
        isCapacityAvailable: true,
        date: '2026-11-15',
        operatingStatus: {
          isOpenNow: true,
          currentLocalTime: '10:00',
          todayOpeningHours: '08:00-22:00',
        },
      };
      locationServiceMock.getLocationCapacity.mockResolvedValue(mockCapacity);

      const response = await controller.getLocationCapacity('store_01');

      expect(response).toEqual(mockCapacity);
      expect(locationServiceMock.getLocationCapacity).toHaveBeenCalledWith(
        'store_01',
      );
    });
  });
});
