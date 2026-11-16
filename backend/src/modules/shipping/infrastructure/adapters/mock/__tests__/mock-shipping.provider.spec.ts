import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AsyncInfrastructureModule, OUTBOX_WRITER } from '@modules/async-infrastructure';
import {
  IShippingProvider,
  SHIPPING_PROVIDER,
} from '../../../../domain/ports/shipping-provider.interface';
import {
  QuoteRequestDto,
  CreateShipmentDto,
} from '../../../../domain/dtos/shipping-provider.dto';
import { MockShippingProvider, MOCK_CARRIER_CODE } from '../mock-shipping.provider';
import { TestMockCarrierController } from '../../../../presentation/controllers/test-mock-carrier.controller';
import { ShippingModule } from '../../../../shipping.module';

describe('EP05-T02: Mock Shipping Provider & Simulation Test Harness', () => {
  let moduleRef: TestingModule;
  let provider: IShippingProvider;
  let mockProvider: MockShippingProvider;
  let controller: TestMockCarrierController;
  let prisma: PrismaService;
  let testOrderId: string;
  let testFulfillmentOrderId: string;
  const createdShipmentIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              SHIPPING_MOCK_ENABLED: 'true',
              NODE_ENV: 'test',
            }),
          ],
        }),
        PrismaModule,
        AsyncInfrastructureModule,
        ShippingModule,
      ],
    }).compile();

    provider = moduleRef.get<IShippingProvider>(SHIPPING_PROVIDER);
    mockProvider = moduleRef.get<MockShippingProvider>(MockShippingProvider);
    controller = moduleRef.get<TestMockCarrierController>(TestMockCarrierController);
    prisma = moduleRef.get<PrismaService>(PrismaService);

    // Chuẩn bị dữ liệu Order & FO để liên kết Shipment
    const order = await prisma.order.findFirst({ select: { id: true } });
    if (!order) throw new Error('Cần ít nhất 1 Order trong DB để chạy test');
    testOrderId = order.id;

    let fo = await prisma.fulfillmentOrder.findFirst({ select: { id: true } });
    if (!fo) {
      const store = await prisma.store.findFirst({ select: { id: true } });
      fo = await prisma.fulfillmentOrder.create({
        data: {
          orderId: testOrderId,
          sourceLocationId: store?.id || '',
          fulfillmentOrderNumber: `FO-MOCK-${Date.now()}`,
          status: 'ALLOCATED',
          shippingServiceCode: 'STANDARD',
          totalItemsCount: 1,
        },
      });
    }
    testFulfillmentOrderId = fo.id;
  });

  afterAll(async () => {
    if (createdShipmentIds.length > 0) {
      await prisma.shipmentEvent.deleteMany({
        where: { shipmentId: { in: createdShipmentIds } },
      });
      await prisma.shipment.deleteMany({
        where: { id: { in: createdShipmentIds } },
      });
    }
    await moduleRef.close();
  });

  describe('1. MockShippingProvider Unit Contract', () => {
    it('AC1: Khi cấu hình SHIPPING_MOCK_ENABLED=true, container inject đúng MockShippingProvider', () => {
      expect(provider).toBeDefined();
      expect(provider).toBeInstanceOf(MockShippingProvider);
      expect(provider.carrierCode).toBe(MOCK_CARRIER_CODE);
    });

    it('Tính phí calculateFee trả về 25.000đ cố định và dự kiến giao sau 2 ngày', async () => {
      const req: QuoteRequestDto = {
        senderAddress: {
          addressLine: '123 Cong Hoa',
          district: 'Tan Binh',
          province: 'TP Ho Chi Minh',
        },
        recipientAddress: {
          addressLine: '456 Le Duan',
          district: 'Hai Chau',
          province: 'Da Nang',
        },
        parcel: {
          weightGrams: 500,
          lengthCm: 20,
          widthCm: 15,
          heightCm: 10,
        },
      };

      const quote = await provider.calculateFee(req);
      expect(quote.carrierCode).toBe('MOCK');
      expect(quote.feeAmountVnd).toBe(25000);
      expect(quote.estimatedDeliveryDays).toBe(2);
      expect(quote.estimatedDeliveryAt).toBeInstanceOf(Date);
    });

    it('Tạo vận đơn createShipment sinh mã tracking MOCK-TRK-XXXXX và link in nhãn', async () => {
      const createReq: CreateShipmentDto = {
        shipmentCode: `SHIP-TEST-${Date.now()}`,
        orderNumber: 'ORD-99999',
        shipmentType: 'OUTBOUND',
        sender: {
          name: 'Kho Tan Binh',
          phone: '0901234567',
          addressLine: '123 Cong Hoa',
          district: 'Tan Binh',
          province: 'TP Ho Chi Minh',
        },
        recipient: {
          name: 'Khach Hang A',
          phone: '0987654321',
          addressLine: '456 Le Duan',
          district: 'Hai Chau',
          province: 'Da Nang',
        },
        parcel: {
          weightGrams: 800,
          lengthCm: 25,
          widthCm: 20,
          heightCm: 15,
        },
        items: [
          {
            name: 'Kem Duong Da',
            quantity: 1,
            weightGrams: 200,
            priceVnd: 350000,
          },
        ],
        codAmountVnd: 350000,
      };

      const result = await provider.createShipment(createReq);
      expect(result.trackingCode).toMatch(/^MOCK-TRK-[0-9A-Z]+$/);
      expect(result.shippingLabelUrl).toContain(result.trackingCode);
      expect(result.trackingUrl).toContain(result.trackingCode);
      expect(result.actualFeeVnd).toBe(25000);
      expect(result.rawResponse).toBeDefined();
    });

    it('Hủy vận đơn cancelShipment trả về true', async () => {
      const cancelRes = await provider.cancelShipment('MOCK-TRK-12345');
      expect(cancelRes).toBe(true);
    });

    it('Phân tích webhook parseWebhook chuẩn hóa sự kiện từ đối tác', () => {
      const rawBody = {
        eventId: 'EVT-WEBHOOK-001',
        trackingCode: 'MOCK-TRK-999',
        status: 'DELIVERED',
        occurredAt: '2026-11-16T15:00:00.000Z',
      };
      const parsed = provider.parseWebhook(rawBody, {});
      expect(parsed.carrierCode).toBe('MOCK');
      expect(parsed.eventId).toBe('EVT-WEBHOOK-001');
      expect(parsed.trackingCode).toBe('MOCK-TRK-999');
      expect(parsed.status).toBe('DELIVERED');
      expect(parsed.occurredAt.toISOString()).toBe('2026-11-16T15:00:00.000Z');
    });
  });

  describe('2. Simulation Test Harness: POST /api/v1/test/mock-carrier/trigger-status', () => {
    let mockShipment: any;

    beforeEach(async () => {
      // Tạo một shipment mẫu có trackingCode
      const timestamp = Date.now();
      mockShipment = await prisma.shipment.create({
        data: {
          orderId: testOrderId,
          fulfillmentOrderId: testFulfillmentOrderId,
          shipmentCode: `SHIP-SIM-${timestamp}`,
          shipmentType: 'OUTBOUND',
          carrierCode: 'MOCK',
          carrierServiceCode: 'MOCK_STANDARD',
          trackingCode: `MOCK-TRK-${timestamp}`,
          status: 'CREATED',
        },
      });
      createdShipmentIds.push(mockShipment.id);
    });

    it('AC2: Bắn status giả lập cập nhật đúng trạng thái Shipment trong cơ sở dữ liệu', async () => {
      const response = await controller.triggerStatus({
        trackingCode: mockShipment.trackingCode,
        status: 'IN_TRANSIT',
        occurredAt: new Date().toISOString(),
      });

      expect(response.success).toBe(true);
      expect(response.previousStatus).toBe('CREATED');
      expect(response.newStatus).toBe('IN_TRANSIT');

      // Xác minh DB thực tế
      const inDb = await prisma.shipment.findUnique({
        where: { id: mockShipment.id },
      });
      expect(inDb?.status).toBe('IN_TRANSIT');
      expect(inDb?.handedOverAt).toBeDefined();

      // Xác minh ghi nhận ShipmentEvent
      const event = await prisma.shipmentEvent.findFirst({
        where: { shipmentId: mockShipment.id, status: 'IN_TRANSIT' },
      });
      expect(event).toBeDefined();
      expect(event?.carrierCode).toBe('MOCK');
    });

    it('Bắn status DELIVERED cập nhật deliveredAt trong cơ sở dữ liệu', async () => {
      const response = await controller.triggerStatus({
        trackingCode: mockShipment.trackingCode,
        status: 'DELIVERED',
      });

      expect(response.success).toBe(true);
      expect(response.newStatus).toBe('DELIVERED');

      const inDb = await prisma.shipment.findUnique({
        where: { id: mockShipment.id },
      });
      expect(inDb?.status).toBe('DELIVERED');
      expect(inDb?.deliveredAt).toBeDefined();
    });

    it('Bắn status DELIVERY_FAILED tăng failed_attempts trong cơ sở dữ liệu', async () => {
      const response = await controller.triggerStatus({
        trackingCode: mockShipment.trackingCode,
        status: 'DELIVERY_FAILED',
        reasonCode: 'CUSTOMER_UNREACHABLE',
        reasonDetail: 'Không nghe máy',
      });

      expect(response.success).toBe(true);
      expect(response.newStatus).toBe('DELIVERY_FAILED');

      const inDb = await prisma.shipment.findUnique({
        where: { id: mockShipment.id },
      });
      expect(inDb?.status).toBe('DELIVERY_FAILED');
      expect(inDb?.failedAttempts).toBe(1);
    });

    it('Báo lỗi NotFoundException nếu trackingCode không tồn tại', async () => {
      await expect(
        controller.triggerStatus({
          trackingCode: 'MOCK-TRK-NONEXISTENT',
          status: 'DELIVERED',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
