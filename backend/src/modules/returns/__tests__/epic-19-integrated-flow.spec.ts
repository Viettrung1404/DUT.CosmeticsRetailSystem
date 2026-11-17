import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../async-infrastructure/outbox/outbox-writer.service';
import { RmaWorkflowService } from '../application/services/rma-workflow.service';
import { RefundCalculatorService } from '../application/services/refund-calculator.service';
import { SubmitReturnRequestUseCase } from '../application/use-cases/submit-return-request.use-case';
import { RmaEligibilityService } from '../application/services/rma-eligibility.service';
import {
  ReturnOrderStatus,
  ReturnChannel,
  ReturnReasonCode,
} from '../domain/entities/return-policy.entity';
import { seedDefaultReturnPolicy } from '../infrastructure/seeds/return-policy.seed';

describe('EPIC 19 INTEGRATED FLOW: Long-Running RMA Cloudflare Workflows & Automation (TC-RMA-18 & 19)', () => {
  jest.setTimeout(90000);

  let prisma: PrismaClient;
  let rmaWorkflowService: RmaWorkflowService;
  let submitReturnUseCase: SubmitReturnRequestUseCase;

  const testSuffix = Math.random().toString(36).substring(2, 7);
  let testStoreId: string;
  let testCustomerId: string;
  let testOperatorId: string;
  let testPolicyVersionId: string;
  let testProductId: string;
  let testVariantId: string;

  const createdOrderIds: string[] = [];
  const createdReturnOrderIds: string[] = [];
  const createdShipmentIds: string[] = [];
  const createdClaimIds: string[] = [];
  const createdRefundIds: string[] = [];

  beforeAll(async () => {
    jest.setTimeout(30000);
    prisma = new PrismaClient();
    await prisma.$connect();

    // 1. Seed Return Policy
    const policy = await seedDefaultReturnPolicy(prisma);
    testPolicyVersionId = policy.id;

    // 2. Setup Testing Module
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        RmaWorkflowService,
        RefundCalculatorService,
        RmaEligibilityService,
        SubmitReturnRequestUseCase,
        OutboxWriterService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    rmaWorkflowService = module.get<RmaWorkflowService>(RmaWorkflowService);
    submitReturnUseCase = module.get<SubmitReturnRequestUseCase>(SubmitReturnRequestUseCase);

    // 3. Seed Store
    const store = await prisma.store.create({
      data: {
        code: `STR-E19-${testSuffix}`.slice(0, 20),
        name: `Showroom E19 ${testSuffix}`,
        address: '50 Hai Bà Trưng, Quận 1, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        phone: '02839999999',
        type: 'STORE',
        isActive: true,
      },
    });
    testStoreId = store.id;

    // 4. Seed User Operator
    const operator = await prisma.user.create({
      data: {
        email: `ops.admin.${testSuffix}@glowup.vn`,
        passwordHash: 'dummy-pwd',
        fullName: `Quản Lý Vận Hành E19 ${testSuffix}`,
        phone: `0903${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'ACTIVE',
      },
    });
    testOperatorId = operator.id;

    // 5. Seed Customer
    const customer = await prisma.customer.create({
      data: {
        fullName: `Khách Hàng E19 ${testSuffix}`,
        phone: `0911${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });
    testCustomerId = customer.id;

    // 6. Seed Product & Variant
    const category = await prisma.category.create({
      data: {
        name: `Chăm Sóc Da E19 ${testSuffix}`,
        slug: `cham-soc-da-e19-${testSuffix}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        sku: `PRD-E19-${testSuffix}`,
        name: `Kem Dưỡng Ẩm Cao Cấp ${testSuffix}`,
        slug: `kem-duong-e19-${testSuffix}`,
        basePrice: 500000,
        categoryId: category.id,
        isActive: true,
      },
    });
    testProductId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-E19-500K-${testSuffix}`,
        barcode: `893901${Math.floor(100000 + Math.random() * 900000)}`,
        price: 500000,
        costPrice: 200000,
        stockQuantity: 50,
      },
    });
    testVariantId = variant.id;
  });

  afterAll(async () => {
    const safeDelete = async (fn: () => Promise<any>) => {
      try {
        await fn();
      } catch (e) {}
    };

    if (createdRefundIds.length > 0) {
      await safeDelete(() =>
        prisma.refundItem.deleteMany({ where: { refundId: { in: createdRefundIds } } }),
      );
      await safeDelete(() =>
        prisma.refund.deleteMany({ where: { id: { in: createdRefundIds } } }),
      );
    }

    if (createdClaimIds.length > 0) {
      await safeDelete(() =>
        prisma.carrierClaim.deleteMany({ where: { id: { in: createdClaimIds } } }),
      );
    }

    if (createdShipmentIds.length > 0) {
      await safeDelete(() =>
        prisma.shipment.deleteMany({ where: { id: { in: createdShipmentIds } } }),
      );
    }

    if (createdReturnOrderIds.length > 0) {
      await safeDelete(() =>
        prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: createdReturnOrderIds } } }),
      );
      await safeDelete(() =>
        prisma.returnStatusHistory.deleteMany({ where: { returnOrderId: { in: createdReturnOrderIds } } }),
      );
      await safeDelete(() =>
        prisma.returnOrderItem.deleteMany({ where: { returnOrderId: { in: createdReturnOrderIds } } }),
      );
      await safeDelete(() =>
        prisma.returnReceipt.deleteMany({ where: { returnOrderId: { in: createdReturnOrderIds } } }),
      );
      await safeDelete(() =>
        prisma.returnOrder.deleteMany({ where: { id: { in: createdReturnOrderIds } } }),
      );
    }

    if (createdOrderIds.length > 0) {
      await safeDelete(() =>
        prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } }),
      );
      await safeDelete(() =>
        prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } }),
      );
      await safeDelete(() =>
        prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } }),
      );
    }

    await safeDelete(() =>
      prisma.productVariant.deleteMany({ where: { productId: testProductId } }),
    );
    await safeDelete(() =>
      prisma.product.deleteMany({ where: { id: testProductId } }),
    );
    await safeDelete(() =>
      prisma.store.deleteMany({ where: { id: testStoreId } }),
    );
    await safeDelete(() =>
      prisma.customer.deleteMany({ where: { id: testCustomerId } }),
    );
    await safeDelete(() =>
      prisma.user.deleteMany({ where: { id: testOperatorId } }),
    );

    await prisma.$disconnect();
  });

  const createDeliveredOrder = async (seq: number): Promise<any> => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-E19-${seq}-${testSuffix}`.slice(0, 20),
        customerId: testCustomerId,
        storeId: testStoreId,
        orderType: 'ONLINE',
        status: 'DELIVERED',
        subtotal: 500000,
        discountAmount: 0,
        totalAmount: 500000,
        policyVersionId: testPolicyVersionId,
        createdAt: pastDate,
        updatedAt: pastDate,
        items: {
          create: [
            {
              productVariantId: testVariantId,
              productName: 'Kem Dưỡng Ẩm Cao Cấp',
              variantName: '50ml',
              quantity: 1,
              unitPrice: 500000,
              unitCost: 200000,
              totalPrice: 500000,
              discountAmount: 0,
            },
          ],
        },
        shipments: {
          create: {
            shipmentCode: `SHP-OUT-E19-${seq}-${testSuffix}`,
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
              amount: 500000,
              status: 'CAPTURED',
              transactionId: `TX-E19-${seq}-${testSuffix}`,
            },
          ],
        },
      },
      include: { items: true },
    });
    createdOrderIds.push(order.id);
    return order;
  };

  describe('Kịch bản 1: Timer Timeout 7 Ngày - Hủy yêu cầu quá hạn (TC-RMA-18)', () => {
    it('Tự động hủy hồ sơ APPROVED quá 7 ngày khách không gửi hàng tại quầy', async () => {
      const order = await createDeliveredOrder(1);

      // Tạo yêu cầu RMA
      const returnOrder = await submitReturnUseCase.execute(testCustomerId, {
        orderId: order.id,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreId,
        items: [
          {
            orderItemId: order.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            customerNote: 'Lỗi đóng mở nắp',
            evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing.mp4',
          },
        ],
      });
      createdReturnOrderIds.push(returnOrder.id);

      // Giả lập đã duyệt từ 10 ngày trước
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      await prisma.returnOrder.update({
        where: { id: returnOrder.id },
        data: {
          status: ReturnOrderStatus.APPROVED,
          updatedAt: tenDaysAgo,
        },
      });

      // Kích hoạt Workflow quét đơn quá hạn (mặc định 7 ngày)
      const res = await rmaWorkflowService.expireStaleApprovedRmas(7);

      expect(res.expiredCount).toBeGreaterThanOrEqual(1);
      const expired = res.expiredReturnOrders.find((it) => it.id === returnOrder.id);
      expect(expired).toBeDefined();

      // Kiểm tra trạng thái trong database
      const updatedRma = await prisma.returnOrder.findUnique({
        where: { id: returnOrder.id },
      });
      expect(updatedRma?.status).toBe(ReturnOrderStatus.CANCELLED);
      expect(updatedRma?.adminNote).toContain('[WORKFLOW_TIMEOUT]');

      // Kiểm tra sự kiện Outbox
      const outboxEvt = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: returnOrder.id,
          eventType: 'RMA_EXPIRED_CANCELLED',
        },
      });
      expect(outboxEvt).toBeDefined();
    });
  });

  describe('Kịch bản 2: Cảnh báo SLA KCS quá 48h lưu kho', () => {
    it('Phát hiện hồ sơ đã tiếp nhận tại kho quá 48h chưa kiểm định KCS', async () => {
      const order = await createDeliveredOrder(2);

      const returnOrder = await submitReturnUseCase.execute(testCustomerId, {
        orderId: order.id,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreId,
        items: [
          {
            orderItemId: order.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing.mp4',
          },
        ],
      });
      createdReturnOrderIds.push(returnOrder.id);

      // Chuyển sang RECEIVED và lập Receipt từ 72 giờ trước
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      await prisma.returnOrder.update({
        where: { id: returnOrder.id },
        data: {
          status: ReturnOrderStatus.RECEIVED,
          updatedAt: threeDaysAgo,
        },
      });

      await prisma.returnReceipt.create({
        data: {
          receiptCode: `RCP-E19-${testSuffix}`,
          returnOrderId: returnOrder.id,
          locationId: testStoreId,
          receivedBy: testOperatorId,
          packageConditionNote: 'Đã nhận hàng 3 ngày trước',
          createdAt: threeDaysAgo,
        },
      });

      // Kích hoạt Workflow kiểm tra SLA 48h
      const res = await rmaWorkflowService.checkQcSlaBreaches(48);

      expect(res.breachCount).toBeGreaterThanOrEqual(1);
      const breached = res.breachedReturnOrders.find((it) => it.id === returnOrder.id);
      expect(breached).toBeDefined();
      expect(breached?.hoursOverdue).toBeGreaterThanOrEqual(48);

      // Kiểm tra sự kiện Outbox
      const outboxEvt = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: returnOrder.id,
          eventType: 'RMA_QC_SLA_BREACHED',
        },
      });
      expect(outboxEvt).toBeDefined();
    });
  });

  describe('Kịch bản 3: Bưu kiện thu gom bị thất lạc (TC-RMA-19)', () => {
    it('Tự động hoàn tiền cho khách, tạo CarrierClaim bồi thường 3PL và đóng hồ sơ COMPLETED', async () => {
      const order = await createDeliveredOrder(3);

      const returnOrder = await submitReturnUseCase.execute(testCustomerId, {
        orderId: order.id,
        returnChannel: ReturnChannel.CARRIER_PICKUP,
        pickupAddress: {
          province: 'Hồ Chí Minh',
          district: 'Quận 1',
          ward: 'Bến Nghé',
          street: '100 Nguyễn Huệ',
          contactName: 'Khách Hàng E19',
          contactPhone: '0911000000',
        },
        items: [
          {
            orderItemId: order.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing.mp4',
          },
        ],
      });
      createdReturnOrderIds.push(returnOrder.id);

      // Tạo vận đơn thu gom ngược của GHN
      const shipment = await prisma.shipment.create({
        data: {
          orderId: order.id,
          returnOrderId: returnOrder.id,
          shipmentCode: `SHP-REV-LOST-${testSuffix}`,
          carrierCode: 'GHN',
          shipmentType: 'RETURN_PICKUP',
          trackingCode: `TRK-LOST-${testSuffix}`,
          status: 'IN_TRANSIT',
        },
      });
      createdShipmentIds.push(shipment.id);

      // Kích hoạt xử lý thất lạc hàng bưu tá GHN (TC-RMA-19)
      const res = await rmaWorkflowService.handleLostReturnPackage(shipment.id, {
        reason: 'Hãng GHN xác nhận làm thất lạc kiện hàng trong quá trình vận chuyển liên tỉnh',
        operatorUserId: testOperatorId,
      });

      expect(res.returnOrderId).toBe(returnOrder.id);
      expect(res.status).toBe(ReturnOrderStatus.COMPLETED);
      expect(res.refundAmount).toBe(500000);
      createdClaimIds.push(res.claimId);
      createdRefundIds.push(res.refundId);

      // 1. Vận đơn chuyển LOST
      const updatedShipment = await prisma.shipment.findUnique({
        where: { id: shipment.id },
      });
      expect(updatedShipment?.status).toBe('LOST');

      // 2. Bản ghi bồi thường 3PL được tạo
      const claim = await prisma.carrierClaim.findUnique({
        where: { id: res.claimId },
      });
      expect(claim).toBeDefined();
      expect(claim?.carrierCode).toBe('GHN');
      expect(claim?.claimType).toBe('LOST_IN_TRANSIT');
      expect(Number(claim?.claimAmount)).toBe(500000);

      // 3. Lệnh hoàn tiền Refund được tạo thành công
      const refund = await prisma.refund.findUnique({
        where: { id: res.refundId },
        include: { items: true },
      });
      expect(refund).toBeDefined();
      expect(refund?.status).toBe('COMPLETED');
      expect(Number(refund?.amount)).toBe(500000);
      expect(refund?.items.length).toBe(1);

      // 4. ReturnOrder chuyển COMPLETED
      const finalRma = await prisma.returnOrder.findUnique({
        where: { id: returnOrder.id },
      });
      expect(finalRma?.status).toBe(ReturnOrderStatus.COMPLETED);

      // 5. Sự kiện Outbox CARRIER_CLAIM_INITIATED
      const outboxEvt = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: res.claimId,
          eventType: 'CARRIER_CLAIM_INITIATED',
        },
      });
      expect(outboxEvt).toBeDefined();
    });
  });
});
