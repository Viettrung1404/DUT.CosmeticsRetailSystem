import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GHNProvider } from '../ghn.provider';
import { GHNClient } from '../ghn-client';
import { CreateShipmentDto } from '../../../../domain/dtos/shipping-provider.dto';

describe('GHNProvider (EP06-T02)', () => {
  let provider: GHNProvider;
  let mockGhnClient: Partial<GHNClient>;

  beforeEach(async () => {
    mockGhnClient = {
      resolveDistrictId: jest.fn().mockResolvedValue(1530),
      resolveWardCode: jest.fn().mockResolvedValue('340101'),
      getWards: jest.fn().mockResolvedValue([{ WardCode: '340101', DistrictID: 1530, WardName: 'Phường Hải Châu 1' }]),
      createShippingOrder: jest.fn(),
      generateA6PrintToken: jest.fn(),
      cancelOrder: jest.fn(),
      calculateFee: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GHNProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GHN_API_URL') return 'https://online-gateway.ghn.vn/shiip/public-api/v2';
              return null;
            }),
          },
        },
        {
          provide: GHNClient,
          useValue: mockGhnClient,
        },
      ],
    }).compile();

    provider = module.get<GHNProvider>(GHNProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AC1 & AC2: Tạo vận đơn GHN & Lấy Token In Nhãn Khổ A6', () => {
    it('should create shipment successfully, returning valid tracking code LADXXXXX and A6 print label URL', async () => {
      const mockGhnOrderResponse = {
        order_code: 'LADB789XYZ',
        total_fee: 32000,
        expected_delivery_time: '2026-11-20T10:00:00Z',
      };

      (mockGhnClient.createShippingOrder as jest.Mock).mockResolvedValue(mockGhnOrderResponse);
      (mockGhnClient.generateA6PrintToken as jest.Mock).mockResolvedValue('A6_PRINT_TOKEN_SECURE_999');

      const createReq: CreateShipmentDto = {
        shipmentCode: 'SHIP-20261116-0042',
        clientOrderCode: 'SHIP-20261116-0042',
        orderNumber: 'ORD-9999',
        shipmentType: 'OUTBOUND',
        carrierCode: 'GHN',
        sender: {
          name: 'Kho Trung Tâm GlowUp',
          phone: '0901234567',
          addressLine: '123 Lê Duẩn, P. Bến Nghé',
          district: '1444',
          province: 'Hồ Chí Minh',
        },
        recipient: {
          name: 'Nguyễn Văn An',
          phone: '0912345678',
          addressLine: '456 Bạch Đằng',
          district: '1530',
          province: 'Đà Nẵng',
          ward: '340101',
        },
        parcel: {
          weightGrams: 420,
          lengthCm: 18,
          widthCm: 12,
          heightCm: 8,
        },
        items: [
          {
            name: 'Serum Phục Hồi Da GlowUp B5 30ml',
            sku: 'SKU-SERUM-B5',
            quantity: 2,
            weightGrams: 210,
            priceVnd: 350000,
          },
        ],
        codAmountVnd: 700000,
        note: 'Mỹ phẩm cao cấp - Không đồng kiểm - Quay video khui hàng',
      };

      const result = await provider.createShipment(createReq);

      // AC1: GHN trả về mã bưu kiện hợp lệ (dạng LADXXXXX)
      expect(result).toBeDefined();
      expect(result.trackingCode).toBe('LADB789XYZ');
      expect(result.carrierReferenceId).toBe('LADB789XYZ');
      expect(result.carrierServiceCode).toBe('GHN_STANDARD');
      expect(result.actualFeeVnd).toBe(32000);

      // AC2: Đường dẫn in nhãn A6 mở ra trang xem trước tem in nhiệt chính xác
      expect(result.shippingLabelUrl).toBe(
        'https://online-gateway.ghn.vn/a5/public-api/printA5?token=A6_PRINT_TOKEN_SECURE_999',
      );

      // Verify payload gửi sang GHN đúng các quy định kỹ thuật
      expect(mockGhnClient.createShippingOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_type_id: 1, // [FACT] Shop trả cước
          required_note: 'KHONGCHOXEMHANG', // [GLOWUP POLICY] Bảo vệ mỹ phẩm seal
          client_order_code: 'SHIP-20261116-0042', // Khóa chống tạo trùng
          to_name: 'Nguyễn Văn An',
          to_phone: '0912345678',
          to_district_id: 1530,
          to_ward_code: '340101',
          cod_amount: 700000,
          weight: 420,
          length: 18,
          width: 12,
          height: 8,
          service_type_id: 2,
        }),
      );

      // Verify gọi tạo token in nhãn A6 với đúng mã đơn
      expect(mockGhnClient.generateA6PrintToken).toHaveBeenCalledWith(['LADB789XYZ']);
    });

    it('should throw error when GHN does not return order_code', async () => {
      (mockGhnClient.createShippingOrder as jest.Mock).mockResolvedValue({});

      const createReq: CreateShipmentDto = {
        shipmentCode: 'SHIP-ERR-01',
        shipmentType: 'OUTBOUND',
        sender: {
          name: 'Kho HCM',
          phone: '0901234567',
          addressLine: 'Kho HCM',
          district: '1444',
          province: 'HCM',
        },
        recipient: {
          name: 'Khách',
          phone: '0988888888',
          addressLine: 'Địa chỉ',
          district: '1530',
          province: 'Đà Nẵng',
        },
        parcel: { weightGrams: 200, lengthCm: 10, widthCm: 10, heightCm: 10 },
        items: [],
        codAmountVnd: 0,
      };

      await expect(provider.createShipment(createReq)).rejects.toThrow(
        'GHN_ORDER_CODE_MISSING',
      );
    });

    it('should fallback to order_code print url if A6 token generation fails', async () => {
      (mockGhnClient.createShippingOrder as jest.Mock).mockResolvedValue({
        order_code: 'LAD-FALLBACK-123',
      });
      (mockGhnClient.generateA6PrintToken as jest.Mock).mockRejectedValue(
        new Error('Network error generating token'),
      );

      const createReq: CreateShipmentDto = {
        shipmentCode: 'SHIP-FB-01',
        shipmentType: 'OUTBOUND',
        sender: {
          name: 'Kho HCM',
          phone: '0901234567',
          addressLine: 'Kho HCM',
          district: '1444',
          province: 'HCM',
        },
        recipient: {
          name: 'Khách',
          phone: '0988888888',
          addressLine: 'Địa chỉ',
          district: '1530',
          province: 'Đà Nẵng',
        },
        parcel: { weightGrams: 200, lengthCm: 10, widthCm: 10, heightCm: 10 },
        items: [],
        codAmountVnd: 0,
      };

      const result = await provider.createShipment(createReq);
      expect(result.shippingLabelUrl).toBe(
        'https://online-gateway.ghn.vn/a5/public-api/printA5?order_code=LAD-FALLBACK-123',
      );
    });
  });

  describe('cancelShipment & parseWebhook', () => {
    it('should call cancelOrder on GHNClient', async () => {
      (mockGhnClient.cancelOrder as jest.Mock).mockResolvedValue(true);

      const success = await provider.cancelShipment('LADB789XYZ');
      expect(success).toBe(true);
      expect(mockGhnClient.cancelOrder).toHaveBeenCalledWith(['LADB789XYZ']);
    });

    it('should parse GHN webhook body correctly', () => {
      const webhookPayload = {
        OrderCode: 'LADB789XYZ',
        Status: 'delivering',
        Time: '2026-11-16T14:30:00Z',
        Description: 'Shipper đang trên đường giao hàng',
      };

      const parsed = provider.parseWebhook(webhookPayload, {});
      expect(parsed.carrierCode).toBe('GHN');
      expect(parsed.trackingCode).toBe('LADB789XYZ');
      expect(parsed.status).toBe('OUT_FOR_DELIVERY');
      expect(parsed.eventId).toBeDefined();
    });
  });
});
