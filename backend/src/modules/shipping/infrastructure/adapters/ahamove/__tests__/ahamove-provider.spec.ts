import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AhamoveProvider } from '../ahamove-provider';
import { AhamoveClient } from '../ahamove-client';
import { CreateShipmentDto } from '../../../../domain/dtos/shipping-provider.dto';

describe('AhamoveProvider (EP07-T02)', () => {
  let provider: AhamoveProvider;
  let mockAhamoveClient: Partial<AhamoveClient>;

  beforeEach(async () => {
    mockAhamoveClient = {
      resolveCoordinates: jest.fn().mockImplementation((city, district, lat, lng) => ({
        latitude: lat || 10.7769,
        longitude: lng || 106.7009,
      })),
      calculateHaversineDistanceKm: jest.fn().mockReturnValue(3.8), // Mặc định 3.8 km <= 10km
      resolveServiceId: jest.fn().mockReturnValue('SGN-BIKE'),
      createOrder: jest.fn(),
      getSharedLink: jest.fn().mockResolvedValue('https://ahamove.com/share/22VMV54W'),
      cancelOrder: jest.fn(),
      calculateFee: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AhamoveProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => null),
          },
        },
        {
          provide: AhamoveClient,
          useValue: mockAhamoveClient,
        },
      ],
    }).compile();

    provider = module.get<AhamoveProvider>(AhamoveProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AC1 & AC2: Tạo booking hỏa tốc 2H & Trích xuất link bản đồ live tracking', () => {
    it('should create shipment successfully, returning order ID 22VMV54W and live map shared link', async () => {
      const mockOrderResponse = {
        order_id: '22VMV54W',
        status: 'ASSIGNING',
        total_price: 35000,
        shared_link: 'https://ahamove.com/share/22VMV54W',
      };

      (mockAhamoveClient.createOrder as jest.Mock).mockResolvedValue(mockOrderResponse);

      const createReq: CreateShipmentDto = {
        shipmentCode: 'SHIP-EXPRESS-0089',
        shipmentType: 'OUTBOUND',
        carrierCode: 'AHAMOVE',
        sender: {
          name: 'Showroom GlowUp Q10',
          phone: '02873001234',
          addressLine: '123 Đường 3/2, Phường 11, Quận 10',
          district: 'Quận 10',
          province: 'Hồ Chí Minh',
          latitude: 10.771234,
          longitude: 106.669876,
        },
        recipient: {
          name: 'Nguyễn Văn An',
          phone: '0901234567',
          addressLine: '7/28 Thành Thái, Phường 14, Quận 10',
          district: 'Quận 10',
          province: 'Hồ Chí Minh',
          latitude: 10.769753,
          longitude: 106.663661,
        },
        parcel: {
          weightGrams: 420,
          lengthCm: 18,
          widthCm: 12,
          heightCm: 8,
        },
        items: [
          {
            name: 'Son dưỡng GlowUp Velvet',
            sku: 'SKU-LIP-01',
            quantity: 1,
            weightGrams: 50,
            priceVnd: 180000,
          },
        ],
        codAmountVnd: 0,
      };

      const result = await provider.createShipment(createReq);

      // AC1: Ahamove trả về mã đơn (dạng 22VMV54W)
      expect(result).toBeDefined();
      expect(result.trackingCode).toBe('22VMV54W');
      expect(result.carrierReferenceId).toBe('22VMV54W');
      expect(result.carrierServiceCode).toBe('AHAMOVE_EXPRESS_2H');
      expect(result.actualFeeVnd).toBe(35000);

      // AC2: Khách hàng mở tracking_url xem được vị trí tài xế trên bản đồ
      expect(result.trackingUrl).toBe('https://ahamove.com/share/22VMV54W');

      // Phiếu giao hàng nội bộ khổ A6 do Ahamove không có API in nhãn
      expect(result.shippingLabelUrl).toBe(
        '/api/v1/admin/shipments/SHIP-EXPRESS-0089/print-delivery-note',
      );

      // Kiểm tra payload gửi sang Ahamove
      expect(mockAhamoveClient.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          order_time: 0,
          service_id: 'SGN-BIKE',
          payment_method: 'BALANCE',
          path: expect.arrayContaining([
            expect.objectContaining({
              address: '123 Đường 3/2, Phường 11, Quận 10',
              remarks: 'Lấy kiện hàng mã SHIP-EXPRESS-0089 tại quầy điều phối',
            }),
            expect.objectContaining({
              address: '7/28 Thành Thái, Phường 14, Quận 10',
              tracking_number: 'SHIP-EXPRESS-0089',
            }),
          ]),
        }),
      );
    });

    it('should throw BadRequestException if distance exceeds 10km radius', async () => {
      (mockAhamoveClient.calculateHaversineDistanceKm as jest.Mock).mockReturnValue(12.8); // 12.8km > 10km

      const createReq: CreateShipmentDto = {
        shipmentCode: 'SHIP-TOO-FAR-01',
        shipmentType: 'OUTBOUND',
        sender: {
          name: 'Showroom Q1',
          phone: '0901234567',
          addressLine: 'Q1',
          district: 'Quận 1',
          province: 'Hồ Chí Minh',
        },
        recipient: {
          name: 'Khách',
          phone: '0988888888',
          addressLine: 'Ngoại thành',
          district: 'Hóc Môn',
          province: 'Hồ Chí Minh',
        },
        parcel: { weightGrams: 200, lengthCm: 10, widthCm: 10, heightCm: 10 },
        items: [],
        codAmountVnd: 0,
      };

      await expect(provider.createShipment(createReq)).rejects.toThrow(BadRequestException);
      await expect(provider.createShipment(createReq)).rejects.toThrow(
        /vượt quá giới hạn phục vụ tối đa 10 km/,
      );
    });
  });

  describe('cancelShipment & parseWebhook', () => {
    it('should call cancelOrder on AhamoveClient', async () => {
      (mockAhamoveClient.cancelOrder as jest.Mock).mockResolvedValue(true);

      const success = await provider.cancelShipment('22VMV54W');
      expect(success).toBe(true);
      expect(mockAhamoveClient.cancelOrder).toHaveBeenCalledWith('22VMV54W');
    });

    it('should parse Ahamove webhook and map status correctly', () => {
      const webhookPayload = {
        _id: '22VMV54W',
        status: 'IN_PROCESS',
        dropoff_status: 'DELIVERING',
        timestamp: '2026-11-16T15:00:00Z',
      };

      const parsed = provider.parseWebhook(webhookPayload, {});
      expect(parsed.carrierCode).toBe('AHAMOVE');
      expect(parsed.trackingCode).toBe('22VMV54W');
      expect(parsed.status).toBe('OUT_FOR_DELIVERY');
      expect(parsed.eventId).toBeDefined();
    });
  });
});
