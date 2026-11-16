import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AsyncInfrastructureModule, OUTBOX_WRITER } from '@modules/async-infrastructure';
import {
  IShippingProvider,
  SHIPPING_PROVIDER,
} from '../../../domain/ports/shipping-provider.interface';
import { ShipmentOrchestratorService } from '../shipment-orchestrator.service';
import { MockShippingProvider } from '../../../infrastructure/adapters/mock/mock-shipping.provider';
import { ShippingModule } from '../../../shipping.module';

describe('EP05-T03: Shipment Orchestrator Service & Timeout Recovery (CREATION_UNKNOWN)', () => {
  let moduleRef: TestingModule;
  let orchestrator: ShipmentOrchestratorService;
  let mockProvider: MockShippingProvider;
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

    orchestrator = moduleRef.get<ShipmentOrchestratorService>(ShipmentOrchestratorService);
    mockProvider = moduleRef.get<MockShippingProvider>(MockShippingProvider);
    prisma = moduleRef.get<PrismaService>(PrismaService);

    // Chuẩn bị Order và FO
    const order = await prisma.order.findFirst({ select: { id: true } });
    if (!order) throw new Error('Cần ít nhất 1 Order trong DB để chạy test');
    testOrderId = order.id;

    const store = await prisma.store.findFirst({ select: { id: true } });
    const fo = await prisma.fulfillmentOrder.create({
      data: {
        orderId: testOrderId,
        sourceLocationId: store?.id || '',
        fulfillmentOrderNumber: `FO-ORCH-${Date.now()}`,
        status: 'PACKED',
        shippingServiceCode: 'STANDARD',
        totalItemsCount: 1,
      },
    });
    testFulfillmentOrderId = fo.id;
  });

  afterAll(async () => {
    if (createdShipmentIds.length > 0) {
      await prisma.outboxEvent.deleteMany({
        where: { aggregateId: { in: createdShipmentIds } },
      });
      await prisma.shipmentEvent.deleteMany({
        where: { shipmentId: { in: createdShipmentIds } },
      });
      await prisma.shipment.deleteMany({
        where: { id: { in: createdShipmentIds } },
      });
    }
    if (testFulfillmentOrderId) {
      await prisma.fulfillmentOrder.delete({
        where: { id: testFulfillmentOrderId },
      });
    }
    await moduleRef.close();
  });

  describe('1. Happy Path & Idempotency', () => {
    it('Điều phối tạo vận đơn thành công và chuyển trạng thái sang CREATED', async () => {
      const shipment = await prisma.shipment.create({
        data: {
          orderId: testOrderId,
          fulfillmentOrderId: testFulfillmentOrderId,
          shipmentCode: `SHIP-DISP-${Date.now()}`,
          shipmentType: 'OUTBOUND',
          carrierCode: 'MOCK',
          carrierServiceCode: 'STANDARD',
          status: 'PENDING_CREATION',
          codAmount: new Prisma.Decimal(150000),
        },
      });
      createdShipmentIds.push(shipment.id);

      const result = await orchestrator.dispatchShipment(shipment.id);

      expect(result.success).toBe(true);
      expect(result.status).toBe('CREATED');
      expect(result.trackingCode).toBeDefined();
      expect(result.trackingCode).toMatch(/^MOCK-TRK-/);
      expect(result.shippingLabelUrl).toBeDefined();

      // Kiểm tra DB
      const inDb = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(inDb?.status).toBe('CREATED');
      expect(inDb?.trackingCode).toBe(result.trackingCode);

      // Kiểm tra Transactional Outbox Event
      const outbox = await prisma.outboxEvent.findFirst({
        where: { aggregateId: shipment.id, eventType: 'SHIPMENT_CREATED' },
      });
      expect(outbox).toBeDefined();
    });

    it('Idempotent: Gọi dispatchShipment lần 2 trả về ngay kết quả hiện tại không gọi lại 3PL', async () => {
      const shipment = await prisma.shipment.create({
        data: {
          orderId: testOrderId,
          fulfillmentOrderId: testFulfillmentOrderId,
          shipmentCode: `SHIP-IDEMP-${Date.now()}`,
          shipmentType: 'OUTBOUND',
          carrierCode: 'MOCK',
          carrierServiceCode: 'STANDARD',
          trackingCode: 'MOCK-TRK-EXISTING-01',
          status: 'CREATED',
        },
      });
      createdShipmentIds.push(shipment.id);

      const spy = jest.spyOn(mockProvider, 'createShipment');
      const result = await orchestrator.dispatchShipment(shipment.id);

      expect(result.success).toBe(true);
      expect(result.status).toBe('CREATED');
      expect(result.trackingCode).toBe('MOCK-TRK-EXISTING-01');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('2. Acceptance Criteria 1: Timeout Handling (CREATION_UNKNOWN)', () => {
    it('AC1: Khi đối tác bị timeout (> 15s hoặc cấu hình), không crash luồng và chuyển status sang CREATION_UNKNOWN', async () => {
      const shipment = await prisma.shipment.create({
        data: {
          orderId: testOrderId,
          fulfillmentOrderId: testFulfillmentOrderId,
          shipmentCode: `SHIP-TIMEOUT-${Date.now()}`,
          shipmentType: 'OUTBOUND',
          carrierCode: 'MOCK',
          carrierServiceCode: 'STANDARD',
          status: 'PENDING_CREATION',
        },
      });
      createdShipmentIds.push(shipment.id);

      // Giả lập provider phản hồi chậm 200ms với timeout cài đặt 50ms
      jest.spyOn(mockProvider, 'createShipment').mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  trackingCode: 'LATE-TRK',
                }),
              200,
            );
          }),
      );

      // Gọi dispatch với timeout ngắn 50ms để kích hoạt timeout handler
      const result = await orchestrator.dispatchShipment(shipment.id, { timeoutMs: 50 });

      // AC1: Không throw làm crash luồng, trả về status CREATION_UNKNOWN
      expect(result.success).toBe(false);
      expect(result.status).toBe('CREATION_UNKNOWN');
      expect(result.isTimeout).toBe(true);
      expect(result.errorMessage).toContain('3PL_DISPATCH_TIMEOUT');

      // Kiểm tra DB
      const inDb = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(inDb?.status).toBe('CREATION_UNKNOWN');

      // Kiểm tra Outbox Event ghi nhận SHIPMENT_CREATION_UNKNOWN
      const outbox = await prisma.outboxEvent.findFirst({
        where: { aggregateId: shipment.id, eventType: 'SHIPMENT_CREATION_UNKNOWN' },
      });
      expect(outbox).toBeDefined();
    });
  });

  describe('3. Acceptance Criteria 2: Block Retries on CREATION_UNKNOWN', () => {
    it('AC2: Khi vận đơn đang ở CREATION_UNKNOWN, chặn nhân viên bấm dispatch tạo lại đơn ngay lập tức', async () => {
      const shipment = await prisma.shipment.create({
        data: {
          orderId: testOrderId,
          fulfillmentOrderId: testFulfillmentOrderId,
          shipmentCode: `SHIP-BLOCKED-${Date.now()}`,
          shipmentType: 'OUTBOUND',
          carrierCode: 'MOCK',
          carrierServiceCode: 'STANDARD',
          status: 'CREATION_UNKNOWN',
        },
      });
      createdShipmentIds.push(shipment.id);

      // Cố tình bấm tạo lại đơn khi chưa đối soát
      await expect(orchestrator.dispatchShipment(shipment.id)).rejects.toThrow(
        BadRequestException,
      );

      await expect(orchestrator.dispatchShipment(shipment.id)).rejects.toThrow(
        /SHIPMENT_CREATION_UNKNOWN/,
      );
    });
  });

  describe('4. Reconciliation Engine: reconcileCreationUnknown', () => {
    let unknownShipment: any;

    beforeEach(async () => {
      unknownShipment = await prisma.shipment.create({
        data: {
          orderId: testOrderId,
          fulfillmentOrderId: testFulfillmentOrderId,
          shipmentCode: `SHIP-RECON-${Date.now()}`,
          shipmentType: 'OUTBOUND',
          carrierCode: 'MOCK',
          carrierServiceCode: 'STANDARD',
          status: 'CREATION_UNKNOWN',
        },
      });
      createdShipmentIds.push(unknownShipment.id);
    });

    it('Đối soát khi hãng xác nhận ĐÃ CÓ đơn (carrierFound: true) -> Chuyển CREATED', async () => {
      const result = await orchestrator.reconcileCreationUnknown(unknownShipment.id, {
        carrierFound: true,
        trackingCode: 'MOCK-TRK-CONFIRMED-888',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('CREATED');
      expect(result.trackingCode).toBe('MOCK-TRK-CONFIRMED-888');

      // Kiểm tra DB
      const inDb = await prisma.shipment.findUnique({ where: { id: unknownShipment.id } });
      expect(inDb?.status).toBe('CREATED');
      expect(inDb?.trackingCode).toBe('MOCK-TRK-CONFIRMED-888');

      // Outbox Event
      const outbox = await prisma.outboxEvent.findFirst({
        where: { aggregateId: unknownShipment.id, eventType: 'SHIPMENT_RECONCILED_CREATED' },
      });
      expect(outbox).toBeDefined();
    });

    it('Đối soát khi hãng xác nhận CHƯA CÓ đơn (carrierFound: false) -> Reset về PENDING_CREATION để tạo lại', async () => {
      const result = await orchestrator.reconcileCreationUnknown(unknownShipment.id, {
        carrierFound: false,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('PENDING_CREATION');

      // Kiểm tra DB
      const inDb = await prisma.shipment.findUnique({ where: { id: unknownShipment.id } });
      expect(inDb?.status).toBe('PENDING_CREATION');

      // Sau khi reset về PENDING_CREATION, nhân viên có thể gọi dispatch lại thành công!
      const redispatch = await orchestrator.dispatchShipment(unknownShipment.id);
      expect(redispatch.success).toBe(true);
      expect(redispatch.status).toBe('CREATED');
    });

    it('Từ chối đối soát nếu vận đơn không ở trạng thái CREATION_UNKNOWN', async () => {
      const normalShipment = await prisma.shipment.create({
        data: {
          orderId: testOrderId,
          fulfillmentOrderId: testFulfillmentOrderId,
          shipmentCode: `SHIP-NORM-${Date.now()}`,
          shipmentType: 'OUTBOUND',
          carrierCode: 'MOCK',
          status: 'PENDING_CREATION',
        },
      });
      createdShipmentIds.push(normalShipment.id);

      await expect(
        orchestrator.reconcileCreationUnknown(normalShipment.id, { carrierFound: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
