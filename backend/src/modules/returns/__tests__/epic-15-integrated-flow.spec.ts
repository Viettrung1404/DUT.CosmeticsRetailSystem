import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ConfigModule } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { RmaEligibilityService } from '../application/services/rma-eligibility.service';
import { SubmitReturnRequestUseCase } from '../application/use-cases/submit-return-request.use-case';
import { ReceiveStoreDropoffUseCase } from '../application/use-cases/receive-store-dropoff.use-case';
import { ReverseShippingService } from '../application/services/reverse-shipping.service';
import { ReceiveWarehouseReturnUseCase } from '../application/use-cases/receive-warehouse-return.use-case';
import { RmaStatusAggregator } from '../application/services/rma-status-aggregator';
import { InventoryDispositionService } from '../application/services/inventory-disposition.service';
import { ReturnInspectionService } from '../application/services/return-inspection.service';
import { OutboxWriterService } from '../../async-infrastructure/outbox/outbox-writer.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { seedDefaultReturnPolicy } from '../infrastructure/seeds/return-policy.seed';
import {
  ReturnChannel,
  ReturnOrderStatus,
  ReturnReasonCode,
  ReturnDisposition,
} from '../domain/entities/return-policy.entity';

describe('EPIC 15 INTEGRATED FLOW: QC Inspection & Inventory Disposition', () => {
  jest.setTimeout(45000);

  let prisma: PrismaClient;
  let submitReturnUseCase: SubmitReturnRequestUseCase;
  let receiveStoreDropoffUseCase: ReceiveStoreDropoffUseCase;
  let receiveWarehouseReturnUseCase: ReceiveWarehouseReturnUseCase;
  let returnInspectionService: ReturnInspectionService;

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
  let testInspectorUserId: string;

  // Track created IDs for cleanup
  const createdReturnOrderIds: string[] = [];
  const createdReceiptIds: string[] = [];
  const createdInspectionIds: string[] = [];
  const createdShipmentIds: string[] = [];

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
        RmaStatusAggregator,
        InventoryDispositionService,
        ReturnInspectionService,
        OutboxWriterService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    submitReturnUseCase = module.get<SubmitReturnRequestUseCase>(
      SubmitReturnRequestUseCase,
    );
    receiveStoreDropoffUseCase = module.get<ReceiveStoreDropoffUseCase>(
      ReceiveStoreDropoffUseCase,
    );
    receiveWarehouseReturnUseCase = module.get<ReceiveWarehouseReturnUseCase>(
      ReceiveWarehouseReturnUseCase,
    );
    returnInspectionService = module.get<ReturnInspectionService>(
      ReturnInspectionService,
    );

    // 3. Seed Showroom Store
    const store = await prisma.store.create({
      data: {
        code: `STR-E15-${testSuffix}`.slice(0, 20),
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
        code: `WHS-E15-${testSuffix}`.slice(0, 20),
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
        fullName: `Khách Hàng Hoàn Trả E15 ${testSuffix}`,
        phone: `097${Math.floor(1000000 + Math.random() * 9000000)}`,
      },
    });
    testCustomerId = customer.id;

    // 6. Seed Inspector / Staff User
    const inspectorUser = await prisma.user.create({
      data: {
        email: `inspector-e15-${testSuffix}@glowup.vn`,
        passwordHash: 'dummy-hash',
        fullName: `KCS Inspector ${testSuffix}`,
        phone: `096${Math.floor(1000000 + Math.random() * 9000000)}`,
        status: 'ACTIVE',
      },
    });
    testInspectorUserId = inspectorUser.id;

    // 7. Seed Catalog (Category, Product, Variant)
    const category = await prisma.category.create({
      data: {
        name: `Mỹ Phẩm Dưỡng Trắng E15 ${testSuffix}`,
        slug: `duong-trang-e15-${testSuffix}`,
      },
    });
    testCategoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `PRD-E15-${testSuffix}`,
        name: `Serum Dưỡng Ẩm Chuyên Sâu ${testSuffix}`,
        slug: `serum-duong-am-e15-${testSuffix}`,
        basePrice: 600000,
        categoryId: testCategoryId,
        isActive: true,
      },
    });
    testProductId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-E15-${testSuffix}`,
        price: 600000,
        costPrice: 250000,
        stockQuantity: 100,
      },
    });
    testVariantId = variant.id;

    // 8. Seed initial order with nested item and forward shipment (Delivered 2 days ago)
    const deliveredTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-E15-${testSuffix}`,
        customerId: testCustomerId,
        storeId: testStoreId,
        orderType: 'ONLINE',
        status: 'DELIVERED',
        subtotal: 1800000,
        totalAmount: 1800000,
        policyVersionId: testPolicyVersionId,
        updatedAt: deliveredTime,
        items: {
          create: {
            productVariantId: testVariantId,
            productName: `Serum Dưỡng Ẩm Chuyên Sâu ${testSuffix}`,
            variantName: 'Lọ 30ml',
            quantity: 5,
            unitPrice: 600000,
            unitCost: 250000,
            totalPrice: 1800000,
          },
        },
        shipments: {
          create: {
            shipmentCode: `SHP-FWD-E15-${testSuffix}`,
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
    // Delete in reverse dependency order
    if (createdInspectionIds.length > 0) {
      await prisma.returnInspectionItem.deleteMany({
        where: { inspectionId: { in: createdInspectionIds } },
      });
      await prisma.returnInspection.deleteMany({
        where: { id: { in: createdInspectionIds } },
      });
    }

    await prisma.inventoryDisposition.deleteMany({
      where: { locationId: { in: [testStoreId, testWarehouseId] } },
    });

    if (createdReceiptIds.length > 0) {
      await prisma.returnReceipt.deleteMany({
        where: { id: { in: createdReceiptIds } },
      });
    }

    if (createdReturnOrderIds.length > 0) {
      await prisma.outboxEvent.deleteMany({
        where: { aggregateId: { in: createdReturnOrderIds } },
      });
      await prisma.returnStatusHistory.deleteMany({
        where: { returnOrderId: { in: createdReturnOrderIds } },
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
    if (testInspectorUserId) {
      await prisma.user.deleteMany({ where: { id: testInspectorUserId } });
    }
    if (testStoreId) {
      await prisma.store.deleteMany({ where: { id: testStoreId } });
    }
    if (testWarehouseId) {
      await prisma.store.deleteMany({ where: { id: testWarehouseId } });
    }

    await prisma.$disconnect();
  });

  it('1. Standard QC Inspection & RESTOCK Flow (EP15-T01, EP15-T02, EP15-T03)', async () => {
    // 1. Submit return request for 1 item (CHANGE_OF_MIND)
    const returnOrder = await submitReturnUseCase.execute(testCustomerId, {
      orderId: testOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: testStoreId,
      items: [
        {
          orderItemId: testOrderItemId,
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          customerNote: 'Đổi ý không dùng nữa, nguyên seal',
          evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
        },
      ],
    });
    createdReturnOrderIds.push(returnOrder.id);
    expect(returnOrder.status).toBe(ReturnOrderStatus.SUBMITTED);

    // 2. Staff receives item at showroom (moves to QUARANTINED)
    const receiveResult = await receiveStoreDropoffUseCase.execute(
      returnOrder.id,
      testInspectorUserId,
      {
        packageConditionNote: 'Khách bàn giao tại quầy, hộp nguyên vẹn',
      },
    );
    createdReceiptIds.push(receiveResult.receipt.id);
    expect(receiveResult.returnOrder.status).toBe(ReturnOrderStatus.RECEIVED);

    // Verify inventory is in quarantined state
    const inventoryBefore = await prisma.inventory.findUnique({
      where: {
        storeId_productVariantId: {
          storeId: testStoreId,
          productVariantId: testVariantId,
        },
      },
    });
    expect(inventoryBefore?.quarantinedQuantity).toBe(1);

    // 3. Complete Inspection: PASSED and RESTOCK
    const inspectionResult = await returnInspectionService.completeInspection(
      returnOrder.id,
      testInspectorUserId,
      {
        inspectorNotes: 'Đạt kiểm định KCS - Hàng nguyên seal 100%',
        items: [
          {
            returnItemId: returnOrder.items[0].id,
            passedQuantity: 1,
            failedQuantity: 0,
            isSealIntact: true,
            remainingPercentage: 100,
            disposition: ReturnDisposition.RESTOCK,
            reasonDetail: 'Seal nguyên vẹn, vỏ hộp mới 100%',
          },
        ],
      },
    );

    createdInspectionIds.push(inspectionResult.inspection.id);

    // Assert: ReturnOrder transitioned to RESOLUTION_PENDING
    expect(inspectionResult.overallResult).toBe('PASSED');
    expect(inspectionResult.newStatus).toBe(
      ReturnOrderStatus.RESOLUTION_PENDING,
    );

    const updatedOrder = await prisma.returnOrder.findUnique({
      where: { id: returnOrder.id },
    });
    expect(updatedOrder?.status).toBe(ReturnOrderStatus.RESOLUTION_PENDING);

    // Assert: Quarantined inventory decremented back to 0
    const inventoryAfter = await prisma.inventory.findUnique({
      where: {
        storeId_productVariantId: {
          storeId: testStoreId,
          productVariantId: testVariantId,
        },
      },
    });
    expect(inventoryAfter?.quarantinedQuantity).toBe(0);

    // Assert: Inventory disposition record created
    const dispositionRecord = await prisma.inventoryDisposition.findFirst({
      where: { returnItemId: returnOrder.items[0].id },
    });
    expect(dispositionRecord).toBeDefined();
    expect(dispositionRecord?.dispositionType).toBe(ReturnDisposition.RESTOCK);
    expect(dispositionRecord?.quantity).toBe(1);

    // Assert: Outbox event published
    const outbox = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: returnOrder.id,
        eventType: 'RMA_INSPECTION_COMPLETED',
      },
    });
    expect(outbox).toBeDefined();
  });

  it('2. Cosmetics Broken Seal on CHANGE_OF_MIND triggers SCRAP (TC-RMA-05)', async () => {
    // 1. Submit return request
    const returnOrder = await submitReturnUseCase.execute(testCustomerId, {
      orderId: testOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: testStoreId,
      items: [
        {
          orderItemId: testOrderItemId,
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
        },
      ],
    });
    createdReturnOrderIds.push(returnOrder.id);

    // 2. Receive at store
    const rcpt = await receiveStoreDropoffUseCase.execute(
      returnOrder.id,
      testInspectorUserId,
      {},
    );
    createdReceiptIds.push(rcpt.receipt.id);

    // 3. Attempt RESTOCK with broken seal -> must throw BadRequestException
    await expect(
      returnInspectionService.completeInspection(
        returnOrder.id,
        testInspectorUserId,
        {
          items: [
            {
              returnItemId: returnOrder.items[0].id,
              passedQuantity: 1,
              failedQuantity: 0,
              isSealIntact: false, // Broken seal!
              disposition: ReturnDisposition.RESTOCK, // Illegal
            },
          ],
        },
      ),
    ).rejects.toThrow(
      'Mỹ phẩm đổi ý (CHANGE_OF_MIND) đã bị bóc seal / mất niêm phong tuyệt đối không được phép tái nhập kho (RESTOCK)',
    );

    // 4. Change disposition to SCRAP -> Succeeded!
    const validInspection = await returnInspectionService.completeInspection(
      returnOrder.id,
      testInspectorUserId,
      {
        items: [
          {
            returnItemId: returnOrder.items[0].id,
            passedQuantity: 1,
            failedQuantity: 0,
            isSealIntact: false,
            disposition: ReturnDisposition.SCRAP, // Lawful: cosmetics with broken seal scrapped
            reasonDetail: 'Seal rách, chuyển sang khu phế phẩm tiêu hủy',
          },
        ],
      },
    );
    createdInspectionIds.push(validInspection.inspection.id);

    expect(validInspection.overallResult).toBe('PASSED');
    expect(validInspection.newStatus).toBe(ReturnOrderStatus.RESOLUTION_PENDING);

    // Verify damagedQuantity increased in inventory
    const inventory = await prisma.inventory.findUnique({
      where: {
        storeId_productVariantId: {
          storeId: testStoreId,
          productVariantId: testVariantId,
        },
      },
    });
    expect(inventory?.damagedQuantity).toBeGreaterThanOrEqual(1);
  });

  it('3. DEC-05 Skin Irritation / Allergic Claim Remaining Volume Rule (TC-RMA-06)', async () => {
    // 1. Submit return request for ALLERGIC reason
    const returnOrder = await submitReturnUseCase.execute(testCustomerId, {
      orderId: testOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: testStoreId,
      items: [
        {
          orderItemId: testOrderItemId,
          quantity: 1,
          reasonCode: ReturnReasonCode.ALLERGIC,
          customerNote: 'Dùng bị ngứa và mẩn đỏ sau 2 ngày',
          evidenceImages: ['https://s3.glowup.vn/evidence/allergic.jpg'],
        },
      ],
    });
    createdReturnOrderIds.push(returnOrder.id);

    // 2. Receive at store
    const rcpt = await receiveStoreDropoffUseCase.execute(
      returnOrder.id,
      testInspectorUserId,
      {},
    );
    createdReceiptIds.push(rcpt.receipt.id);

    // 3a. Case: usage exceeds 20% (remaining < 80%) -> Rejected under DEC-05
    await expect(
      returnInspectionService.completeInspection(
        returnOrder.id,
        testInspectorUserId,
        {
          items: [
            {
              returnItemId: returnOrder.items[0].id,
              passedQuantity: 1,
              failedQuantity: 0,
              isSealIntact: false,
              remainingPercentage: 65, // < 80% remaining
              disposition: ReturnDisposition.SCRAP,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      'Chính sách DEC-05 quy định: Khiếu nại kích ứng (ALLERGIC) có dung tích còn lại dưới 80% không đủ điều kiện chấp thuận kiểm định đạt chuẩn',
    );

    // 3b. Case: RESTOCK prohibited for ALLERGIC products
    await expect(
      returnInspectionService.completeInspection(
        returnOrder.id,
        testInspectorUserId,
        {
          items: [
            {
              returnItemId: returnOrder.items[0].id,
              passedQuantity: 0,
              failedQuantity: 1,
              isSealIntact: false,
              remainingPercentage: 90,
              disposition: ReturnDisposition.RESTOCK, // Prohibited!
            },
          ],
        },
      ),
    ).rejects.toThrow(
      'Mỹ phẩm kích ứng da đã qua sử dụng tuyệt đối không được phép tái nhập kho bán lẻ (RESTOCK)',
    );

    // 3c. Lawful case: remaining 90% (usage <= 20%), SCRAP disposition -> Succeeded
    const inspection = await returnInspectionService.completeInspection(
      returnOrder.id,
      testInspectorUserId,
      {
        inspectorNotes: 'Hội đồng chuyên môn xác nhận kích ứng da, còn 90% dung tích',
        items: [
          {
            returnItemId: returnOrder.items[0].id,
            passedQuantity: 1,
            failedQuantity: 0,
            isSealIntact: false,
            remainingPercentage: 90,
            disposition: ReturnDisposition.SCRAP,
            reasonDetail: 'Kích ứng da DEC-05 đạt chuẩn đền bù',
          },
        ],
      },
    );
    createdInspectionIds.push(inspection.inspection.id);

    expect(inspection.overallResult).toBe('PASSED');
    expect(inspection.newStatus).toBe(ReturnOrderStatus.RESOLUTION_PENDING);
  });

  it('4. 100% Failed Inspection transitions ReturnOrder to REJECTED & dispatches back to customer', async () => {
    // 1. Submit return request
    const returnOrder = await submitReturnUseCase.execute(testCustomerId, {
      orderId: testOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: testStoreId,
      items: [
        {
          orderItemId: testOrderItemId,
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
        },
      ],
    });
    createdReturnOrderIds.push(returnOrder.id);

    // 2. Receive at store
    const rcpt = await receiveStoreDropoffUseCase.execute(
      returnOrder.id,
      testInspectorUserId,
      {},
    );
    createdReceiptIds.push(rcpt.receipt.id);

    // 3. Inspect: 100% FAILED, return to customer
    const failInspection = await returnInspectionService.completeInspection(
      returnOrder.id,
      testInspectorUserId,
      {
        inspectorNotes: 'Từ chối toàn bộ: Hàng giả hoặc không đúng hàng hệ thống bán',
        items: [
          {
            returnItemId: returnOrder.items[0].id,
            passedQuantity: 0,
            failedQuantity: 1,
            isSealIntact: false,
            remainingPercentage: 50,
            disposition: ReturnDisposition.RETURN_TO_CUSTOMER,
            reasonDetail: 'Số serial không khớp, nghi vấn tráo hàng',
          },
        ],
      },
    );
    createdInspectionIds.push(failInspection.inspection.id);

    // Assert: Order status is REJECTED
    expect(failInspection.overallResult).toBe('FAILED');
    expect(failInspection.newStatus).toBe(ReturnOrderStatus.REJECTED);

    const updated = await prisma.returnOrder.findUnique({
      where: { id: returnOrder.id },
    });
    expect(updated?.status).toBe(ReturnOrderStatus.REJECTED);

    // Assert: Inventory transaction RETURN_REJECTED_DISPATCH recorded
    const txn = await prisma.inventoryTransaction.findFirst({
      where: {
        storeId: testStoreId,
        productVariantId: testVariantId,
        transactionType: 'RETURN_REJECTED',
      },
    });
    expect(txn).toBeDefined();

    // Query inspection details via service
    const inspectionDetails =
      await returnInspectionService.getInspectionByReturnOrderId(
        returnOrder.id,
      );
    expect(inspectionDetails.id).toBe(failInspection.inspection.id);
    expect(inspectionDetails.items).toHaveLength(1);
    expect(inspectionDetails.items[0].disposition).toBe(
      ReturnDisposition.RETURN_TO_CUSTOMER,
    );
  });
});
