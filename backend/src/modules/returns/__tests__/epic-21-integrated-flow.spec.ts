import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ReturnAbuseDetectorService } from '../application/services/return-abuse-detector.service';
import { SubmitReturnRequestUseCase } from '../application/use-cases/submit-return-request.use-case';
import { RmaEligibilityService } from '../application/services/rma-eligibility.service';
import { OutboxWriterService } from '../../async-infrastructure/outbox/outbox-writer.service';
import {
  ReturnReasonCode,
  ReturnChannel,
} from '../domain/entities/return-policy.entity';
import { ReturnRiskLevel } from '../presentation/dtos/return-abuse.dto';
import { seedDefaultReturnPolicy } from '../infrastructure/seeds/return-policy.seed';
import {
  cleanupTestDataByPattern,
  cleanupTestEntities,
} from '../../../core/test/test-cleanup.helper';

describe('EPIC 21 INTEGRATED FLOW: Return Abuse & Fraud Detection Engine', () => {
  jest.setTimeout(90000);

  let prisma: PrismaClient;
  let service: ReturnAbuseDetectorService;
  let submitReturnUseCase: SubmitReturnRequestUseCase;

  const testSuffix = Math.random().toString(36).substring(2, 7);
  let testStoreId: string;
  let testCleanCustomerId: string;
  let testAbuserCustomerId: string;
  let testPolicyVersionId: string;
  let testProductId: string;
  let testVariantId: string;

  const createdOrderIds: string[] = [];
  const createdReturnOrderIds: string[] = [];
  const createdEvaluationIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    const policy = await seedDefaultReturnPolicy(prisma);
    testPolicyVersionId = policy.id;

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        ReturnAbuseDetectorService,
        SubmitReturnRequestUseCase,
        RmaEligibilityService,
        OutboxWriterService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ReturnAbuseDetectorService>(ReturnAbuseDetectorService);
    submitReturnUseCase = module.get<SubmitReturnRequestUseCase>(SubmitReturnRequestUseCase);

    // 1. Seed Store
    const store = await prisma.store.create({
      data: {
        code: `STR-E21-${testSuffix}`.slice(0, 20),
        name: `Showroom E21 ${testSuffix}`,
        address: '150 Đồng Khởi, Quận 1, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        phone: '02837777777',
        type: 'STORE',
        isActive: true,
      },
    });
    testStoreId = store.id;

    // 2. Seed Clean Customer & Abuser Customer
    const cleanCustomer = await prisma.customer.create({
      data: {
        fullName: `Khách Hàng Uy Tín E21 ${testSuffix}`,
        phone: `0944${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });
    testCleanCustomerId = cleanCustomer.id;

    const abuserCustomer = await prisma.customer.create({
      data: {
        fullName: `Khách Hàng Đáng Ngờ E21 ${testSuffix}`,
        phone: `0955${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });
    testAbuserCustomerId = abuserCustomer.id;

    // 3. Seed Category, Product & Variant
    const category = await prisma.category.create({
      data: {
        name: `Mỹ Phẩm Cao Cấp E21 ${testSuffix}`,
        slug: `my-pham-e21-${testSuffix}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        sku: `PRD-E21-${testSuffix}`,
        name: `Nước Hoa Hồng Dưỡng Trắng E21 ${testSuffix}`,
        slug: `nuoc-hoa-hong-e21-${testSuffix}`,
        basePrice: 400000,
        categoryId: category.id,
        isActive: true,
      },
    });
    testProductId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-E21-400K-${testSuffix}`,
        barcode: `893701${Math.floor(100000 + Math.random() * 900000)}`,
        price: 400000,
        costPrice: 150000,
        stockQuantity: 50,
      },
    });
    testVariantId = variant.id;
  });

  afterAll(async () => {
    try {
      await cleanupTestDataByPattern(prisma, testSuffix);
      await cleanupTestEntities(prisma, {
        storeIds: [testStoreId].filter(Boolean),
        categoryIds: [testCategoryId].filter(Boolean),
        productIds: [testProductId].filter(Boolean),
        variantIds: [testVariantId].filter(Boolean),
        customerIds: [testCleanCustomerId, testAbuserCustomerId].filter(Boolean),
        orderIds: createdOrderIds,
        returnOrderIds: createdReturnOrderIds,
      });
    } catch (err) {
      console.warn('Epic 21 Teardown warning:', err);
    } finally {
      await prisma.$disconnect();
    }
  });

  const createDeliveredOrder = async (customerId: string, seq: number): Promise<any> => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-E21-${seq}-${testSuffix}`.slice(0, 20),
        customerId,
        storeId: testStoreId,
        orderType: 'ONLINE',
        status: 'DELIVERED',
        subtotal: 400000,
        discountAmount: 0,
        totalAmount: 400000,
        policyVersionId: testPolicyVersionId,
        createdAt: pastDate,
        updatedAt: pastDate,
        items: {
          create: [
            {
              productVariantId: testVariantId,
              productName: 'Nước Hoa Hồng Dưỡng Trắng',
              variantName: '150ml',
              quantity: 1,
              unitPrice: 400000,
              unitCost: 150000,
              totalPrice: 400000,
              discountAmount: 0,
            },
          ],
        },
        shipments: {
          create: {
            shipmentCode: `SHP-OUT-E21-${seq}-${testSuffix}`,
            carrierCode: 'GHN',
            shipmentType: 'OUTBOUND',
            status: 'DELIVERED',
            deliveredAt: pastDate,
          },
        },
        payments: {
          create: [
            {
              paymentMethod: 'VNPAY',
              amount: 400000,
              status: 'CAPTURED',
              transactionId: `TX-E21-${seq}-${testSuffix}`,
            },
          ],
        },
      },
      include: { items: true },
    });
    createdOrderIds.push(order.id);
    return order;
  };

  describe('Kịch bản 1: Đánh giá hồ sơ rủi ro thấp (LOW) cho khách hàng uy tín', () => {
    it('Khách hàng mua 3 đơn, lần đầu yêu cầu đổi trả -> Điểm rủi ro < 30 (LOW), không bị gắn cờ', async () => {
      // Tạo 3 đơn mua cho clean customer
      await createDeliveredOrder(testCleanCustomerId, 1);
      await createDeliveredOrder(testCleanCustomerId, 2);
      const order3 = await createDeliveredOrder(testCleanCustomerId, 3);

      const returnOrder = await submitReturnUseCase.execute(testCleanCustomerId, {
        orderId: order3.id,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreId,
        items: [
          {
            orderItemId: order3.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            customerNote: 'Vòi nhấn bị lỏng',
            evidenceImages: ['https://s3.glowup.vn/evidence/clean-bottle.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing-clean.mp4',
          },
        ],
      });
      createdReturnOrderIds.push(returnOrder.id);

      const evaluation = await service.evaluateReturnOrder(returnOrder.id);

      expect(evaluation.riskScore).toBeLessThan(30);
      expect(evaluation.riskLevel).toBe(ReturnRiskLevel.LOW);
      expect(evaluation.isFlagged).toBe(false);

      // Xác minh trong DB
      const updatedRma = await prisma.returnOrder.findUnique({
        where: { id: returnOrder.id },
      });
      expect(updatedRma?.riskLevel).toBe(ReturnRiskLevel.LOW);
      expect(updatedRma?.isFraudFlagged).toBe(false);
    });
  });

  describe('Kịch bản 2: Phát hiện gian lận và gắn cờ (FLAGGED_FOR_FRAUD) khi có dấu hiệu lạm dụng', () => {
    it('Khách hàng mua 2 đơn nhưng trả cả 2, từng có sản phẩm bị KCS từ chối -> Điểm rủi ro >= 60 (HIGH), bị gắn cờ', async () => {
      // 1. Tạo 2 đơn cho abuser customer
      const orderA = await createDeliveredOrder(testAbuserCustomerId, 10);
      const orderB = await createDeliveredOrder(testAbuserCustomerId, 11);

      // Đơn A đã tạo RMA và bị KCS FAILED (tráo hàng/rách seal)
      const rmaA = await submitReturnUseCase.execute(testAbuserCustomerId, {
        orderId: orderA.id,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreId,
        items: [
          {
            orderItemId: orderA.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            evidenceImages: ['https://s3.glowup.vn/evidence/fake-bottle.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing-fake.mp4',
          },
        ],
      });
      createdReturnOrderIds.push(rmaA.id);

      // Cập nhật dòng item này là FAILED KCS
      await prisma.returnOrderItem.updateMany({
        where: { returnOrderId: rmaA.id },
        data: { inspectionStatus: 'FAILED' },
      });

      // 2. Khách tiếp tục nộp RMA cho đơn B
      const rmaB = await submitReturnUseCase.execute(testAbuserCustomerId, {
        orderId: orderB.id,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreId,
        items: [
          {
            orderItemId: orderB.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            customerNote: 'Lại bị lỗi',
            evidenceImages: ['https://s3.glowup.vn/evidence/fake-bottle-2.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing-fake-2.mp4',
          },
        ],
      });
      createdReturnOrderIds.push(rmaB.id);

      // 3. Đánh giá hồ sơ rủi ro
      const evaluation = await service.evaluateReturnOrder(rmaB.id);

      expect(evaluation.riskScore).toBeGreaterThanOrEqual(60);
      expect(evaluation.isFlagged).toBe(true);
      expect([ReturnRiskLevel.HIGH, ReturnRiskLevel.CRITICAL]).toContain(evaluation.riskLevel);
      expect(evaluation.factors.some((f) => f.factorCode === 'PAST_QC_REJECTIONS')).toBe(true);

      // Kiểm tra DB cập nhật cờ gian lận
      const updatedRmaB = await prisma.returnOrder.findUnique({
        where: { id: rmaB.id },
      });
      expect(updatedRmaB?.isFraudFlagged).toBe(true);
      expect(updatedRmaB?.fraudReason).toBeDefined();

      // Kiểm tra sự kiện Outbox RETURN_ABUSE_FLAGGED
      const outboxEvt = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: rmaB.id,
          eventType: 'RETURN_ABUSE_FLAGGED',
        },
      });
      expect(outboxEvt).toBeDefined();
    });
  });

  describe('Kịch bản 3: Truy vấn Customer Risk Profile & Xác định danh sách theo dõi (Watchlist)', () => {
    it('Hồ sơ rủi ro khách hàng phản ánh tỷ lệ hoàn trả và gắn cờ Watchlist', async () => {
      const profile = await service.getCustomerRiskProfile(testAbuserCustomerId);

      expect(profile.customerId).toBe(testAbuserCustomerId);
      expect(profile.totalOrders).toBe(2);
      expect(profile.totalReturns).toBe(2);
      expect(profile.returnRatePercentage).toBe(100);
      expect(profile.totalFailedInspections).toBe(1);
      expect(profile.isWatchlist).toBe(true);
    });
  });
});
