import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AsyncInfrastructureModule, OUTBOX_WRITER } from '@modules/async-infrastructure';
import { FulfillmentModule } from '@modules/fulfillment/fulfillment.module';
import { PackingService } from '@modules/fulfillment/application/services/packing.service';
import { HandoverService } from '@modules/fulfillment/application/services/handover.service';
import { OmsModule } from '@modules/oms/oms.module';
import { ShippingModule } from '../shipping.module';
import { ShipmentOrchestratorService } from '../application/services/shipment-orchestrator.service';
import { TestMockCarrierController } from '../presentation/controllers/test-mock-carrier.controller';

describe('EPIC 05: Shipping Provider Abstraction & Dispatch Integrated Lifecycle', () => {
  jest.setTimeout(60000);

  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let packingService: PackingService;
  let orchestrator: ShipmentOrchestratorService;
  let handoverService: HandoverService;
  let mockController: TestMockCarrierController;

  let testOrderId: string;
  let testStoreId: string;
  let testVariantId: string;
  let testFoId: string;
  let testReservationId: string;

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
        OmsModule,
        FulfillmentModule,
        ShippingModule,
      ],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    packingService = moduleRef.get<PackingService>(PackingService);
    orchestrator = moduleRef.get<ShipmentOrchestratorService>(ShipmentOrchestratorService);
    handoverService = moduleRef.get<HandoverService>(HandoverService);
    mockController = moduleRef.get<TestMockCarrierController>(TestMockCarrierController);

    // Chuẩn bị dữ liệu: Store, Customer, Variant, Order, FO, Reservation
    const store = await prisma.store.findFirst({
      where: { code: 'WH-TB' },
      select: { id: true },
    });
    testStoreId = store!.id;

    const variant = await prisma.productVariant.findFirst({
      where: { isActive: true },
      select: { id: true, price: true, weight: true },
    });
    testVariantId = variant!.id;

    const customer = await prisma.customer.findFirst({ select: { id: true } });

    // Tạo Order
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-EP05-${Date.now()}`,
        customerId: customer?.id || null,
        storeId: testStoreId,
        orderType: 'ONLINE',
        status: 'PROCESSING',
        subtotal: new Prisma.Decimal(300000),
        totalAmount: new Prisma.Decimal(300000),
        shippingAddress: {
          fullName: 'Tran Van E2E',
          phone: '0912345678',
          addressLine: '789 Vo Van Kiet',
          district: 'Quan 1',
          city: 'TP Ho Chi Minh',
        },
      },
    });
    testOrderId = order.id;

    // Tạo OrderItem
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: testOrderId,
        productVariantId: testVariantId,
        productName: 'Serum B5 phuc hoi',
        variantName: 'Chai 50ml',
        quantity: 2,
        unitPrice: variant!.price,
        unitCost: new Prisma.Decimal(100000),
        totalPrice: new Prisma.Decimal(Number(variant!.price) * 2),
      },
    });

    // Lấy hoặc tạo Lot cho reservation
    let lot = await prisma.inventoryLot.findFirst({
      where: { locationId: testStoreId, productVariantId: testVariantId },
      select: { id: true },
    });
    if (!lot) {
      lot = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: `LOT-E2E-${Date.now()}`,
          expiryDate: new Date('2028-01-01'),
          quantityOnHand: 100,
          quantityReserved: 0,
        },
      });
    }

    // Tạo Reservation
    const res = await prisma.inventoryReservation.create({
      data: {
        locationId: testStoreId,
        orderId: testOrderId,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    testReservationId = res.id;

    await prisma.inventoryReservationItem.create({
      data: {
        reservationId: res.id,
        productVariantId: testVariantId,
        lotId: lot.id,
        quantity: 2,
      },
    });

    // Tạo FO ở trạng thái PICKED (sau khi đã nhặt hàng)
    const fo = await prisma.fulfillmentOrder.create({
      data: {
        orderId: testOrderId,
        sourceLocationId: testStoreId,
        fulfillmentOrderNumber: `FO-EP05-${Date.now()}`,
        status: 'PICKED',
        shippingServiceCode: 'STANDARD',
        totalItemsCount: 2,
        pickedAt: new Date(),
      },
    });
    testFoId = fo.id;

    await prisma.fulfillmentOrderItem.create({
      data: {
        fulfillmentOrderId: testFoId,
        orderItemId: orderItem.id,
        productVariantId: testVariantId,
        quantityRequested: 2,
        quantityFulfilled: 2,
      },
    });
  });

  afterAll(async () => {
    try {
      if (testOrderId) {
        await prisma.outboxEvent.deleteMany({
          where: {
            aggregateId: { in: [testOrderId, testFoId] },
          },
        });
        const shipments = await prisma.shipment.findMany({
          where: { orderId: testOrderId },
          select: { id: true },
        });
        const sIds = shipments.map((s) => s.id);
        if (sIds.length > 0) {
          await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: sIds } } });
          await prisma.shipmentEvent.deleteMany({ where: { shipmentId: { in: sIds } } });
          await prisma.shipmentPackage.deleteMany({ where: { shipmentId: { in: sIds } } });
          await prisma.shipment.deleteMany({ where: { id: { in: sIds } } });
        }
        const packages = await prisma.package.findMany({
          where: { fulfillmentOrderId: testFoId },
          select: { id: true },
        });
        const pIds = packages.map((p) => p.id);
        if (pIds.length > 0) {
          await prisma.packageItem.deleteMany({ where: { packageId: { in: pIds } } });
          await prisma.package.deleteMany({ where: { id: { in: pIds } } });
        }
        await prisma.fulfillmentOrderItem.deleteMany({ where: { fulfillmentOrderId: testFoId } });
        await prisma.fulfillmentOrder.deleteMany({ where: { id: testFoId } });
        await prisma.inventoryReservationItem.deleteMany({ where: { reservationId: testReservationId } });
        await prisma.inventoryReservation.deleteMany({ where: { id: testReservationId } });
        await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
        await prisma.order.deleteMany({ where: { id: testOrderId } });
      }
    } catch (e) {
      console.warn('Cleanup error (ignored):', e);
    } finally {
      await moduleRef.close();
    }
  });

  it('Hoàn thành toàn bộ vòng đời hoàn tất: Packing -> 3PL Dispatch (MOCK) -> Carrier In-Transit -> Handover', async () => {
    // 1. Giai đoạn Đóng Gói (EPIC 04)
    const packRes = await packingService.completePacking(testFoId, {
      packages: [
        {
          actualWeightGrams: 450,
          lengthCm: 20,
          widthCm: 15,
          heightCm: 10,
          items: [{ productVariantId: testVariantId, quantity: 2 }],
        },
      ],
    });

    expect(packRes.success).toBe(true);
    expect(packRes.status).toBe('PACKED');
    expect(packRes.shipmentId).toBeDefined();

    // Shipment ban đầu ở PENDING_CREATION
    const initialShipment = await prisma.shipment.findUnique({
      where: { id: packRes.shipmentId },
    });
    expect(initialShipment?.status).toBe('PENDING_CREATION');
    expect(initialShipment?.trackingCode).toBeNull();

    // 2. Giai đoạn Điều Phối Giao Vận (EPIC 05: Dispatch to 3PL)
    const dispatchRes = await orchestrator.dispatchShipment(packRes.shipmentId);
    expect(dispatchRes.success).toBe(true);
    expect(dispatchRes.status).toBe('CREATED');
    expect(dispatchRes.trackingCode).toBeDefined();
    expect(dispatchRes.trackingCode).toMatch(/^MOCK-TRK-/);

    // Xác nhận Shipment trong DB đã có tracking_code và status = CREATED
    const dispatchedShipment = await prisma.shipment.findUnique({
      where: { id: packRes.shipmentId },
    });
    expect(dispatchedShipment?.status).toBe('CREATED');
    expect(dispatchedShipment?.trackingCode).toBe(dispatchRes.trackingCode);

    // 3. Giai đoạn Bàn Giao Cho Tài Xế (EPIC 04: Handover)
    // Khi đã có tracking_code, confirmHandover thành công rực rỡ
    const handoverRes = await handoverService.confirmHandover(testFoId);
    expect(handoverRes.success).toBe(true);
    expect(handoverRes.status).toBe('HANDED_OVER');
    expect(handoverRes.trackingCode).toBe(dispatchRes.trackingCode);

    // 4. Giai đoạn Vận Chuyển 3PL (EPIC 05: Mock Carrier Status Simulation)
    // Tài xế nhận hàng và đang di chuyển
    const transitRes = await mockController.triggerStatus({
      trackingCode: dispatchRes.trackingCode!,
      status: 'IN_TRANSIT',
    });
    expect(transitRes.success).toBe(true);
    expect(transitRes.newStatus).toBe('IN_TRANSIT');

    // Giao hàng thành công
    const deliverRes = await mockController.triggerStatus({
      trackingCode: dispatchRes.trackingCode!,
      status: 'DELIVERED',
    });
    expect(deliverRes.success).toBe(true);
    expect(deliverRes.newStatus).toBe('DELIVERED');

    // Kiểm tra dữ liệu cuối cùng trong DB
    const finalShipment = await prisma.shipment.findUnique({
      where: { id: packRes.shipmentId },
    });
    expect(finalShipment?.status).toBe('DELIVERED');
    expect(finalShipment?.deliveredAt).toBeDefined();
  });
});
