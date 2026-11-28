import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { RmaEligibilityService } from '../application/services/rma-eligibility.service';
import { SubmitReturnRequestUseCase } from '../application/use-cases/submit-return-request.use-case';
import { OutboxWriterService } from '../../async-infrastructure/outbox/outbox-writer.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { seedDefaultReturnPolicy } from '../infrastructure/seeds/return-policy.seed';
import {
  cleanupTestDataByPattern,
  cleanupTestEntities,
} from '../../../core/test/test-cleanup.helper';
import {
  ReturnChannel,
  ReturnOrderStatus,
  ReturnReasonCode,
  ReturnInspectionStatus,
} from '../domain/entities/return-policy.entity';
import { SubmitReturnRequestDto } from '../presentation/dtos/submit-return-request.dto';

describe('EPIC 13 INTEGRATED FLOW: Policy Versioning & RMA Claims Engine', () => {
  jest.setTimeout(30000);

  let prisma: PrismaClient;
  let rmaEligibilityService: RmaEligibilityService;
  let submitReturnRequestUseCase: SubmitReturnRequestUseCase;

  const testSuffix = Math.random().toString(36).substring(2, 7);
  let testCustomerId: string;
  let testStoreId: string;
  let testCategoryId: string;
  let testProductId: string;
  let testVariantId: string;
  let testOrderId: string;
  let testOrderItemId: string;
  let testPolicyVersionId: string;
  let createdReturnOrderId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // 1. Seed or retrieve active Return Policy Version
    const policy = await seedDefaultReturnPolicy(prisma);
    testPolicyVersionId = policy.id;

    // 2. Setup testing dependencies with real PrismaService
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RmaEligibilityService,
        SubmitReturnRequestUseCase,
        OutboxWriterService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    rmaEligibilityService = module.get<RmaEligibilityService>(RmaEligibilityService);
    submitReturnRequestUseCase = module.get<SubmitReturnRequestUseCase>(SubmitReturnRequestUseCase);

    // 3. Seed test entities in database
    const store = await prisma.store.create({
      data: {
        code: `S13${testSuffix}`.slice(0, 20),
        name: `Showroom GlowUp Epic13 ${testSuffix}`,
        address: '100 Nguyễn Huệ, Quận 1, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        phone: '0281234567',
        isActive: true,
      },
    });
    testStoreId = store.id;

    const customer = await prisma.customer.create({
      data: {
        fullName: `Khách Hàng Test E13 ${testSuffix}`,
        phone: `098${Math.floor(1000000 + Math.random() * 9000000)}`,
      },
    });
    testCustomerId = customer.id;

    const category = await prisma.category.create({
      data: {
        name: `Chăm Sóc Da E13 ${testSuffix}`,
        slug: `cham-soc-da-${testSuffix}`,
      },
    });
    testCategoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `PRD-${testSuffix}`,
        name: `Serum Phục Hồi GlowUp ${testSuffix}`,
        slug: `serum-phuc-hoi-${testSuffix}`,
        basePrice: 350000,
        categoryId: testCategoryId,
        isActive: true,
      },
    });
    testProductId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-${testSuffix}`,
        price: 350000,
        costPrice: 150000,
        stockQuantity: 100,
      },
    });
    testVariantId = variant.id;

    // 4. Create delivered Order with 1 item (quantity: 2)
    const deliveredTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-E13-${testSuffix}`,
        customerId: testCustomerId,
        storeId: testStoreId,
        orderType: 'ONLINE',
        status: 'DELIVERED',
        subtotal: 700000,
        totalAmount: 700000,
        policyVersionId: testPolicyVersionId,
        updatedAt: deliveredTime,
        items: {
          create: {
            productVariantId: testVariantId,
            productName: `Serum Phục Hồi GlowUp ${testSuffix}`,
            variantName: 'Chai 30ml',
            quantity: 2,
            unitPrice: 350000,
            unitCost: 150000,
            totalPrice: 700000,
          },
        },
        shipments: {
          create: {
            shipmentCode: `SHP-E13-${testSuffix}`,
            carrierCode: 'GHN',
            shipmentType: 'OUTBOUND',
            status: 'DELIVERED',
            deliveredAt: deliveredTime,
          },
        },
      },
      include: {
        items: true,
      },
    });

    testOrderId = order.id;
    testOrderItemId = order.items[0].id;
  });

  afterAll(async () => {
    try {
      await cleanupTestDataByPattern(prisma, testSuffix);
      await cleanupTestEntities(prisma, {
        storeIds: [testStoreId].filter(Boolean),
        categoryIds: [testCategoryId].filter(Boolean),
        productIds: [testProductId].filter(Boolean),
        variantIds: [testVariantId].filter(Boolean),
        customerIds: [testCustomerId].filter(Boolean),
        orderIds: [testOrderId].filter(Boolean),
        returnOrderIds: [createdReturnOrderId].filter(Boolean),
      });
    } catch (err) {
      console.warn('Epic 13 Teardown warning:', err);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('Step 1: Check Order RMA Eligibility when delivered 1 day ago', async () => {
    const result = await rmaEligibilityService.checkOrderEligibility(
      testOrderId,
      testCustomerId,
    );

    expect(result).toBeDefined();
    expect(result.isEligible).toBe(true);
    expect(result.orderCode).toBe(`ORD-E13-${testSuffix}`);
    expect(result.policyVersionName).toBe('POLICY-V1-2026');
    expect(result.items).toHaveLength(1);

    const item = result.items[0];
    expect(item.orderItemId).toBe(testOrderItemId);
    expect(item.availableReturnQuantity).toBe(2);
    expect(item.alreadyReturnedQuantity).toBe(0);
    expect(item.isEligible).toBe(true);

    // Verify DEC-05 ALLERGIC rule is available
    const allergicRule = item.allowedRules.find(
      (r) => r.reasonCode === ReturnReasonCode.ALLERGIC,
    );
    expect(allergicRule).toBeDefined();
    expect(allergicRule?.requiresManualReview).toBe(true);
    expect(allergicRule?.maxUsagePercentage).toBe(20);
  });

  it('Step 2: Submit Customer Return Claim for 1 unit with DEC-05 ALLERGIC reason (ACID & Outbox)', async () => {
    const dto: SubmitReturnRequestDto = {
      orderId: testOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: testStoreId,
      customerNote: 'Da bị kích ứng sau khi bôi serum 1 lần',
      items: [
        {
          orderItemId: testOrderItemId,
          quantity: 1,
          reasonCode: ReturnReasonCode.ALLERGIC,
          customerNote: 'Sử dụng dưới 20% dung tích lọ serum',
          evidenceImages: ['https://cdn.glowup.vn/evidence-skin.jpg'],
        },
      ],
    };

    const returnOrder = await submitReturnRequestUseCase.execute(
      testCustomerId,
      dto,
    );

    expect(returnOrder).toBeDefined();
    expect(returnOrder.id).toBeDefined();
    createdReturnOrderId = returnOrder.id;

    expect(returnOrder.returnCode).toMatch(/^RET-\d{8}-\d{4}$/);
    expect(returnOrder.status).toBe(ReturnOrderStatus.SUBMITTED);
    expect(returnOrder.returnChannel).toBe(ReturnChannel.STORE_DROPOFF);
    expect(returnOrder.dropoffLocationId).toBe(testStoreId);
    expect(returnOrder.items).toHaveLength(1);

    const retItem = returnOrder.items[0];
    expect(retItem.orderItemId).toBe(testOrderItemId);
    expect(retItem.quantity).toBe(1);
    expect(retItem.reasonCode).toBe(ReturnReasonCode.ALLERGIC);
    expect(retItem.inspectionStatus).toBe(ReturnInspectionStatus.PENDING);

    // Verify Outbox Event was recorded in same transaction
    const outboxEvent = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: returnOrder.id,
        eventType: 'RMA_REQUEST_SUBMITTED',
      },
    });

    expect(outboxEvent).toBeDefined();
    expect(outboxEvent?.status).toBe('PENDING');
    const payload = outboxEvent?.payload as any;
    expect(payload.returnOrderId).toBe(returnOrder.id);
    expect(payload.returnCode).toBe(returnOrder.returnCode);
    expect(payload.orderId).toBe(testOrderId);
    expect(payload.customerId).toBe(testCustomerId);
  });

  it('Step 3: Re-check Order Eligibility after partial return', async () => {
    const result = await rmaEligibilityService.checkOrderEligibility(
      testOrderId,
      testCustomerId,
    );

    expect(result.isEligible).toBe(true);
    const item = result.items[0];
    expect(item.purchasedQuantity).toBe(2);
    expect(item.alreadyReturnedQuantity).toBe(1);
    expect(item.availableReturnQuantity).toBe(1);
  });

  it('Step 4: Claim remaining quantity and verify item availability updates', async () => {
    const dto: SubmitReturnRequestDto = {
      orderId: testOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: testStoreId,
      customerNote: 'Trả nốt chai còn lại',
      items: [
        {
          orderItemId: testOrderItemId,
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          evidenceImages: ['https://cdn.glowup.vn/evidence-box.jpg'],
        },
      ],
    };

    const secondReturnOrder = await submitReturnRequestUseCase.execute(
      testCustomerId,
      dto,
    );

    expect(secondReturnOrder).toBeDefined();

    // Clean up second return order
    await prisma.outboxEvent.deleteMany({
      where: { aggregateId: secondReturnOrder.id },
    });
    await prisma.returnOrderItem.deleteMany({
      where: { returnOrderId: secondReturnOrder.id },
    });
    await prisma.returnOrder.deleteMany({
      where: { id: secondReturnOrder.id },
    });

    // Re-check: now 1 unit available again after cleaning up 2nd order
    const result = await rmaEligibilityService.checkOrderEligibility(
      testOrderId,
      testCustomerId,
    );

    expect(result.items[0].alreadyReturnedQuantity).toBe(1);
    expect(result.items[0].availableReturnQuantity).toBe(1);
  });

  it('Step 5: Expired boundary test: Order delivered 45 days ago is rejected with RETURN_WINDOW_EXPIRED', async () => {
    const ancientDeliveredTime = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

    const ancientOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-ANC-${testSuffix}`,
        customerId: testCustomerId,
        storeId: testStoreId,
        orderType: 'ONLINE',
        status: 'DELIVERED',
        subtotal: 350000,
        totalAmount: 350000,
        policyVersionId: testPolicyVersionId,
        updatedAt: ancientDeliveredTime,
        items: {
          create: {
            productVariantId: testVariantId,
            productName: `Serum Phục Hồi GlowUp ${testSuffix}`,
            variantName: 'Chai 30ml',
            quantity: 1,
            unitPrice: 350000,
            unitCost: 150000,
            totalPrice: 350000,
          },
        },
        shipments: {
          create: {
            shipmentCode: `SHP-ANC-${testSuffix}`,
            carrierCode: 'GHN',
            shipmentType: 'OUTBOUND',
            status: 'DELIVERED',
            deliveredAt: ancientDeliveredTime,
          },
        },
      },
    });

    const result = await rmaEligibilityService.checkOrderEligibility(
      ancientOrder.id,
      testCustomerId,
    );

    expect(result.isEligible).toBe(false);
    expect(result.ineligibleReasons).toContain('RETURN_WINDOW_EXPIRED');
    expect(result.items[0].isEligible).toBe(false);
    expect(result.items[0].ineligibleReason).toBe('RETURN_WINDOW_EXPIRED');

    // Clean up ancient order
    await prisma.shipment.deleteMany({ where: { orderId: ancientOrder.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: ancientOrder.id } });
    await prisma.order.deleteMany({ where: { id: ancientOrder.id } });
  });
});
