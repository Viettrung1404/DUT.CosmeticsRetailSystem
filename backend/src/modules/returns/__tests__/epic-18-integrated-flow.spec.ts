import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ConfigModule } from '@nestjs/config';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { RmaEligibilityService } from '../application/services/rma-eligibility.service';
import { SubmitReturnRequestUseCase } from '../application/use-cases/submit-return-request.use-case';
import { ReceiveStoreDropoffUseCase } from '../application/use-cases/receive-store-dropoff.use-case';
import { ReverseShippingService } from '../application/services/reverse-shipping.service';
import { ReceiveWarehouseReturnUseCase } from '../application/use-cases/receive-warehouse-return.use-case';
import { RmaStatusAggregator } from '../application/services/rma-status-aggregator';
import { InventoryDispositionService } from '../application/services/inventory-disposition.service';
import { ReturnInspectionService } from '../application/services/return-inspection.service';
import { RefundCalculatorService } from '../application/services/refund-calculator.service';
import { RefundExecutionService } from '../application/services/refund-execution.service';
import { PaymentRefundGatewayAdapter } from '../infrastructure/adapters/payment-refund-gateway.adapter';
import { PaymentRefundGatewayService } from '../application/services/payment-refund-gateway.service';
import { ExchangeSettlementService } from '../application/services/exchange-settlement.service';
import { RmaActionMatrixService } from '../application/services/rma-action-matrix.service';
import { RmaQueueService } from '../application/services/rma-queue.service';
import { AtpCalculatorService } from '../../inventory/application/services/atp-calculator.service';
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
  ReturnDisposition,
} from '../domain/entities/return-policy.entity';

describe('EPIC 18 INTEGRATED FLOW: Admin RMA Operations & Work Queues', () => {
  jest.setTimeout(90000);

  let prisma: PrismaClient;
  let submitReturnUseCase: SubmitReturnRequestUseCase;
  let receiveStoreDropoffUseCase: ReceiveStoreDropoffUseCase;
  let returnInspectionService: ReturnInspectionService;
  let refundExecutionService: RefundExecutionService;
  let rmaQueueService: RmaQueueService;
  let rmaActionMatrixService: RmaActionMatrixService;

  const testSuffix = Math.random().toString(36).substring(2, 7);
  let testStoreAId: string;
  let testStoreBId: string;
  let testCustomerId: string;
  let testOperatorHqId: string;
  let testOperatorStoreAId: string;
  let testCategoryId: string;
  let testProductId: string;
  let testVariantId: string;
  let testPolicyVersionId: string;

  // Track entities for teardown
  const createdOrderIds: string[] = [];
  const createdReturnOrderIds: string[] = [];
  const createdReceiptIds: string[] = [];
  const createdInspectionIds: string[] = [];
  const createdRefundIds: string[] = [];

  let order1: any;
  let order2A: any;
  let order2B: any;
  let order3: any;
  let order4: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // 1. Seed or retrieve active Return Policy Version
    const policy = await seedDefaultReturnPolicy(prisma);
    testPolicyVersionId = policy.id;

    // 2. Setup testing module
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
        RefundCalculatorService,
        RefundExecutionService,
        PaymentRefundGatewayAdapter,
        PaymentRefundGatewayService,
        AtpCalculatorService,
        ExchangeSettlementService,
        RmaActionMatrixService,
        RmaQueueService,
        OutboxWriterService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    submitReturnUseCase = module.get<SubmitReturnRequestUseCase>(SubmitReturnRequestUseCase);
    receiveStoreDropoffUseCase = module.get<ReceiveStoreDropoffUseCase>(ReceiveStoreDropoffUseCase);
    returnInspectionService = module.get<ReturnInspectionService>(ReturnInspectionService);
    refundExecutionService = module.get<RefundExecutionService>(RefundExecutionService);
    rmaQueueService = module.get<RmaQueueService>(RmaQueueService);
    rmaActionMatrixService = module.get<RmaActionMatrixService>(RmaActionMatrixService);

    // 3. Seed 2 Stores: Store A (Showroom Q1) & Store B (Showroom Q10)
    const storeA = await prisma.store.create({
      data: {
        code: `STR-A-${testSuffix}`.slice(0, 20),
        name: `Showroom GlowUp Q1 ${testSuffix}`,
        address: '100 Lê Lợi, Bến Thành, Quận 1, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        phone: '02838111111',
        type: 'STORE',
        isActive: true,
      },
    });
    testStoreAId = storeA.id;

    const storeB = await prisma.store.create({
      data: {
        code: `STR-B-${testSuffix}`.slice(0, 20),
        name: `Showroom GlowUp Q10 ${testSuffix}`,
        address: '200 Ba Tháng Hai, Phường 12, Quận 10, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Quận 10',
        phone: '02838222222',
        type: 'STORE',
        isActive: true,
      },
    });
    testStoreBId = storeB.id;

    // 4. Seed Operators
    const operatorHq = await prisma.user.create({
      data: {
        email: `hq.admin.${testSuffix}@glowup.vn`,
        passwordHash: 'dummy-hashed-pwd',
        fullName: `Quản Trị Viên Tổng Bộ ${testSuffix}`,
        phone: `0901${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'ACTIVE',
      },
    });
    testOperatorHqId = operatorHq.id;

    const operatorStoreA = await prisma.user.create({
      data: {
        email: `store.staff.a.${testSuffix}@glowup.vn`,
        passwordHash: 'dummy-hashed-pwd',
        fullName: `Nhân Viên Showroom A ${testSuffix}`,
        phone: `0902${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'ACTIVE',
      },
    });
    testOperatorStoreAId = operatorStoreA.id;

    // 5. Seed Customer
    const customer = await prisma.customer.create({
      data: {
        fullName: `Khách Hàng Điều Hành E18 ${testSuffix}`,
        phone: `0988${Math.floor(100000 + Math.random() * 900000)}`,
        totalPoints: 100,
      },
    });
    testCustomerId = customer.id;

    // 6. Seed Category, Product & Variant
    const category = await prisma.category.create({
      data: {
        name: `Mỹ Phẩm Quản Trị E18 ${testSuffix}`,
        slug: `my-pham-e18-${testSuffix}`,
      },
    });
    testCategoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `PRD-E18-${testSuffix}`,
        name: `Serum Dưỡng Ẩm Chuyên Sâu ${testSuffix}`,
        slug: `serum-e18-${testSuffix}`,
        basePrice: 300000,
        categoryId: testCategoryId,
        isActive: true,
      },
    });
    testProductId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-E18-300K-${testSuffix}`,
        barcode: `893801${Math.floor(100000 + Math.random() * 900000)}`,
        option1Value: '50ml',
        price: 300000,
        costPrice: 120000,
        stockQuantity: 100,
      },
    });
    testVariantId = variant.id;

    // 7. Seed Orders helper
    const createTestOrder = async (seq: number, storeId = testStoreAId) => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);

      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-E18-${seq}-${testSuffix}`.slice(0, 20),
          customerId: testCustomerId,
          storeId,
          orderType: 'ONLINE',
          status: 'DELIVERED',
          subtotal: 300000,
          discountAmount: 0,
          totalAmount: 300000,
          policyVersionId: testPolicyVersionId,
          createdAt: pastDate,
          updatedAt: pastDate,
          items: {
            create: [
              {
                productVariantId: testVariantId,
                productName: 'Serum Dưỡng Ẩm Chuyên Sâu',
                variantName: '50ml',
                quantity: 1,
                unitPrice: 300000,
                unitCost: 120000,
                totalPrice: 300000,
                discountAmount: 0,
              },
            ],
          },
          shipments: {
            create: {
              shipmentCode: `SHP-E18-${seq}-${testSuffix}`,
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
                amount: 300000,
                status: 'CAPTURED',
                transactionId: `TX-VNPAY-E18-${seq}-${testSuffix}`,
              },
            ],
          },
        },
        include: { items: true },
      });
      createdOrderIds.push(order.id);
      return order;
    };

    order1 = await createTestOrder(1, testStoreAId);
    order2A = await createTestOrder(2, testStoreAId);
    order2B = await createTestOrder(3, testStoreBId);
    order3 = await createTestOrder(4, testStoreAId);
    order4 = await createTestOrder(5, testStoreAId);
  });

  afterAll(async () => {
    try {
      await cleanupTestDataByPattern(prisma, testSuffix);
      await cleanupTestEntities(prisma, {
        storeIds: [testStoreAId, testStoreBId].filter(Boolean),
        categoryIds: [testCategoryId].filter(Boolean),
        productIds: [testProductId].filter(Boolean),
        variantIds: [testVariantId].filter(Boolean),
        customerIds: [testCustomerId].filter(Boolean),
        userIds: [testOperatorHqId, testOperatorStoreAId].filter(Boolean),
        orderIds: createdOrderIds,
        returnOrderIds: createdReturnOrderIds,
        shipmentIds: createdShipmentIds,
        refundIds: createdRefundIds,
        receiptIds: createdReceiptIds,
        inspectionIds: createdInspectionIds,
      });
    } catch (err) {
      console.warn('Epic 18 Teardown warning:', err);
    } finally {
      await prisma.$disconnect();
    }
  });

  // =========================================================================
  // KỊCH BẢN 1: PHÂN LUỒNG QUA 4 HÀNG ĐỢI CÔNG VIỆC (EP18-T01)
  // Hồ sơ RMA luân chuyển tuần tự qua: REVIEW -> DROPOFF -> INSPECTION -> SETTLEMENT -> COMPLETED
  // =========================================================================
  describe('Kịch bản 1: Phân luồng & chuyển tiếp qua 4 Hàng Đợi Công Việc (EP18-T01)', () => {
    let testRmaId: string;
    let testRmaItemId: string;

    it('1.1 Nộp hồ sơ mới (SUBMITTED) -> Xuất hiện trên hàng đợi REVIEW', async () => {
      const returnOrder = await submitReturnUseCase.execute(testCustomerId, {
        orderId: order1.id,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreAId,
        items: [
          {
            orderItemId: order1.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            customerNote: 'Sản phẩm lỗi đóng mở nắp',
            evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing.mp4',
          },
        ],
      });

      testRmaId = returnOrder.id;
      testRmaItemId = returnOrder.items[0].id;
      createdReturnOrderIds.push(testRmaId);

      // Version mặc định khởi tạo phải là 1 (EP18-T02)
      expect(returnOrder.version).toBe(1);

      // Xuất hiện trên REVIEW queue
      const reviewQueue = await rmaQueueService.getReviewQueue({ page: 1, limit: 10 });
      const foundInReview = reviewQueue.data.find((it) => it.id === testRmaId);
      expect(foundInReview).toBeDefined();
      expect(foundInReview.status).toBe(ReturnOrderStatus.SUBMITTED);
      expect(foundInReview.availableActions).toContain('APPROVE');
      expect(foundInReview.availableActions).toContain('REJECT');

      // Không xuất hiện trên các queue khác
      const dropoffQueue = await rmaQueueService.getDropoffQueue({ page: 1, limit: 10 });
      expect(dropoffQueue.data.find((it) => it.id === testRmaId)).toBeUndefined();
    });

    it('1.2 Duyệt yêu cầu (APPROVED) -> Chuyển sang hàng đợi DROPOFF', async () => {
      const transitionRes = await rmaActionMatrixService.transitionWithOcc(
        testRmaId,
        testOperatorHqId,
        {
          expectedVersion: 1,
          targetStatus: ReturnOrderStatus.APPROVED,
          note: 'Duyệt tiếp nhận đổi trả tại quầy Showroom',
        },
      );

      expect(transitionRes.returnOrder.status).toBe(ReturnOrderStatus.APPROVED);
      expect(transitionRes.returnOrder.version).toBe(2);

      // Biến mất khỏi REVIEW queue
      const reviewQueue = await rmaQueueService.getReviewQueue({ page: 1, limit: 10 });
      expect(reviewQueue.data.find((it) => it.id === testRmaId)).toBeUndefined();

      // Xuất hiện trên DROPOFF queue
      const dropoffQueue = await rmaQueueService.getDropoffQueue({ page: 1, limit: 10 });
      const foundInDropoff = dropoffQueue.data.find((it) => it.id === testRmaId);
      expect(foundInDropoff).toBeDefined();
      expect(foundInDropoff.availableActions).toContain('RECEIVE_DROPOFF');
    });

    it('1.3 Showroom tiếp nhận (RECEIVED) -> Chuyển sang hàng đợi INSPECTION', async () => {
      const receiveResult = await receiveStoreDropoffUseCase.execute(
        testRmaId,
        testOperatorStoreAId,
        { packageConditionNote: 'Đã nhận tại quầy Showroom A, nguyên vẹn vỏ hộp' },
      );
      createdReceiptIds.push(receiveResult.receipt.id);

      // Biến mất khỏi DROPOFF queue
      const dropoffQueue = await rmaQueueService.getDropoffQueue({ page: 1, limit: 10 });
      expect(dropoffQueue.data.find((it) => it.id === testRmaId)).toBeUndefined();

      // Xuất hiện trên INSPECTION queue
      const inspectionQueue = await rmaQueueService.getInspectionQueue({ page: 1, limit: 10 });
      const foundInInspection = inspectionQueue.data.find((it) => it.id === testRmaId);
      expect(foundInInspection).toBeDefined();
      expect(foundInInspection.availableActions).toContain('START_INSPECTION');
      expect(foundInInspection.availableActions).toContain('COMPLETE_INSPECTION');
      // AC2: Tuyệt đối không có REFUND hay EXCHANGE khi đang ở RECEIVED
      expect(foundInInspection.availableActions).not.toContain('CREATE_REFUND');
      expect(foundInInspection.availableActions).not.toContain('CREATE_EXCHANGE_ORDER');
    });

    it('1.4 Kiểm định KCS PASSED -> Chuyển sang hàng đợi SETTLEMENT', async () => {
      const inspectRes = await returnInspectionService.completeInspection(
        testRmaId,
        testOperatorStoreAId,
        {
          inspectorNotes: 'Hàng lỗi vòi xịt còn nguyên tem, nhập kho chờ xử lý',
          items: [
            {
              returnItemId: testRmaItemId,
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
      createdInspectionIds.push(inspectRes.inspection.id);

      // Biến mất khỏi INSPECTION queue
      const inspectionQueue = await rmaQueueService.getInspectionQueue({ page: 1, limit: 10 });
      expect(inspectionQueue.data.find((it) => it.id === testRmaId)).toBeUndefined();

      // Xuất hiện trên SETTLEMENT queue
      const settlementQueue = await rmaQueueService.getSettlementQueue({ page: 1, limit: 10 });
      const foundInSettlement = settlementQueue.data.find((it) => it.id === testRmaId);
      expect(foundInSettlement).toBeDefined();
      expect(foundInSettlement.availableActions).toContain('CREATE_REFUND');
      expect(foundInSettlement.availableActions).toContain('CREATE_EXCHANGE_ORDER');
    });

    it('1.5 Quyết toán hoàn tất (COMPLETED) -> Biến mất khỏi toàn bộ 4 hàng đợi', async () => {
      const refundResult = await refundExecutionService.createRefundForReturn(
        testRmaId,
        testOperatorHqId,
        { notes: 'Hoàn tiền cho khách sau khi KCS đạt chuẩn' },
      );
      createdRefundIds.push(refundResult.refund.id);

      // Cập nhật ReturnOrder sang COMPLETED
      await prisma.returnOrder.update({
        where: { id: testRmaId },
        data: { status: ReturnOrderStatus.COMPLETED },
      });

      // Kiểm tra biến mất khỏi cả 4 queue
      const [review, dropoff, inspection, settlement] = await Promise.all([
        rmaQueueService.getReviewQueue({ page: 1, limit: 10 }),
        rmaQueueService.getDropoffQueue({ page: 1, limit: 10 }),
        rmaQueueService.getInspectionQueue({ page: 1, limit: 10 }),
        rmaQueueService.getSettlementQueue({ page: 1, limit: 10 }),
      ]);

      expect(review.data.find((it) => it.id === testRmaId)).toBeUndefined();
      expect(dropoff.data.find((it) => it.id === testRmaId)).toBeUndefined();
      expect(inspection.data.find((it) => it.id === testRmaId)).toBeUndefined();
      expect(settlement.data.find((it) => it.id === testRmaId)).toBeUndefined();
    });
  });

  // =========================================================================
  // KỊCH BẢN 2: PHÂN QUYỀN ĐỊA BÀN CHI NHÁNH SHOWROOM (AC1 LOCATION SCOPE)
  // Nhân viên Showroom A chỉ thấy hồ sơ hẹn trả tại Showroom A
  // =========================================================================
  describe('Kịch bản 2: Phân quyền địa bàn chi nhánh Showroom (AC1 Location Scope)', () => {
    let rmaStoreAId: string;
    let rmaStoreBId: string;

    beforeAll(async () => {
      // Tạo 2 hồ sơ trả hàng: 1 ở Showroom A, 1 ở Showroom B
      const rmaA = await submitReturnUseCase.execute(testCustomerId, {
        orderId: order2A.id,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreAId,
        items: [
          {
            orderItemId: order2A.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
            customerNote: 'Trả hàng tại Showroom A',
            evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
          },
        ],
      });
      rmaStoreAId = rmaA.id;
      createdReturnOrderIds.push(rmaStoreAId);

      // Chuyển sang APPROVED để vào Dropoff Queue
      await prisma.returnOrder.update({
        where: { id: rmaStoreAId },
        data: { status: ReturnOrderStatus.APPROVED },
      });

      const rmaB = await submitReturnUseCase.execute(testCustomerId, {
        orderId: order2B.id,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreBId,
        items: [
          {
            orderItemId: order2B.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
            customerNote: 'Trả hàng tại Showroom B',
            evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
          },
        ],
      });
      rmaStoreBId = rmaB.id;
      createdReturnOrderIds.push(rmaStoreBId);

      // Chuyển sang APPROVED để vào Dropoff Queue
      await prisma.returnOrder.update({
        where: { id: rmaStoreBId },
        data: { status: ReturnOrderStatus.APPROVED },
      });
    });

    it('2.1 Nhân viên Showroom A chỉ nhìn thấy hồ sơ thuộc chi nhánh mình (AC1)', async () => {
      const staffAContext = { userId: testOperatorStoreAId, storeId: testStoreAId };
      const result = await rmaQueueService.getDropoffQueue({ page: 1, limit: 20 }, staffAContext);

      const foundA = result.data.find((it) => it.id === rmaStoreAId);
      const foundB = result.data.find((it) => it.id === rmaStoreBId);

      expect(foundA).toBeDefined();
      expect(foundB).toBeUndefined(); // Hoàn toàn không nhìn thấy hồ sơ của Showroom B!
    });

    it('2.2 Nhân viên Showroom B chỉ nhìn thấy hồ sơ thuộc chi nhánh B', async () => {
      const staffBContext = { userId: 'staff-b-id', storeId: testStoreBId };
      const result = await rmaQueueService.getDropoffQueue({ page: 1, limit: 20 }, staffBContext);

      const foundA = result.data.find((it) => it.id === rmaStoreAId);
      const foundB = result.data.find((it) => it.id === rmaStoreBId);

      expect(foundA).toBeUndefined(); // Không thấy hồ sơ Showroom A
      expect(foundB).toBeDefined();   // Thấy đúng hồ sơ Showroom B
    });

    it('2.3 Quản trị viên tổng bộ (HQ Admin) có thể lọc linh hoạt theo dropoffLocationId', async () => {
      const hqContext = { userId: testOperatorHqId, role: 'ADMIN' };

      // Lọc Store A
      const resultA = await rmaQueueService.getDropoffQueue(
        { page: 1, limit: 20, dropoffLocationId: testStoreAId },
        hqContext,
      );
      expect(resultA.data.find((it) => it.id === rmaStoreAId)).toBeDefined();
      expect(resultA.data.find((it) => it.id === rmaStoreBId)).toBeUndefined();

      // Lọc Store B
      const resultB = await rmaQueueService.getDropoffQueue(
        { page: 1, limit: 20, dropoffLocationId: testStoreBId },
        hqContext,
      );
      expect(resultB.data.find((it) => it.id === rmaStoreAId)).toBeUndefined();
      expect(resultB.data.find((it) => it.id === rmaStoreBId)).toBeDefined();
    });
  });

  // =========================================================================
  // KỊCH BẢN 3: KIỂM SOÁT ĐỒNG THỜI LẠC QUAN OCC (EP18-T02 AC3)
  // Hai nhân viên cùng thao tác với version cũ -> Người thứ hai bị chặn HTTP 409
  // =========================================================================
  describe('Kịch bản 3: Kiểm soát đồng thời lạc quan OCC (EP18-T02 AC3)', () => {
    let rmaOccId: string;

    beforeAll(async () => {
      const rma = await submitReturnUseCase.execute(testCustomerId, {
        orderId: order3.id,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreAId,
        items: [
          {
            orderItemId: order3.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            customerNote: 'Kiểm thử xung đột OCC',
            evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing.mp4',
          },
        ],
      });
      rmaOccId = rma.id;
      createdReturnOrderIds.push(rmaOccId);
    });

    it('Nhân viên A duyệt thành công (v1 -> v2); Nhân viên B bị chặn HTTP 409 Conflict do gửi v1 cũ', async () => {
      // 1. Nhân viên A gửi expectedVersion = 1 -> Thành công!
      const staffAResult = await rmaActionMatrixService.transitionWithOcc(
        rmaOccId,
        testOperatorHqId,
        {
          expectedVersion: 1,
          targetStatus: ReturnOrderStatus.APPROVED,
          note: 'Nhân viên A duyệt yêu cầu',
        },
      );
      expect(staffAResult.returnOrder.status).toBe(ReturnOrderStatus.APPROVED);
      expect(staffAResult.returnOrder.version).toBe(2);

      // 2. Nhân viên B (mở màn hình cùng lúc, vẫn giữ expectedVersion = 1) gửi lệnh từ chối -> Bị chặn 409!
      await expect(
        rmaActionMatrixService.transitionWithOcc(
          rmaOccId,
          testOperatorStoreAId,
          {
            expectedVersion: 1, // Phiên bản cũ đã bị lỗi thời
            targetStatus: ReturnOrderStatus.REJECTED,
            reason: 'Nhân viên B bấm từ chối chậm hơn',
          },
        ),
      ).rejects.toThrow(ConflictException);

      // 3. Xác minh trạng thái hồ sơ trong cơ sở dữ liệu vẫn là APPROVED và version = 2
      const currentRma = await prisma.returnOrder.findUnique({
        where: { id: rmaOccId },
      });
      expect(currentRma?.status).toBe(ReturnOrderStatus.APPROVED);
      expect(currentRma?.version).toBe(2);
      expect(currentRma?.rejectionReason).toBeNull();
    });
  });

  // =========================================================================
  // KỊCH BẢN 4: CHẶN CHUYỂN TRẠNG THÁI KHÔNG HỢP LỆ (STATE MACHINE INTEGRITY)
  // Không cho phép nhảy cóc trạng thái trái quy trình
  // =========================================================================
  describe('Kịch bản 4: Toàn vẹn máy trạng thái State Machine', () => {
    let rmaStateId: string;

    beforeAll(async () => {
      const rma = await submitReturnUseCase.execute(testCustomerId, {
        orderId: order4.id,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreAId,
        items: [
          {
            orderItemId: order4.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            customerNote: 'Kiểm thử State Machine',
            evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing.mp4',
          },
        ],
      });
      rmaStateId = rma.id;
      createdReturnOrderIds.push(rmaStateId);
    });

    it('Chặn chuyển thẳng từ SUBMITTED sang COMPLETED trái quy định', async () => {
      await expect(
        rmaActionMatrixService.transitionWithOcc(
          rmaStateId,
          testOperatorHqId,
          {
            expectedVersion: 1,
            targetStatus: ReturnOrderStatus.COMPLETED,
            note: 'Cố tình nhảy cóc trạng thái',
          },
        ),
      ).rejects.toThrow(BadRequestException);

      // Hồ sơ vẫn giữ nguyên SUBMITTED
      const current = await prisma.returnOrder.findUnique({
        where: { id: rmaStateId },
      });
      expect(current?.status).toBe(ReturnOrderStatus.SUBMITTED);
      expect(current?.version).toBe(1);
    });
  });
});
