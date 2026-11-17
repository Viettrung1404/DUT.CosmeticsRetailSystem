import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ConfigModule } from '@nestjs/config';
import { RmaEligibilityService } from '../application/services/rma-eligibility.service';
import { SubmitReturnRequestUseCase } from '../application/use-cases/submit-return-request.use-case';
import { ReceiveStoreDropoffUseCase } from '../application/use-cases/receive-store-dropoff.use-case';
import { ReverseShippingService } from '../application/services/reverse-shipping.service';
import { ReceiveWarehouseReturnUseCase } from '../application/use-cases/receive-warehouse-return.use-case';
import { OutboxWriterService } from '../../async-infrastructure/outbox/outbox-writer.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { seedDefaultReturnPolicy } from '../infrastructure/seeds/return-policy.seed';
import {
  ReturnChannel,
  ReturnOrderStatus,
  ReturnReasonCode,
} from '../domain/entities/return-policy.entity';

describe('EPIC 14 INTEGRATED FLOW: Multi-Channel Reverse Logistics (Store Drop-off & GHN Return Pickup)', () => {
  jest.setTimeout(35000);

  let prisma: PrismaClient;
  let submitReturnUseCase: SubmitReturnRequestUseCase;
  let receiveStoreDropoffUseCase: ReceiveStoreDropoffUseCase;
  let reverseShippingService: ReverseShippingService;
  let receiveWarehouseReturnUseCase: ReceiveWarehouseReturnUseCase;

  const testSuffix = Math.random().toString(36).substring(2, 7);
  let testCustomerId: string;
  let testStoreId: string;
  let testWarehouseId: string;
  let testCategoryId: string;
  let testProductId: string;
  let testVariantId: string;
  let testOrderId: string;
  let testOrderItemId: string;
  let testPolicyVersionId: string;
  let testStaffUserId: string;

  // Track created IDs for cleanup
  const createdReturnOrderIds: string[] = [];
  const createdShipmentIds: string[] = [];
  const createdReceiptIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // 1. Seed or retrieve active Return Policy Version
    const policy = await seedDefaultReturnPolicy(prisma);
    testPolicyVersionId = policy.id;

    // 2. Setup testing module with real PrismaService
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        RmaEligibilityService,
        SubmitReturnRequestUseCase,
        ReceiveStoreDropoffUseCase,
        ReverseShippingService,
        ReceiveWarehouseReturnUseCase,
        OutboxWriterService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    submitReturnUseCase = module.get<SubmitReturnRequestUseCase>(SubmitReturnRequestUseCase);
    receiveStoreDropoffUseCase = module.get<ReceiveStoreDropoffUseCase>(ReceiveStoreDropoffUseCase);
    reverseShippingService = module.get<ReverseShippingService>(ReverseShippingService);
    receiveWarehouseReturnUseCase = module.get<ReceiveWarehouseReturnUseCase>(ReceiveWarehouseReturnUseCase);

    // 3. Seed Showroom Store
    const store = await prisma.store.create({
      data: {
        code: `STR-E14-${testSuffix}`.slice(0, 20),
        name: `Showroom GlowUp Quận 1 ${testSuffix}`,
        address: '150 Lê Lợi, Phường Bến Thành, Quận 1, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        phone: '02838221199',
        type: 'STORE',
        isActive: true,
      },
    });
    testStoreId = store.id;

    // 4. Seed Central Warehouse
    const warehouse = await prisma.store.create({
      data: {
        code: `WHS-E14-${testSuffix}`.slice(0, 20),
        name: `Tổng Kho GlowUp Miền Nam ${testSuffix}`,
        address: 'Đường Số 7, KCN Tân Bình, Tây Thạnh, Tân Phú, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Tân Phú',
        phone: '02838112233',
        type: 'WAREHOUSE',
        isActive: true,
      },
    });
    testWarehouseId = warehouse.id;

    // 5. Seed Customer
    const customer = await prisma.customer.create({
      data: {
        fullName: `Khách Hàng Hoàn Trả E14 ${testSuffix}`,
        phone: `097${Math.floor(1000000 + Math.random() * 9000000)}`,
      },
    });
    testCustomerId = customer.id;

    // 5.1. Seed Staff User
    const staffUser = await prisma.user.create({
      data: {
        email: `staff-e14-${testSuffix}@glowup.vn`,
        passwordHash: 'dummy-hash',
        fullName: `Nhân Viên E14 ${testSuffix}`,
        phone: `096${Math.floor(1000000 + Math.random() * 9000000)}`,
        status: 'ACTIVE',
      },
    });
    testStaffUserId = staffUser.id;

    // 6. Seed Catalog (Category, Product, Variant)
    const category = await prisma.category.create({
      data: {
        name: `Mỹ Phẩm Dưỡng Trắng E14 ${testSuffix}`,
        slug: `duong-trang-e14-${testSuffix}`,
      },
    });
    testCategoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `PRD-E14-${testSuffix}`,
        name: `Kem Dưỡng Da Cao Cấp GlowUp ${testSuffix}`,
        slug: `kem-duong-da-e14-${testSuffix}`,
        basePrice: 500000,
        categoryId: testCategoryId,
        isActive: true,
      },
    });
    testProductId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-E14-${testSuffix}`,
        price: 500000,
        costPrice: 200000,
        stockQuantity: 50,
      },
    });
    testVariantId = variant.id;

    // 7. Seed initial order with nested item and forward shipment (Delivered 2 days ago)
    const deliveredTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-E14-${testSuffix}`,
        customerId: testCustomerId,
        storeId: testStoreId,
        orderType: 'ONLINE',
        status: 'DELIVERED',
        subtotal: 1500000,
        totalAmount: 1500000,
        policyVersionId: testPolicyVersionId,
        updatedAt: deliveredTime,
        items: {
          create: {
            productVariantId: testVariantId,
            productName: `Kem Dưỡng Da Cao Cấp GlowUp ${testSuffix}`,
            variantName: 'Hũ 50g',
            quantity: 3,
            unitPrice: 500000,
            unitCost: 200000,
            totalPrice: 1500000,
          },
        },
        shipments: {
          create: {
            shipmentCode: `SHP-FWD-${testSuffix}`,
            carrierCode: 'GHN',
            shipmentType: 'OUTBOUND',
            status: 'DELIVERED',
            deliveredAt: deliveredTime,
          },
        },
      },
      include: {
        items: true,
        shipments: true,
      },
    });
    testOrderId = order.id;
    testOrderItemId = order.items[0].id;
    if (order.shipments && order.shipments.length > 0) {
      createdShipmentIds.push(order.shipments[0].id);
    }
  });

  afterAll(async () => {
    // Delete in reverse order of foreign keys
    if (createdReceiptIds.length > 0) {
      await prisma.returnReceipt.deleteMany({
        where: { id: { in: createdReceiptIds } },
      });
    }

    if (createdReturnOrderIds.length > 0) {
      await prisma.outboxEvent.deleteMany({
        where: { aggregateId: { in: createdReturnOrderIds } },
      });
      await prisma.returnOrderItem.deleteMany({
        where: { returnOrderId: { in: createdReturnOrderIds } },
      });
      await prisma.shipment.deleteMany({
        where: { returnOrderId: { in: createdReturnOrderIds } },
      });
      await prisma.returnOrder.deleteMany({
        where: { id: { in: createdReturnOrderIds } },
      });
    }

    if (createdShipmentIds.length > 0) {
      await prisma.shipment.deleteMany({
        where: { id: { in: createdShipmentIds } },
      });
    }

    await prisma.inventoryTransaction.deleteMany({
      where: { storeId: { in: [testStoreId, testWarehouseId] } },
    });
    await prisma.inventory.deleteMany({
      where: { storeId: { in: [testStoreId, testWarehouseId] } },
    });

    if (testOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    }

    if (testVariantId) {
      await prisma.productVariant.deleteMany({ where: { id: testVariantId } });
    }
    if (testProductId) {
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }
    if (testCategoryId) {
      await prisma.category.deleteMany({ where: { id: testCategoryId } });
    }
    if (testCustomerId) {
      await prisma.customer.deleteMany({ where: { id: testCustomerId } });
    }
    if (testStaffUserId) {
      await prisma.user.deleteMany({ where: { id: testStaffUserId } });
    }
    if (testStoreId) {
      await prisma.store.deleteMany({ where: { id: testStoreId } });
    }
    if (testWarehouseId) {
      await prisma.store.deleteMany({ where: { id: testWarehouseId } });
    }

    await prisma.$disconnect();
  });

  describe('Flow 1: Showroom Store Drop-off Workflow (EP14-T01)', () => {
    let storeDropoffReturnOrderId: string;

    it('Step 1: Khách hàng tạo yêu cầu hoàn trả mang đến showroom (STORE_DROPOFF)', async () => {
      const result = await submitReturnUseCase.execute(testCustomerId, {
        orderId: testOrderId,
        customerNote: 'Giao nhầm phiên bản, tôi mang qua Showroom Q1 đổi',
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreId,
        items: [
          {
            orderItemId: testOrderItemId,
            quantity: 1,
            reasonCode: ReturnReasonCode.WRONG_ITEM,
            evidenceImages: ['https://cdn.glowup.vn/evidence/wrong-item.jpg'],
            customerNote: 'Nhầm sản phẩm',
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.returnChannel).toBe(ReturnChannel.STORE_DROPOFF);
      expect(result.dropoffLocationId).toBe(testStoreId);
      expect(result.status).toBe(ReturnOrderStatus.SUBMITTED);

      storeDropoffReturnOrderId = result.id;
      createdReturnOrderIds.push(result.id);
    });

    it('Step 2: Nhân viên Showroom tiếp nhận sản phẩm tại quầy -> Quarantined Inventory & ReturnReceipt', async () => {
      const reception = await receiveStoreDropoffUseCase.execute(
        storeDropoffReturnOrderId,
        testStaffUserId,
        {
          receivedItemsCount: 1,
          packageConditionNote: 'Khách mang trả tại quầy, còn seal nguyên vẹn',
        },
      );

      expect(reception.receipt).toBeDefined();
      expect(reception.receipt.receiptCode).toMatch(/^RCP-\d{8}-\d{4}$/);
      expect(reception.receipt.locationId).toBe(testStoreId);
      expect(reception.returnOrder.status).toBe(ReturnOrderStatus.RECEIVED);
      createdReceiptIds.push(reception.receipt.id);

      // Verify Store Inventory: Quarantined quantity increased, available quantity NOT increased
      const storeInv = await prisma.inventory.findUnique({
        where: {
          storeId_productVariantId: {
            storeId: testStoreId,
            productVariantId: testVariantId,
          },
        },
      });

      expect(storeInv).toBeDefined();
      expect(storeInv!.quarantinedQuantity).toBe(1);
      // Formula: quantity - reserved - safety - quarantined - damaged = 1 - 0 - 0 - 1 - 0 = 0
      expect(storeInv!.availableQuantity).toBe(0);

      // Verify InventoryTransaction recorded
      const txLog = await prisma.inventoryTransaction.findFirst({
        where: {
          storeId: testStoreId,
          productVariantId: testVariantId,
          transactionType: 'RETURN_INBOUND',
        },
      });
      expect(txLog).toBeDefined();
      expect(txLog!.quantity).toBe(1);

      // Verify Outbox Event: RMA_RECEIVED_AT_STORE
      const outbox = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: storeDropoffReturnOrderId,
          eventType: 'RMA_RECEIVED_AT_STORE',
        },
      });
      expect(outbox).toBeDefined();
    });
  });

  describe('Flow 2: GHN Reverse Pickup & Warehouse Inbound Workflow (EP14-T02 & EP14-T03)', () => {
    let carrierPickupReturnOrderId: string;
    let dispatchedTrackingCode: string;

    it('Step 1: Khách hàng tạo yêu cầu thu hồi tận nhà (CARRIER_PICKUP)', async () => {
      const result = await submitReturnUseCase.execute(testCustomerId, {
        orderId: testOrderId,
        customerNote: 'Sản phẩm lỗi vòi xịt, yêu cầu shipper đến thu hồi',
        returnChannel: ReturnChannel.CARRIER_PICKUP,
        pickupAddress: {
          address: '200 Pasteur',
          ward: 'Phường 6',
          district: 'Quận 3',
          city: 'Hồ Chí Minh',
        },
        items: [
          {
            orderItemId: testOrderItemId,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            evidenceImages: ['https://cdn.glowup.vn/evidence/defective-pump.jpg'],
            evidenceVideoUrl: 'https://cdn.glowup.vn/evidence/unboxing-video.mp4',
            customerNote: 'Vòi xịt bị tắc',
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.returnChannel).toBe(ReturnChannel.CARRIER_PICKUP);
      expect(result.pickupAddress).toBeDefined();
      expect(result.status).toBe(ReturnOrderStatus.SUBMITTED);

      carrierPickupReturnOrderId = result.id;
      createdReturnOrderIds.push(result.id);
    });

    it('Step 2: Điều phối viên phát lệnh bưu tá GHN thu hồi (EP14-T02) -> Shipment RETURN_PICKUP', async () => {
      const dispatchResult = await reverseShippingService.dispatchReturnPickup(
        carrierPickupReturnOrderId,
        testStaffUserId,
        { destinationWarehouseId: testWarehouseId },
      );

      expect(dispatchResult.shipment).toBeDefined();
      expect(dispatchResult.shipment.shipmentType).toBe('RETURN_PICKUP');
      expect(dispatchResult.shipment.carrierCode).toBe('GHN');
      expect(dispatchResult.shipment.trackingCode).toMatch(/^LAD\d{6}$/);
      expect(dispatchResult.returnOrder.status).toBe(ReturnOrderStatus.APPROVED);

      dispatchedTrackingCode = dispatchResult.shipment.trackingCode!;
      createdShipmentIds.push(dispatchResult.shipment.id);

      // Verify Outbox Event: RETURN_PICKUP_DISPATCHED
      const outbox = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: carrierPickupReturnOrderId,
          eventType: 'RETURN_PICKUP_DISPATCHED',
        },
      });
      expect(outbox).toBeDefined();
    });

    it('Step 3: Bưu tá GHN lấy hàng thành công -> Cập nhật IN_TRANSIT', async () => {
      const transitResult = await reverseShippingService.handleCarrierPickedUp(
        dispatchedTrackingCode,
      );

      expect((transitResult as any).shipment.status).toBe('IN_TRANSIT');
      expect((transitResult as any).returnOrder.status).toBe('IN_TRANSIT');

      // Verify Outbox Event: RMA_IN_TRANSIT
      const outbox = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: carrierPickupReturnOrderId,
          eventType: 'RMA_IN_TRANSIT',
        },
      });
      expect(outbox).toBeDefined();
    });

    it('Step 4: Tổng kho tiếp nhận kiện hàng bằng quét mã barcode tracking (EP14-T03) -> Quarantined Inventory & ReturnReceipt', async () => {
      const whReception = await receiveWarehouseReturnUseCase.execute(
        dispatchedTrackingCode, // Quét trực tiếp mã vận đơn LAD...
        testStaffUserId,
        {
          warehouseId: testWarehouseId,
          packageConditionNote: 'Kiện hàng hoàn từ GHN, nguyên tem niêm phong',
        },
      );

      expect(whReception.receipt).toBeDefined();
      expect(whReception.receipt.receiptCode).toMatch(/^RCP-WH-\d{8}-\d{4}$/);
      expect(whReception.receipt.locationId).toBe(testWarehouseId);
      expect(whReception.returnOrder.status).toBe(ReturnOrderStatus.RECEIVED);
      createdReceiptIds.push(whReception.receipt.id);

      // Verify Warehouse Inventory: quarantined quantity increased, available quantity NOT increased
      const whInv = await prisma.inventory.findUnique({
        where: {
          storeId_productVariantId: {
            storeId: testWarehouseId,
            productVariantId: testVariantId,
          },
        },
      });

      expect(whInv).toBeDefined();
      expect(whInv!.quarantinedQuantity).toBe(1);
      expect(whInv!.availableQuantity).toBe(0);

      // Verify Shipment marked as DELIVERED
      const updatedShipment = await prisma.shipment.findUnique({
        where: { trackingCode: dispatchedTrackingCode },
      });
      expect(updatedShipment!.status).toBe('DELIVERED');

      // Verify Outbox Event: RMA_RECEIVED_AT_WAREHOUSE
      const outbox = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: carrierPickupReturnOrderId,
          eventType: 'RMA_RECEIVED_AT_WAREHOUSE',
        },
      });
      expect(outbox).toBeDefined();
    });
  });
});
