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
import { RefundCalculatorService } from '../application/services/refund-calculator.service';
import { RefundExecutionService } from '../application/services/refund-execution.service';
import { PaymentRefundGatewayAdapter } from '../infrastructure/adapters/payment-refund-gateway.adapter';
import { PaymentRefundGatewayService } from '../application/services/payment-refund-gateway.service';
import { OutboxWriterService } from '../../async-infrastructure/outbox/outbox-writer.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { seedDefaultReturnPolicy } from '../infrastructure/seeds/return-policy.seed';
import {
  ReturnChannel,
  ReturnOrderStatus,
  ReturnReasonCode,
  ReturnDisposition,
} from '../domain/entities/return-policy.entity';

describe('EPIC 16 INTEGRATED FLOW: Partial Refund Allocation & Gateway Settlement Engine', () => {
  jest.setTimeout(60000);

  let prisma: PrismaClient;
  let submitReturnUseCase: SubmitReturnRequestUseCase;
  let receiveStoreDropoffUseCase: ReceiveStoreDropoffUseCase;
  let reverseShippingService: ReverseShippingService;
  let returnInspectionService: ReturnInspectionService;
  let refundCalculatorService: RefundCalculatorService;
  let refundExecutionService: RefundExecutionService;
  let paymentRefundGatewayService: PaymentRefundGatewayService;
  let paymentRefundGatewayAdapter: PaymentRefundGatewayAdapter;

  const testSuffix = Math.random().toString(36).substring(2, 7);
  let testCustomerId: string;
  let testStoreId: string;
  let testWarehouseId: string;
  let testCategoryId: string;
  let testProductId: string;
  let testVariantAId: string;
  let testVariantBId: string;
  let testOrderId: string;
  let testOrderItemAId: string;
  let testOrderItemBId: string;
  let testPolicyVersionId: string;
  let testOperatorUserId: string;

  // Track created entities for teardown
  const createdRefundIds: string[] = [];
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
        RefundCalculatorService,
        RefundExecutionService,
        PaymentRefundGatewayAdapter,
        PaymentRefundGatewayService,
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
    reverseShippingService = module.get<ReverseShippingService>(
      ReverseShippingService,
    );
    returnInspectionService = module.get<ReturnInspectionService>(
      ReturnInspectionService,
    );
    refundCalculatorService = module.get<RefundCalculatorService>(
      RefundCalculatorService,
    );
    refundExecutionService = module.get<RefundExecutionService>(
      RefundExecutionService,
    );
    paymentRefundGatewayService = module.get<PaymentRefundGatewayService>(
      PaymentRefundGatewayService,
    );
    paymentRefundGatewayAdapter = module.get<PaymentRefundGatewayAdapter>(
      PaymentRefundGatewayAdapter,
    );

    // 3. Seed Showroom Store & Central Warehouse
    const store = await prisma.store.create({
      data: {
        code: `STR-E16-${testSuffix}`.slice(0, 20),
        name: `Showroom GlowUp Hoàn Tiền ${testSuffix}`,
        address: '150 Lê Lợi, Bến Thành, Quận 1, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        phone: '02838221199',
        type: 'STORE',
        isActive: true,
      },
    });
    testStoreId = store.id;

    const warehouse = await prisma.store.create({
      data: {
        code: `WH-E16-${testSuffix}`.slice(0, 20),
        name: `Tổng Kho CDC GlowUp ${testSuffix}`,
        address: 'Khu công nghiệp Sóng Thần, Bình Dương',
        city: 'Bình Dương',
        district: 'Dĩ An',
        phone: '02743889988',
        type: 'WAREHOUSE',
        isActive: true,
      },
    });
    testWarehouseId = warehouse.id;

    // 4. Seed Customer with 500 initial points
    const customer = await prisma.customer.create({
      data: {
        fullName: `Nguyễn Khách Hàng Hoàn Tiền ${testSuffix}`,
        phone: `0987${Math.floor(100000 + Math.random() * 900000)}`,
        totalPoints: 500,
      },
    });
    testCustomerId = customer.id;

    // 5. Seed Operator User
    const operator = await prisma.user.create({
      data: {
        email: `accountant.e16.${testSuffix}@glowup.vn`,
        passwordHash: 'dummy-hashed-pwd',
        fullName: `Kế Toán Viên GlowUp ${testSuffix}`,
        phone: `0912${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'ACTIVE',
      },
    });
    testOperatorUserId = operator.id;

    // 6. Seed Category, Product & Variants (SKU-A: 200,000đ, SKU-B: 800,000đ)
    const category = await prisma.category.create({
      data: {
        name: `Mỹ Phẩm Dưỡng Da E16 ${testSuffix}`,
        slug: `my-pham-e16-${testSuffix}`,
      },
    });
    testCategoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `PRD-E16-${testSuffix}`,
        name: `Serum Dưỡng Trắng & Kem Đêm GlowUp ${testSuffix}`,
        slug: `serum-kem-e16-${testSuffix}`,
        basePrice: 200000,
        categoryId: testCategoryId,
        isActive: true,
      },
    });
    testProductId = product.id;

    const variantA = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-A-200K-${testSuffix}`,
        barcode: `893000${Math.floor(100000 + Math.random() * 900000)}`,
        option1Value: '30ml',
        price: 200000,
        costPrice: 80000,
        stockQuantity: 100,
      },
    });
    testVariantAId = variantA.id;

    const variantB = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-B-800K-${testSuffix}`,
        barcode: `893000${Math.floor(100000 + Math.random() * 900000)}`,
        option1Value: '50g',
        price: 800000,
        costPrice: 350000,
        stockQuantity: 100,
      },
    });
    testVariantBId = variantB.id;

    // 7. Seed Order with Voucher & Points (TC-RMA-17 Scenario)
    // Subtotal: 200k + 800k = 1,000,000đ
    // Voucher Discount: 100,000đ
    // Points Used: 100 points
    // Paid via VNPay: 900,000đ
    const pastDeliveryDate = new Date();
    pastDeliveryDate.setDate(pastDeliveryDate.getDate() - 3);

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-E16-${testSuffix}`.slice(0, 20),
        customerId: testCustomerId,
        storeId: testStoreId,
        orderType: 'ONLINE',
        status: 'DELIVERED',
        subtotal: 1000000,
        discountAmount: 100000, // 100k Voucher
        loyaltyPointsUsed: 100,
        totalAmount: 900000,
        policyVersionId: testPolicyVersionId,
        createdAt: pastDeliveryDate,
        updatedAt: pastDeliveryDate,
        items: {
          create: [
            {
              productVariantId: testVariantAId,
              productName: 'Serum Dưỡng Trắng A',
              variantName: 'Lọ 30ml',
              quantity: 1,
              unitPrice: 200000,
              unitCost: 80000,
              totalPrice: 200000,
              discountAmount: 0,
            },
            {
              productVariantId: testVariantBId,
              productName: 'Kem Dưỡng Đêm B',
              variantName: 'Hũ 50g',
              quantity: 1,
              unitPrice: 800000,
              unitCost: 350000,
              totalPrice: 800000,
              discountAmount: 0,
            },
          ],
        },
        shipments: {
          create: {
            shipmentCode: `SHP-E16-${testSuffix}`,
            carrierCode: 'GHN',
            shipmentType: 'OUTBOUND',
            status: 'DELIVERED',
            deliveredAt: pastDeliveryDate,
          },
        },
        payments: {
          create: [
            {
              paymentMethod: 'VNPAY',
              amount: 900000,
              status: 'CAPTURED',
              transactionId: `TX-VNPAY-PAID-${testSuffix}`,
            },
          ],
        },
      },
      include: {
        items: true,
        shipments: true,
      },
    });
    testOrderId = order.id;
    testOrderItemAId = order.items.find((it) => it.productVariantId === testVariantAId)!.id;
    testOrderItemBId = order.items.find((it) => it.productVariantId === testVariantBId)!.id;
    if (order.shipments && order.shipments.length > 0) {
      createdShipmentIds.push(order.shipments[0].id);
    }
  });

  afterAll(async () => {
    // Teardown created test entities
    const safeDelete = async (fn: () => Promise<any>) => {
      try {
        await fn();
      } catch (e) {
        // ignore cascading fk errors
      }
    };

    try {
      if (createdRefundIds.length > 0) {
        await safeDelete(() =>
          prisma.refundItem.deleteMany({
            where: { refundId: { in: createdRefundIds } },
          }),
        );
        await safeDelete(() =>
          prisma.refund.deleteMany({
            where: { id: { in: createdRefundIds } },
          }),
        );
      }

      await safeDelete(() =>
        prisma.loyaltyPointsTransaction.deleteMany({
          where: { customerId: testCustomerId },
        }),
      );

      if (createdInspectionIds.length > 0) {
        await safeDelete(() =>
          prisma.returnInspectionItem.deleteMany({
            where: { inspectionId: { in: createdInspectionIds } },
          }),
        );
        await safeDelete(() =>
          prisma.returnInspection.deleteMany({
            where: { id: { in: createdInspectionIds } },
          }),
        );
      }

      if (createdReceiptIds.length > 0) {
        await safeDelete(() =>
          prisma.returnReceipt.deleteMany({
            where: { id: { in: createdReceiptIds } },
          }),
        );
      }

      if (createdShipmentIds.length > 0) {
        await safeDelete(() =>
          prisma.shipment.deleteMany({
            where: { id: { in: createdShipmentIds } },
          }),
        );
      }

      if (createdReturnOrderIds.length > 0) {
        await safeDelete(() =>
          prisma.returnStatusHistory.deleteMany({
            where: { returnOrderId: { in: createdReturnOrderIds } },
          }),
        );
        await safeDelete(() =>
          prisma.returnOrderItem.deleteMany({
            where: { returnOrderId: { in: createdReturnOrderIds } },
          }),
        );
        await safeDelete(() =>
          prisma.returnOrder.deleteMany({
            where: { id: { in: createdReturnOrderIds } },
          }),
        );
      }

      await safeDelete(() =>
        prisma.payment.deleteMany({ where: { orderId: testOrderId } }),
      );
      await safeDelete(() =>
        prisma.orderItem.deleteMany({ where: { orderId: testOrderId } }),
      );
      await safeDelete(() =>
        prisma.order.deleteMany({ where: { id: testOrderId } }),
      );
      await safeDelete(() =>
        prisma.productVariant.deleteMany({
          where: { productId: testProductId },
        }),
      );
      await safeDelete(() =>
        prisma.product.deleteMany({ where: { id: testProductId } }),
      );
      await safeDelete(() =>
        prisma.category.deleteMany({ where: { id: testCategoryId } }),
      );
      await safeDelete(() =>
        prisma.store.deleteMany({
          where: { id: { in: [testStoreId, testWarehouseId] } },
        }),
      );
      await safeDelete(() =>
        prisma.customer.deleteMany({ where: { id: testCustomerId } }),
      );
      await safeDelete(() =>
        prisma.user.deleteMany({ where: { id: testOperatorUserId } }),
      );
    } catch (err) {
      console.warn('Epic 16 Teardown warning:', err);
    } finally {
      await prisma.$disconnect();
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // SCENARIO 1: Standard RMA Refund with Pro-rata Voucher (TC-RMA-17 & DEC-04)
  // =========================================================================
  describe('1. Standard RMA Store Dropoff -> QC PASSED -> Pro-rata Refund Execution (TC-RMA-17)', () => {
    let returnOrderId: string;
    let returnItemId: string;
    let refundId: string;

    it('1.1 should create ReturnOrder via Store Dropoff for Item A (200k)', async () => {
      const returnOrder = await submitReturnUseCase.execute(testCustomerId, {
        orderId: testOrderId,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreId,
        items: [
          {
            orderItemId: testOrderItemAId,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            customerNote: 'Sản phẩm lỗi vòi xịt',
            evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing.mp4',
          },
        ],
      });

      expect(returnOrder).toBeDefined();
      expect(returnOrder.status).toBe(ReturnOrderStatus.SUBMITTED);
      returnOrderId = returnOrder.id;
      returnItemId = returnOrder.items[0].id;
      createdReturnOrderIds.push(returnOrderId);
    });

    it('1.2 should receive goods at store and complete QC inspection (PASSED)', async () => {
      // Receive at store
      const receiptRes = await receiveStoreDropoffUseCase.execute(
        returnOrderId,
        testOperatorUserId,
        {
          packageConditionNote: 'Khách bàn giao tại quầy, hộp nguyên vẹn',
        },
      );
      createdReceiptIds.push(receiptRes.receipt.id);

      // QC Inspection -> PASSED -> ReturnOrderStatus becomes RESOLUTION_PENDING
      const inspectRes = await returnInspectionService.completeInspection(
        returnOrderId,
        testOperatorUserId,
        {
          inspectorNotes: 'Hàng lỗi vòi xịt còn nguyên tem, nhập kho chờ xử lý',
          items: [
            {
              returnItemId,
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
      expect(inspectRes.overallResult).toBe('PASSED');
      expect(inspectRes.newStatus).toBe(ReturnOrderStatus.RESOLUTION_PENDING);
    });

    it('1.3 should calculate pro-rata refund breakdown accurately (TC-RMA-17, DEC-04)', async () => {
      const preview = await refundExecutionService.previewRefundForReturn(
        returnOrderId,
      );

      // Total Order: 1M subtotal, 100k voucher discount, 100 points
      // Item A: 200k subtotal (20% share)
      // Allocated Voucher Discount: 100k * 20% = 20k
      // Gross Cash: 200k - 20k = 180,000đ (TC-RMA-17)
      // Allocated Points: 100 * 20% = 20 points
      // Return Shipping Fee: 0đ (Store Dropoff & Defective)
      // Net Cash Refund: 180,000đ
      expect(preview.grossRefundAmount).toBe(180000);
      expect(preview.deductedShippingFee).toBe(0);
      expect(preview.netRefundAmount).toBe(180000);
      expect(preview.totalPointsToRestore).toBe(20);
      expect(preview.items).toHaveLength(1);
      expect(preview.items[0].voucherDiscountAllocated).toBe(20000);
      expect(preview.items[0].lineRefundCash).toBe(180000);
    });

    it('1.4 should create Refund and RefundItem with PENDING status (EP16-T02)', async () => {
      const createRes = await refundExecutionService.createRefundForReturn(
        returnOrderId,
        testOperatorUserId,
        {
          notes: 'Hoàn tiền trả hàng vòi xịt lỗi',
        },
      );

      expect(createRes.refund).toBeDefined();
      expect(createRes.refund.status).toBe('PENDING');
      expect(Number(createRes.refund.amount)).toBe(180000);
      refundId = createRes.refund.id;
      createdRefundIds.push(refundId);

      // Verify refund_items in DB
      const dbItems = await prisma.refundItem.findMany({
        where: { refundId },
      });
      expect(dbItems).toHaveLength(1);
      expect(dbItems[0].orderItemId).toBe(testOrderItemAId);
      expect(dbItems[0].quantity).toBe(1);
      expect(Number(dbItems[0].amount)).toBe(180000);
      expect(dbItems[0].pointsRestored).toBe(20);
    });

    it('1.5 should approve refund (PENDING -> APPROVED) by Finance (EP16-T03)', async () => {
      const approved = await paymentRefundGatewayService.approveRefund(
        refundId,
        testOperatorUserId,
        'Kế toán trưởng phê duyệt chuyển khoản',
      );

      expect(approved.status).toBe('APPROVED');
      expect(approved.processedBy).toBe(testOperatorUserId);
    });

    it('1.6 should execute settlement via Gateway, restore customer points, and complete RMA (EP16-T03)', async () => {
      // Mock gateway adapter to return successful refund
      jest
        .spyOn(paymentRefundGatewayAdapter, 'executeRefund')
        .mockResolvedValueOnce({
          success: true,
          gatewayTransactionId: `VNPREF-${Date.now()}`,
          message: 'Giao dịch hoàn tiền qua VNPay thành công',
          payload: { vnp_ResponseCode: '00' },
        });

      const initialCustomer = await prisma.customer.findUnique({
        where: { id: testCustomerId },
      });
      const initialPoints = initialCustomer?.totalPoints || 0;

      const result = await paymentRefundGatewayService.executeRefund(
        refundId,
        testOperatorUserId,
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('COMPLETED');
      expect(result.refund.status).toBe('COMPLETED');

      // Verify ReturnOrder updated to COMPLETED
      const updatedRma = await prisma.returnOrder.findUnique({
        where: { id: returnOrderId },
      });
      expect(updatedRma?.status).toBe(ReturnOrderStatus.COMPLETED);

      // Verify Points restored in Customer table (+20 points)
      const updatedCustomer = await prisma.customer.findUnique({
        where: { id: testCustomerId },
      });
      expect(updatedCustomer?.totalPoints).toBe(initialPoints + 20);

      // Verify LoyaltyPointsTransaction logged
      const pointTx = await prisma.loyaltyPointsTransaction.findFirst({
        where: {
          customerId: testCustomerId,
          type: 'REFUND_RESTORE',
          orderId: testOrderId,
        },
      });
      expect(pointTx).toBeDefined();
      expect(pointTx?.points).toBe(20);

      // Verify Outbox Event created (REFUND_COMPLETED)
      const outbox = await prisma.outboxEvent.findFirst({
        where: {
          aggregateType: 'REFUND',
          aggregateId: refundId,
          eventType: 'REFUND_COMPLETED',
        },
      });
      expect(outbox).toBeTruthy();
      const payload = outbox?.payload as any;
      expect(payload.amount).toBe(180000);
      expect(payload.pointsRestored).toBe(20);
    });

    it('1.7 Anti-Duplication: reject creating 2nd refund for already refunded item (AC1)', async () => {
      await expect(
        refundExecutionService.createRefundForReturn(
          returnOrderId,
          testOperatorUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.8 Idempotency: calling executeRefund second time returns existing record (TC-RMA-12)', async () => {
      const adapterSpy = jest.spyOn(
        paymentRefundGatewayAdapter,
        'executeRefund',
      );

      const result = await paymentRefundGatewayService.executeRefund(
        refundId,
        testOperatorUserId,
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('COMPLETED');
      // Ensure Gateway Adapter was NOT called again
      expect(adapterSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SCENARIO 2: Carrier Pickup with CHANGE_OF_MIND Return Shipping Fee (DEC-04)
  // =========================================================================
  describe('2. Carrier Pickup with CHANGE_OF_MIND Shipping Deduction (DEC-04)', () => {
    let secondOrderId: string;
    let secondOrderItemId: string;
    let returnOrderId: string;

    beforeAll(async () => {
      // Seed second order for customer
      const pastDeliveryDate = new Date();
      pastDeliveryDate.setDate(pastDeliveryDate.getDate() - 2);

      const order2 = await prisma.order.create({
        data: {
          orderNumber: `ORD-DEC04-${testSuffix}`.slice(0, 20),
          customerId: testCustomerId,
          storeId: testStoreId,
          orderType: 'ONLINE',
          status: 'DELIVERED',
          subtotal: 800000,
          discountAmount: 0,
          loyaltyPointsUsed: 0,
          totalAmount: 800000,
          policyVersionId: testPolicyVersionId,
          createdAt: pastDeliveryDate,
          updatedAt: pastDeliveryDate,
          items: {
            create: [
              {
                productVariantId: testVariantBId,
                productName: 'Kem Dưỡng Đêm B',
                variantName: 'Hũ 50g',
                quantity: 1,
                unitPrice: 800000,
                unitCost: 350000,
                totalPrice: 800000,
                discountAmount: 0,
              },
            ],
          },
          shipments: {
            create: {
              shipmentCode: `SHP-DEC04-${testSuffix}`,
              carrierCode: 'GHN',
              shipmentType: 'OUTBOUND',
              status: 'DELIVERED',
              deliveredAt: pastDeliveryDate,
            },
          },
          payments: {
            create: [
              {
                paymentMethod: 'VNPAY',
                amount: 800000,
                status: 'CAPTURED',
                transactionId: `TX-PAID-2-${testSuffix}`,
              },
            ],
          },
        },
        include: {
          items: true,
          shipments: true,
        },
      });
      secondOrderId = order2.id;
      secondOrderItemId = order2.items[0].id;
      if (order2.shipments && order2.shipments.length > 0) {
        createdShipmentIds.push(order2.shipments[0].id);
      }
    });

    afterAll(async () => {
      if (secondOrderId) {
        if (returnOrderId) {
          await prisma.returnStatusHistory.deleteMany({
            where: { returnOrderId },
          });
          await prisma.returnOrderItem.deleteMany({
            where: { returnOrderId },
          });
          await prisma.returnOrder.deleteMany({
            where: { id: returnOrderId },
          });
        }
        await prisma.payment.deleteMany({ where: { orderId: secondOrderId } });
        await prisma.orderItem.deleteMany({
          where: { orderId: secondOrderId },
        });
        await prisma.order.deleteMany({ where: { id: secondOrderId } });
      }
    });

    it('2.1 should deduct 25.000đ return shipping fee for CARRIER_PICKUP with CHANGE_OF_MIND (DEC-04)', async () => {
      // Customer submits Return via CARRIER_PICKUP due to CHANGE_OF_MIND
      const rma = await submitReturnUseCase.execute(testCustomerId, {
        orderId: secondOrderId,
        returnChannel: ReturnChannel.CARRIER_PICKUP,
        pickupAddress: {
          fullAddress: '123 Nguyễn Thị Minh Khai, Q.3, TP.HCM',
          province: 'TP.HCM',
          district: 'Quận 3',
        },
        items: [
          {
            orderItemId: secondOrderItemId,
            quantity: 1,
            reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
            customerNote: 'Đổi ý không muốn dùng nữa',
            evidenceImages: ['https://s3.glowup.vn/evidence/box2.jpg'],
          },
        ],
      });
      returnOrderId = rma.id;
      createdReturnOrderIds.push(returnOrderId);

      const preview = await refundExecutionService.previewRefundForReturn(
        returnOrderId,
      );

      // Item Gross Cash: 800,000đ
      // Return Shipping Fee: 25,000đ deducted
      // Net Cash Refund: 800,000 - 25,000 = 775,000đ (DEC-04)
      expect(preview.grossRefundAmount).toBe(800000);
      expect(preview.deductedShippingFee).toBe(25000);
      expect(preview.netRefundAmount).toBe(775000);
      expect(preview.shippingFeeBearer).toBe('CUSTOMER');
    });
  });

  // =========================================================================
  // SCENARIO 3: Gateway Error / Network Timeout Handling (TC-RMA-11, AC2)
  // =========================================================================
  describe('3. Gateway Error / Network Timeout Resilience (TC-RMA-11, AC2)', () => {
    let thirdOrderId: string;
    let thirdOrderItemId: string;
    let returnOrderId: string;
    let returnItemId: string;
    let refundId: string;

    beforeAll(async () => {
      const pastDeliveryDate = new Date();
      pastDeliveryDate.setDate(pastDeliveryDate.getDate() - 1);

      const order3 = await prisma.order.create({
        data: {
          orderNumber: `ORD-ERR-${testSuffix}`.slice(0, 20),
          customerId: testCustomerId,
          storeId: testStoreId,
          orderType: 'ONLINE',
          status: 'DELIVERED',
          subtotal: 200000,
          discountAmount: 0,
          totalAmount: 200000,
          policyVersionId: testPolicyVersionId,
          createdAt: pastDeliveryDate,
          updatedAt: pastDeliveryDate,
          items: {
            create: [
              {
                productVariantId: testVariantAId,
                productName: 'Serum Dưỡng Trắng A',
                variantName: 'Lọ 30ml',
                quantity: 1,
                unitPrice: 200000,
                unitCost: 80000,
                totalPrice: 200000,
              },
            ],
          },
          shipments: {
            create: {
              shipmentCode: `SHP-ERR-${testSuffix}`,
              carrierCode: 'GHN',
              shipmentType: 'OUTBOUND',
              status: 'DELIVERED',
              deliveredAt: pastDeliveryDate,
            },
          },
          payments: {
            create: [
              {
                paymentMethod: 'VNPAY',
                amount: 200000,
                status: 'CAPTURED',
              },
            ],
          },
        },
        include: {
          items: true,
          shipments: true,
        },
      });
      thirdOrderId = order3.id;
      thirdOrderItemId = order3.items[0].id;
      if (order3.shipments && order3.shipments.length > 0) {
        createdShipmentIds.push(order3.shipments[0].id);
      }
    });

    afterAll(async () => {
      if (thirdOrderId) {
        if (refundId) {
          await prisma.refundItem.deleteMany({ where: { refundId } });
          await prisma.refund.deleteMany({ where: { id: refundId } });
        }
        if (returnOrderId) {
          await prisma.returnInspectionItem.deleteMany({
            where: { inspection: { returnOrderId } },
          });
          await prisma.returnInspection.deleteMany({
            where: { returnOrderId },
          });
          await prisma.returnReceipt.deleteMany({
            where: { returnOrderId },
          });
          await prisma.returnStatusHistory.deleteMany({
            where: { returnOrderId },
          });
          await prisma.returnOrderItem.deleteMany({
            where: { returnOrderId },
          });
          await prisma.returnOrder.deleteMany({
            where: { id: returnOrderId },
          });
        }
        await prisma.payment.deleteMany({ where: { orderId: thirdOrderId } });
        await prisma.orderItem.deleteMany({ where: { orderId: thirdOrderId } });
        await prisma.order.deleteMany({ where: { id: thirdOrderId } });
      }
    });

    it('3.1 should hold status at PROCESSING and not crash on Gateway 504 / timeout (TC-RMA-11)', async () => {
      const rma = await submitReturnUseCase.execute(testCustomerId, {
        orderId: thirdOrderId,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreId,
        items: [
          {
            orderItemId: thirdOrderItemId,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            customerNote: 'Hàng bị hư hỏng',
            evidenceImages: ['https://s3.glowup.vn/evidence/box3.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/box3.mp4',
          },
        ],
      });
      returnOrderId = rma.id;
      returnItemId = rma.items[0].id;
      createdReturnOrderIds.push(returnOrderId);

      // Receive & Pass QC
      const receipt = await receiveStoreDropoffUseCase.execute(
        returnOrderId,
        testOperatorUserId,
        { packageConditionNote: 'Hàng trả quầy có lỗi vòi xịt' },
      );
      createdReceiptIds.push(receipt.receipt.id);

      const inspect = await returnInspectionService.completeInspection(
        returnOrderId,
        testOperatorUserId,
        {
          inspectorNotes: 'Đạt kiểm định trả hàng lỗi',
          items: [
            {
              returnItemId,
              passedQuantity: 1,
              failedQuantity: 0,
              isSealIntact: true,
              remainingPercentage: 100,
              disposition: ReturnDisposition.RESTOCK,
              reasonDetail: 'Xác nhận lỗi kỹ thuật',
            },
          ],
        },
      );
      createdInspectionIds.push(inspect.inspection.id);

      // Create & Approve Refund
      const createRes = await refundExecutionService.createRefundForReturn(
        returnOrderId,
        testOperatorUserId,
      );
      refundId = createRes.refund.id;
      createdRefundIds.push(refundId);

      await paymentRefundGatewayService.approveRefund(
        refundId,
        testOperatorUserId,
      );

      // Simulate Gateway network failure / 504 Gateway Timeout
      jest
        .spyOn(paymentRefundGatewayAdapter, 'executeRefund')
        .mockRejectedValueOnce(new Error('504 Gateway Timeout from VNPay'));

      const result = await paymentRefundGatewayService.executeRefund(
        refundId,
        testOperatorUserId,
      );

      // AC2: Does not throw uncaught 500 or crash; status stays at PROCESSING
      expect(result.success).toBe(false);
      expect(result.status).toBe('PROCESSING');

      const refundInDb = await prisma.refund.findUnique({
        where: { id: refundId },
      });
      expect(refundInDb?.status).toBe('PROCESSING');

      // ReturnOrder status should remain RESOLUTION_PENDING (not COMPLETED)
      const rmaInDb = await prisma.returnOrder.findUnique({
        where: { id: returnOrderId },
      });
      expect(rmaInDb?.status).toBe(ReturnOrderStatus.RESOLUTION_PENDING);
    });
  });
});
