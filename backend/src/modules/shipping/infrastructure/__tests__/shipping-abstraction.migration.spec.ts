import { PrismaClient, Prisma } from '@prisma/client';
import {
  QuoteRequestDto,
  CreateShipmentDto,
  ShipmentResultDto,
  ParsedWebhookDto,
} from '../../domain/dtos/shipping-provider.dto';
import { IShippingProvider } from '../../domain/ports/shipping-provider.interface';

describe('EP05-T01: Polymorphic Shipments Schema & Shipping Provider Abstraction Contract', () => {
  let prisma: PrismaClient;
  let testOrderId: string;
  let testReturnOrderId: string;
  let testFulfillmentOrderId: string;
  const createdShipmentIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();

    // 1. Tìm 1 Order sẵn có trong DB
    const existingOrder = await prisma.order.findFirst({
      select: { id: true },
    });
    if (!existingOrder) {
      throw new Error('Cần ít nhất 1 Order trong database để chạy kiểm thử!');
    }
    testOrderId = existingOrder.id;

    // 2. Tìm hoặc tạo 1 ReturnOrder để test RETURN_PICKUP
    let returnOrder = await prisma.returnOrder.findFirst({
      select: { id: true },
    });
    if (!returnOrder) {
      const customer = await prisma.customer.findFirst({ select: { id: true } });
      const store = await prisma.store.findFirst({ select: { id: true } });
      returnOrder = await prisma.returnOrder.create({
        data: {
          returnCode: `RET-TEST-${Date.now()}`,
          orderId: testOrderId,
          customerId: customer?.id || '',
          storeId: store?.id || '',
          returnType: 'ONLINE',
          status: 'REQUESTED',
          reason: 'WRONG_ITEM',
        },
      });
    }
    testReturnOrderId = returnOrder.id;

    // 3. Tìm hoặc tạo 1 FulfillmentOrder để test OUTBOUND
    let fo = await prisma.fulfillmentOrder.findFirst({
      select: { id: true },
    });
    if (!fo) {
      const store = await prisma.store.findFirst({ select: { id: true } });
      fo = await prisma.fulfillmentOrder.create({
        data: {
          orderId: testOrderId,
          sourceLocationId: store?.id || '',
          fulfillmentOrderNumber: `FO-TEST-${Date.now()}`,
          status: 'ALLOCATED',
          shippingServiceCode: 'STANDARD',
          totalItemsCount: 1,
        },
      });
    }
    testFulfillmentOrderId = fo.id;
  });

  afterAll(async () => {
    // Dọn dẹp các shipment đã tạo trong test suite
    if (createdShipmentIds.length > 0) {
      await prisma.shipment.deleteMany({
        where: { id: { in: createdShipmentIds } },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. Schema & Check Constraint: chk_shipment_type_ref', () => {
    it('AC2.1: Cho phép tạo vận đơn OUTBOUND với fulfillmentOrderId', async () => {
      const code = `SHIP-OUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const shipment = await prisma.shipment.create({
        data: {
          shipmentCode: code,
          shipmentType: 'OUTBOUND',
          fulfillmentOrderId: testFulfillmentOrderId,
          orderId: testOrderId,
          carrierCode: 'GHN',
          carrierServiceCode: 'STANDARD',
          status: 'PENDING_CREATION',
          codStatus: 'COD_EXPECTED',
          actualShippingFee: new Prisma.Decimal(25000),
          carrierReferenceId: 'GHN-REF-12345',
          trackingUrl: 'https://tracking.ghn.vn/order/12345',
        },
      });
      createdShipmentIds.push(shipment.id);

      expect(shipment).toBeDefined();
      expect(shipment.shipmentType).toBe('OUTBOUND');
      expect(shipment.fulfillmentOrderId).toBe(testFulfillmentOrderId);
      expect(shipment.codStatus).toBe('COD_EXPECTED');
      expect(Number(shipment.actualShippingFee)).toBe(25000);
      expect(shipment.carrierReferenceId).toBe('GHN-REF-12345');
      expect(shipment.trackingUrl).toBe('https://tracking.ghn.vn/order/12345');
    });

    it('AC2.2: Cho phép tạo vận đơn RETURN_PICKUP với returnOrderId', async () => {
      const code = `SHIP-RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const shipment = await prisma.shipment.create({
        data: {
          shipmentCode: code,
          shipmentType: 'RETURN_PICKUP',
          orderId: testOrderId,
          returnOrderId: testReturnOrderId,
          carrierCode: 'GHN',
          carrierServiceCode: 'GHN_REVERSE',
          status: 'PENDING_CREATION',
        },
      });
      createdShipmentIds.push(shipment.id);

      expect(shipment).toBeDefined();
      expect(shipment.shipmentType).toBe('RETURN_PICKUP');
      expect(shipment.returnOrderId).toBe(testReturnOrderId);
      expect(shipment.fulfillmentOrderId).toBeNull();
    });

    it('AC2.3: Cho phép tạo vận đơn INTER_STORE_TRANSFER không bắt buộc fulfillment_order_id hay return_order_id', async () => {
      const code = `SHIP-TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const shipment = await prisma.shipment.create({
        data: {
          shipmentCode: code,
          shipmentType: 'INTER_STORE_TRANSFER',
          orderId: testOrderId,
          carrierCode: 'AHAMOVE',
          carrierServiceCode: 'TRUCK_500KG',
          status: 'PENDING_CREATION',
        },
      });
      createdShipmentIds.push(shipment.id);

      expect(shipment).toBeDefined();
      expect(shipment.shipmentType).toBe('INTER_STORE_TRANSFER');
      expect(shipment.fulfillmentOrderId).toBeNull();
      expect(shipment.returnOrderId).toBeNull();
    });

    it('AC2.4: Chặn vi phạm chk_shipment_type_ref khi RETURN_PICKUP không có return_order_id', async () => {
      const code = `SHIP-ERR-RET-${Date.now()}`;
      await expect(
        prisma.shipment.create({
          data: {
            shipmentCode: code,
            shipmentType: 'RETURN_PICKUP',
            orderId: testOrderId,
            // Cố tình không truyền returnOrderId
            carrierCode: 'GHN',
            status: 'PENDING_CREATION',
          },
        }),
      ).rejects.toThrow();
    });

    it('AC2.5: Chặn vi phạm chk_shipment_type_ref khi OUTBOUND không có fulfillment_order_id VÀ không có order_id', async () => {
      const code = `SHIP-ERR-OUT-${Date.now()}`;
      await expect(
        prisma.$executeRaw`
          INSERT INTO "shipments" (id, shipment_code, shipment_type, carrier_code, status, order_id, fulfillment_order_id, updated_at)
          VALUES (gen_random_uuid(), ${code}, 'OUTBOUND', 'GHN', 'PENDING_CREATION', NULL, NULL, NOW())
        `,
      ).rejects.toThrow();
    });
  });

  describe('2. DTOs & Interface Contract Verification', () => {
    it('AC1: Kiểm tra DTOs tuân thủ chuẩn quốc tế (grams, cm, VND)', () => {
      const quoteReq: QuoteRequestDto = {
        carrierCode: 'GHN',
        serviceCode: 'STANDARD',
        senderAddress: {
          addressLine: 'Kho Tan Binh, 123 Cong Hoa',
          district: 'Tan Binh',
          province: 'TP Ho Chi Minh',
        },
        recipientAddress: {
          addressLine: '456 Le Duan',
          district: 'Hai Chau',
          province: 'Da Nang',
        },
        parcel: {
          weightGrams: 500, // Chuẩn grams
          lengthCm: 20,     // Chuẩn cm
          widthCm: 15,      // Chuẩn cm
          heightCm: 10,     // Chuẩn cm
        },
        codAmountVnd: 250000,      // Chuẩn VND
        insuranceValueVnd: 250000, // Chuẩn VND
      };

      expect(quoteReq.parcel.weightGrams).toBeGreaterThan(0);
      expect(quoteReq.parcel.lengthCm).toBeGreaterThan(0);
      expect(quoteReq.parcel.widthCm).toBeGreaterThan(0);
      expect(quoteReq.parcel.heightCm).toBeGreaterThan(0);
      expect(quoteReq.codAmountVnd).toBe(250000);

      const shipmentDto: CreateShipmentDto = {
        shipmentCode: 'SHIP-MOCK-001',
        orderNumber: 'ORD-12345',
        shipmentType: 'OUTBOUND',
        sender: {
          name: 'Kho GlowUp Tan Binh',
          phone: '0901234567',
          addressLine: '123 Cong Hoa',
          district: 'Tan Binh',
          province: 'TP Ho Chi Minh',
        },
        recipient: {
          name: 'Nguyen Van A',
          phone: '0987654321',
          addressLine: '456 Le Duan',
          district: 'Hai Chau',
          province: 'Da Nang',
        },
        parcel: {
          weightGrams: 750,
          lengthCm: 25,
          widthCm: 20,
          heightCm: 15,
        },
        items: [
          {
            name: 'Son Kem Li Romand 04',
            quantity: 2,
            weightGrams: 50,
            priceVnd: 180000,
          },
        ],
        codAmountVnd: 360000,
      };

      expect(shipmentDto.shipmentType).toBe('OUTBOUND');
      expect(shipmentDto.parcel.weightGrams).toBe(750);
      expect(shipmentDto.items[0].weightGrams).toBe(50);
      expect(shipmentDto.items[0].priceVnd).toBe(180000);
    });

    it('Kiểm tra kiểu dữ liệu IShippingProvider compile đúng cấu trúc', () => {
      // Mock class đơn giản kiểm tra IShippingProvider
      class TestProvider implements IShippingProvider {
        readonly carrierCode = 'TEST';
        async calculateFee(): Promise<any> {
          return { carrierCode: 'TEST', serviceCode: 'STD', feeAmountVnd: 25000 };
        }
        async createShipment(): Promise<ShipmentResultDto> {
          return { trackingCode: 'TEST-123' };
        }
        async cancelShipment(): Promise<boolean> {
          return true;
        }
        parseWebhook(): ParsedWebhookDto {
          return {
            carrierCode: 'TEST',
            eventId: 'EVT-1',
            trackingCode: 'TEST-123',
            status: 'DELIVERED',
            occurredAt: new Date(),
            rawPayload: {},
          };
        }
      }

      const provider: IShippingProvider = new TestProvider();
      expect(provider.carrierCode).toBe('TEST');
    });
  });
});
