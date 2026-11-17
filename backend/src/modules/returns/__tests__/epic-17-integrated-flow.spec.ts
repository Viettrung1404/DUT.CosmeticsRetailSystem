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
import { ExchangeSettlementService } from '../application/services/exchange-settlement.service';
import { AtpCalculatorService } from '../../inventory/application/services/atp-calculator.service';
import { OutboxWriterService } from '../../async-infrastructure/outbox/outbox-writer.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { seedDefaultReturnPolicy } from '../infrastructure/seeds/return-policy.seed';
import {
  ReturnChannel,
  ReturnOrderStatus,
  ReturnReasonCode,
  ReturnDisposition,
} from '../domain/entities/return-policy.entity';

describe('EPIC 17 INTEGRATED FLOW: Exchange Order Settlement & Replacement Fulfillment', () => {
  jest.setTimeout(90000);

  let prisma: PrismaClient;
  let submitReturnUseCase: SubmitReturnRequestUseCase;
  let receiveStoreDropoffUseCase: ReceiveStoreDropoffUseCase;
  let returnInspectionService: ReturnInspectionService;
  let refundCalculatorService: RefundCalculatorService;
  let exchangeSettlementService: ExchangeSettlementService;

  const testSuffix = Math.random().toString(36).substring(2, 7);
  let testCustomerId: string;
  let testStoreId: string;
  let testCategoryId: string;
  let testProductId: string;
  let testVariantReturnId: string;
  let testVariantEqualId: string;
  let testVariantHigherId: string;
  let testVariantLowerId: string;
  let testVariantOosId: string;
  let testPolicyVersionId: string;
  let testOperatorUserId: string;

  // Track entities for teardown
  const createdOrderIds: string[] = [];
  const createdReturnOrderIds: string[] = [];
  const createdReceiptIds: string[] = [];
  const createdInspectionIds: string[] = [];
  const createdSettlementIds: string[] = [];
  const createdRefundIds: string[] = [];
  const createdReplacementOrderIds: string[] = [];

  // 4 Return Orders for 4 scenarios
  let returnOrderEqual: any;
  let returnOrderHigher: any;
  let returnOrderLower: any;
  let returnOrderOos: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // 1. Policy
    const policy = await seedDefaultReturnPolicy(prisma);
    testPolicyVersionId = policy.id;

    // 2. Setup TestingModule
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
    refundCalculatorService = module.get<RefundCalculatorService>(RefundCalculatorService);
    exchangeSettlementService = module.get<ExchangeSettlementService>(ExchangeSettlementService);

    // 3. Store
    const store = await prisma.store.create({
      data: {
        code: `STR-E17-${testSuffix}`.slice(0, 20),
        name: `Showroom GlowUp Đổi Hàng ${testSuffix}`,
        address: '100 Nguyễn Huệ, Bến Nghé, Quận 1, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        phone: '02838991122',
        type: 'STORE',
        isActive: true,
      },
    });
    testStoreId = store.id;

    // 4. Customer
    const customer = await prisma.customer.create({
      data: {
        fullName: `Khách Hàng Đổi Hàng E17 ${testSuffix}`,
        phone: `0977${Math.floor(100000 + Math.random() * 900000)}`,
        totalPoints: 100,
      },
    });
    testCustomerId = customer.id;

    // 5. Operator User
    const operator = await prisma.user.create({
      data: {
        email: `rma.officer.e17.${testSuffix}@glowup.vn`,
        passwordHash: 'dummy-hashed-pwd',
        fullName: `Chuyên Viên RMA E17 ${testSuffix}`,
        phone: `0933${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'ACTIVE',
      },
    });
    testOperatorUserId = operator.id;

    // 6. Category & Product
    const category = await prisma.category.create({
      data: {
        name: `Mỹ Phẩm Cao Cấp E17 ${testSuffix}`,
        slug: `my-pham-e17-${testSuffix}`,
      },
    });
    testCategoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `PRD-E17-${testSuffix}`,
        name: `Bộ Sản Phẩm Đổi Hàng GlowUp ${testSuffix}`,
        slug: `bo-sp-doi-hang-e17-${testSuffix}`,
        basePrice: 200000,
        categoryId: testCategoryId,
        isActive: true,
      },
    });
    testProductId = product.id;

    // Variants:
    // a) variantReturn: Sản phẩm khách đã mua ban đầu (200,000đ)
    const varReturn = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-RET-200K-${testSuffix}`,
        barcode: `893101${Math.floor(100000 + Math.random() * 900000)}`,
        option1Value: 'Ban Đầu 200K',
        price: 200000,
        costPrice: 80000,
        stockQuantity: 50,
      },
    });
    testVariantReturnId = varReturn.id;

    // b) variantEqual: Sản phẩm đổi ngang giá (200,000đ)
    const varEqual = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-EQ-200K-${testSuffix}`,
        barcode: `893102${Math.floor(100000 + Math.random() * 900000)}`,
        option1Value: 'Ngang Giá 200K',
        price: 200000,
        costPrice: 80000,
        stockQuantity: 20,
      },
    });
    testVariantEqualId = varEqual.id;

    // c) variantHigher: Sản phẩm đổi giá cao hơn (500,000đ)
    const varHigher = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-HI-500K-${testSuffix}`,
        barcode: `893103${Math.floor(100000 + Math.random() * 900000)}`,
        option1Value: 'Giá Cao 500K',
        price: 500000,
        costPrice: 220000,
        stockQuantity: 20,
      },
    });
    testVariantHigherId = varHigher.id;

    // d) variantLower: Sản phẩm đổi giá thấp hơn (120,000đ)
    const varLower = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-LO-120K-${testSuffix}`,
        barcode: `893104${Math.floor(100000 + Math.random() * 900000)}`,
        option1Value: 'Giá Thấp 120K',
        price: 120000,
        costPrice: 50000,
        stockQuantity: 20,
      },
    });
    testVariantLowerId = varLower.id;

    // e) variantOos: Sản phẩm thay thế hết hàng (ATP = 0)
    const varOos = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-OOS-300K-${testSuffix}`,
        barcode: `893105${Math.floor(100000 + Math.random() * 900000)}`,
        option1Value: 'Hết Hàng 300K',
        price: 300000,
        costPrice: 130000,
        stockQuantity: 0,
      },
    });
    testVariantOosId = varOos.id;

    // 7. Seed Inventory records for ATP Check (TC-RMA-16)
    await prisma.inventory.createMany({
      data: [
        {
          storeId: testStoreId,
          productVariantId: testVariantEqualId,
          quantity: 20,
          reservedQuantity: 0,
          safetyStock: 0,
          quarantinedQuantity: 0,
          damagedQuantity: 0,
        },
        {
          storeId: testStoreId,
          productVariantId: testVariantHigherId,
          quantity: 20,
          reservedQuantity: 0,
          safetyStock: 0,
          quarantinedQuantity: 0,
          damagedQuantity: 0,
        },
        {
          storeId: testStoreId,
          productVariantId: testVariantLowerId,
          quantity: 20,
          reservedQuantity: 0,
          safetyStock: 0,
          quarantinedQuantity: 0,
          damagedQuantity: 0,
        },
        {
          storeId: testStoreId,
          productVariantId: testVariantOosId,
          quantity: 0,
          reservedQuantity: 0,
          safetyStock: 0,
          quarantinedQuantity: 0,
          damagedQuantity: 0,
        },
      ],
    });

    // Helper: Tạo đơn hàng gốc & luồng tiếp nhận + kiểm định hoàn tất (PASSED)
    const createDeliveredOrderAndApprovedReturn = async (seq: number) => {
      const pastDeliveryDate = new Date();
      pastDeliveryDate.setDate(pastDeliveryDate.getDate() - 3);

      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-E17-${seq}-${testSuffix}`.slice(0, 20),
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
                productVariantId: testVariantReturnId,
                productName: 'Mỹ Phẩm Trả Ban Đầu',
                variantName: 'Lọ 200K',
                quantity: 1,
                unitPrice: 200000,
                unitCost: 80000,
                totalPrice: 200000,
                discountAmount: 0,
              },
            ],
          },
          shipments: {
            create: {
              shipmentCode: `SHP-E17-${seq}-${testSuffix}`,
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
                transactionId: `TX-VNPAY-E17-${seq}-${testSuffix}`,
              },
            ],
          },
        },
        include: { items: true },
      });
      createdOrderIds.push(order.id);

      // Yêu cầu đổi trả RMA
      const returnOrder = await submitReturnUseCase.execute(testCustomerId, {
        orderId: order.id,
        returnChannel: ReturnChannel.STORE_DROPOFF,
        dropoffLocationId: testStoreId,
        items: [
          {
            orderItemId: order.items[0].id,
            quantity: 1,
            reasonCode: ReturnReasonCode.DEFECTIVE,
            customerNote: 'Yêu cầu đổi sang sản phẩm khác',
            evidenceImages: ['https://s3.glowup.vn/evidence/box.jpg'],
            evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing.mp4',
          },
        ],
      });
      createdReturnOrderIds.push(returnOrder.id);

      // Tiếp nhận tại showroom
      const receiveResult = await receiveStoreDropoffUseCase.execute(
        returnOrder.id,
        testOperatorUserId,
        { packageConditionNote: 'Đã nhận tại showroom, nguyên tem hộp' },
      );
      createdReceiptIds.push(receiveResult.receipt.id);

      // Kiểm định KCS đạt chuẩn (PASSED) -> Chuyển sang RESOLUTION_PENDING
      const inspectionResult = await returnInspectionService.completeInspection(
        returnOrder.id,
        testOperatorUserId,
        {
          inspectorNotes: 'Kiểm định hoàn tất, sẵn sàng quyết toán đổi hàng',
          items: [
            {
              returnItemId: returnOrder.items[0].id,
              passedQuantity: 1,
              failedQuantity: 0,
              isSealIntact: true,
              remainingPercentage: 100,
              disposition: ReturnDisposition.RESTOCK,
              reasonDetail: 'Đạt chuẩn KCS, cho phép đổi hàng',
            },
          ],
        },
      );
      createdInspectionIds.push(inspectionResult.inspection.id);

      return returnOrder;
    };

    returnOrderEqual = await createDeliveredOrderAndApprovedReturn(1);
    returnOrderHigher = await createDeliveredOrderAndApprovedReturn(2);
    returnOrderLower = await createDeliveredOrderAndApprovedReturn(3);
    returnOrderOos = await createDeliveredOrderAndApprovedReturn(4);
  });

  afterAll(async () => {
    const safeDelete = async (fn: () => Promise<any>) => {
      try {
        await fn();
      } catch (e) {
        // ignore cascading errors
      }
    };

    try {
      if (createdSettlementIds.length > 0) {
        await safeDelete(() =>
          prisma.exchangeFunding.deleteMany({
            where: { settlementId: { in: createdSettlementIds } },
          }),
        );
        await safeDelete(() =>
          prisma.exchangeSettlement.deleteMany({
            where: { id: { in: createdSettlementIds } },
          }),
        );
      }

      if (createdReplacementOrderIds.length > 0) {
        await safeDelete(() =>
          prisma.payment.deleteMany({
            where: { orderId: { in: createdReplacementOrderIds } },
          }),
        );
        await safeDelete(() =>
          prisma.orderItem.deleteMany({
            where: { orderId: { in: createdReplacementOrderIds } },
          }),
        );
        await safeDelete(() =>
          prisma.order.deleteMany({
            where: { id: { in: createdReplacementOrderIds } },
          }),
        );
      }

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

      if (createdReturnOrderIds.length > 0) {
        await safeDelete(() =>
          prisma.exchangeItem.deleteMany({
            where: { returnOrderId: { in: createdReturnOrderIds } },
          }),
        );
        await safeDelete(() =>
          prisma.outboxEvent.deleteMany({
            where: { aggregateId: { in: createdReturnOrderIds } },
          }),
        );
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

      if (createdOrderIds.length > 0) {
        await safeDelete(() =>
          prisma.payment.deleteMany({
            where: { orderId: { in: createdOrderIds } },
          }),
        );
        await safeDelete(() =>
          prisma.shipment.deleteMany({
            where: { orderId: { in: createdOrderIds } },
          }),
        );
        await safeDelete(() =>
          prisma.orderItem.deleteMany({
            where: { orderId: { in: createdOrderIds } },
          }),
        );
        await safeDelete(() =>
          prisma.order.deleteMany({
            where: { id: { in: createdOrderIds } },
          }),
        );
      }

      await safeDelete(() =>
        prisma.inventory.deleteMany({
          where: { storeId: testStoreId },
        }),
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
        prisma.store.deleteMany({ where: { id: testStoreId } }),
      );
      await safeDelete(() =>
        prisma.customer.deleteMany({ where: { id: testCustomerId } }),
      );
      await safeDelete(() =>
        prisma.user.deleteMany({ where: { id: testOperatorUserId } }),
      );
    } catch (e) {
      // final teardown error ignore
    } finally {
      await prisma.$disconnect();
    }
  });

  // =========================================================================
  // KỊCH BẢN 1: ĐỔI NGANG GIÁ (TC-RMA-13)
  // Giá hoàn: 200,000đ | Giá mới: 200,000đ -> creditApplied = 200,000đ, additionalDue = 0, refundDue = 0
  // =========================================================================
  describe('Kịch bản 1: Đổi ngang giá (TC-RMA-13)', () => {
    it('1.1 Tính báo giá đổi ngang giá chính xác (EP17-T01)', async () => {
      const quote = await exchangeSettlementService.calculateExchangeQuote(
        returnOrderEqual.id,
        [{ productVariantId: testVariantEqualId, quantity: 1 }],
      );

      expect(quote.returnOrderId).toBe(returnOrderEqual.id);
      expect(quote.returnCredit).toBe(200000);
      expect(quote.replacementPayable).toBe(200000);
      expect(quote.creditApplied).toBe(200000);
      expect(quote.additionalDue).toBe(0);
      expect(quote.refundDue).toBe(0);
      expect(quote.replacementItems).toHaveLength(1);
      expect(quote.replacementItems[0].productVariantId).toBe(testVariantEqualId);
      expect(quote.replacementItems[0].totalPrice).toBe(200000);
    });

    it('1.2 Quyết toán và tạo đơn hàng thay thế EXCHANGE (EP17-T02)', async () => {
      const result = await exchangeSettlementService.createReplacementOrder(
        returnOrderEqual.id,
        testOperatorUserId,
        {
          replacementItems: [{ productVariantId: testVariantEqualId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Khách Đổi Ngang',
            phone: '0901112233',
            addressLine1: '123 Đường Bến Nghé',
            ward: 'Phường Bến Nghé',
            district: 'Quận 1',
            city: 'Hồ Chí Minh',
          },
          note: 'Đổi ngang sang SKU màu tương đương',
        },
      );

      createdSettlementIds.push(result.settlement.id);
      createdReplacementOrderIds.push(result.replacementOrder.id);

      // Kiểm tra Đơn hàng thay thế
      expect(result.replacementOrder.orderType).toBe('EXCHANGE');
      expect(result.replacementOrder.status).toBe('CONFIRMED');
      expect(Number(result.replacementOrder.totalAmount)).toBe(200000);
      expect(result.replacementOrder.shippingAddress).toBeDefined();

      // Kiểm tra Bản ghi ExchangeSettlement
      expect(result.settlement.status).toBe('SETTLED');
      expect(Number(result.settlement.returnCredit)).toBe(200000);
      expect(Number(result.settlement.replacementPayable)).toBe(200000);
      expect(Number(result.settlement.creditApplied)).toBe(200000);
      expect(Number(result.settlement.additionalDue)).toBe(0);
      expect(Number(result.settlement.refundDue)).toBe(0);

      // Thỏa mãn ràng buộc PostgreSQL chk_exchange_amounts
      expect(
        Number(result.settlement.creditApplied) + Number(result.settlement.additionalDue),
      ).toBe(Number(result.settlement.replacementPayable));
      expect(
        Number(result.settlement.creditApplied) + Number(result.settlement.refundDue),
      ).toBe(Number(result.settlement.returnCredit));

      // Kiểm tra Payment bù trừ tự động bằng EXCHANGE_CREDIT
      const payments = await prisma.payment.findMany({
        where: { orderId: result.replacementOrder.id },
      });
      expect(payments).toHaveLength(1);
      expect(payments[0].paymentMethod).toBe('EXCHANGE_CREDIT');
      expect(Number(payments[0].amount)).toBe(200000);
      expect(payments[0].status).toBe('COMPLETED');

      // Kiểm tra ExchangeFunding ghi nhận nguồn gốc từ đơn cũ
      const fundings = await prisma.exchangeFunding.findMany({
        where: { settlementId: result.settlement.id },
      });
      expect(fundings).toHaveLength(1);
      expect(Number(fundings[0].amount)).toBe(200000);

      // Kiểm tra ReturnOrder chuyển sang COMPLETED
      const updatedReturn = await prisma.returnOrder.findUnique({
        where: { id: returnOrderEqual.id },
      });
      expect(updatedReturn?.status).toBe(ReturnOrderStatus.COMPLETED);

      // Kiểm tra Outbox event phát sinh
      const outbox = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: returnOrderEqual.id,
          eventType: 'EXCHANGE_REPLACEMENT_ORDER_CREATED',
        },
      });
      expect(outbox).not.toBeNull();
      expect((outbox?.payload as any).additionalDue).toBe(0);
      expect((outbox?.payload as any).refundDue).toBe(0);
    });

    it('1.3 Truy vấn chi tiết ExchangeSettlement thành công', async () => {
      const settlement = await exchangeSettlementService.getExchangeSettlementByReturnOrderId(
        returnOrderEqual.id,
      );

      expect(settlement.returnOrderId).toBe(returnOrderEqual.id);
      expect(settlement.replacementOrder).toBeDefined();
      expect(settlement.replacementOrder.orderType).toBe('EXCHANGE');
      expect(settlement.funding).toHaveLength(1);
    });
  });

  // =========================================================================
  // KỊCH BẢN 2: ĐỔI SẢN PHẨM GIÁ CAO HƠN (TC-RMA-14)
  // Giá hoàn: 200,000đ | Giá mới: 500,000đ -> creditApplied = 200k, additionalDue = 300k (COD)
  // =========================================================================
  describe('Kịch bản 2: Đổi sản phẩm giá cao hơn (TC-RMA-14)', () => {
    it('2.1 Tính báo giá đổi sản phẩm giá cao hơn chính xác', async () => {
      const quote = await exchangeSettlementService.calculateExchangeQuote(
        returnOrderHigher.id,
        [{ productVariantId: testVariantHigherId, quantity: 1 }],
      );

      expect(quote.returnCredit).toBe(200000);
      expect(quote.replacementPayable).toBe(500000);
      expect(quote.creditApplied).toBe(200000);
      expect(quote.additionalDue).toBe(300000);
      expect(quote.refundDue).toBe(0);
      expect(quote.creditApplied + quote.additionalDue).toBe(quote.replacementPayable);
    });

    it('2.2 Quyết toán và sinh thêm thanh toán COD 300,000đ', async () => {
      const result = await exchangeSettlementService.createReplacementOrder(
        returnOrderHigher.id,
        testOperatorUserId,
        {
          replacementItems: [{ productVariantId: testVariantHigherId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Khách Nâng Cấp Hàng',
            phone: '0902223344',
            addressLine1: '456 Hai Bà Trưng',
            ward: 'Tân Định',
            district: 'Quận 1',
            city: 'Hồ Chí Minh',
          },
          paymentMethod: 'COD',
          note: 'Khách đồng ý bù chênh lệch 300k qua COD khi nhận hàng',
        },
      );

      createdSettlementIds.push(result.settlement.id);
      createdReplacementOrderIds.push(result.replacementOrder.id);

      expect(Number(result.settlement.creditApplied)).toBe(200000);
      expect(Number(result.settlement.additionalDue)).toBe(300000);
      expect(Number(result.settlement.refundDue)).toBe(0);

      // Kiểm tra có 2 bản ghi Payment: 1 Credit 200k (CAPTURED) + 1 COD 300k (PENDING)
      const payments = await prisma.payment.findMany({
        where: { orderId: result.replacementOrder.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(payments).toHaveLength(2);

      const creditPay = payments.find((p) => p.paymentMethod === 'EXCHANGE_CREDIT');
      expect(creditPay).toBeDefined();
      expect(Number(creditPay?.amount)).toBe(200000);
      expect(creditPay?.status).toBe('COMPLETED');

      const codPay = payments.find((p) => p.paymentMethod === 'COD');
      expect(codPay).toBeDefined();
      expect(Number(codPay?.amount)).toBe(300000);
      expect(codPay?.status).toBe('PENDING');

      // ReturnOrder hoàn tất
      const updatedReturn = await prisma.returnOrder.findUnique({
        where: { id: returnOrderHigher.id },
      });
      expect(updatedReturn?.status).toBe(ReturnOrderStatus.COMPLETED);
    });
  });

  // =========================================================================
  // KỊCH BẢN 3: ĐỔI SẢN PHẨM GIÁ THẤP HƠN (TC-RMA-15)
  // Giá hoàn: 200,000đ | Giá mới: 120,000đ -> creditApplied = 120k, refundDue = 80,000đ (auto Refund)
  // =========================================================================
  describe('Kịch bản 3: Đổi sản phẩm giá thấp hơn (TC-RMA-15)', () => {
    it('3.1 Tính báo giá đổi sản phẩm giá thấp hơn chính xác', async () => {
      const quote = await exchangeSettlementService.calculateExchangeQuote(
        returnOrderLower.id,
        [{ productVariantId: testVariantLowerId, quantity: 1 }],
      );

      expect(quote.returnCredit).toBe(200000);
      expect(quote.replacementPayable).toBe(120000);
      expect(quote.creditApplied).toBe(120000);
      expect(quote.additionalDue).toBe(0);
      expect(quote.refundDue).toBe(80000);
      expect(quote.creditApplied + quote.refundDue).toBe(quote.returnCredit);
    });

    it('3.2 Quyết toán và tự động phát sinh hoàn tiền thừa 80,000đ', async () => {
      const result = await exchangeSettlementService.createReplacementOrder(
        returnOrderLower.id,
        testOperatorUserId,
        {
          replacementItems: [{ productVariantId: testVariantLowerId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Khách Đổi Sản Phẩm Nhỏ',
            phone: '0903334455',
            addressLine1: '789 Nam Kỳ Khởi Nghĩa',
            ward: 'Võ Thị Sáu',
            district: 'Quận 3',
            city: 'Hồ Chí Minh',
          },
          note: 'Đổi xuống dung tích nhỏ hơn, hoàn tiền thừa vào tài khoản',
        },
      );

      createdSettlementIds.push(result.settlement.id);
      createdReplacementOrderIds.push(result.replacementOrder.id);
      if (result.excessRefund) {
        createdRefundIds.push(result.excessRefund.id);
      }

      expect(Number(result.settlement.creditApplied)).toBe(120000);
      expect(Number(result.settlement.additionalDue)).toBe(0);
      expect(Number(result.settlement.refundDue)).toBe(80000);

      // Kiểm tra Payment bù trừ tín dụng 120,000đ
      const payments = await prisma.payment.findMany({
        where: { orderId: result.replacementOrder.id },
      });
      expect(payments).toHaveLength(1);
      expect(payments[0].paymentMethod).toBe('EXCHANGE_CREDIT');
      expect(Number(payments[0].amount)).toBe(120000);
      expect(payments[0].status).toBe('COMPLETED');

      // Kiểm tra tự động sinh bản ghi Refund cho 80,000đ tiền thừa
      const refunds = await prisma.refund.findMany({
        where: { returnOrderId: returnOrderLower.id },
      });
      expect(refunds).toHaveLength(1);
      expect(Number(refunds[0].amount)).toBe(80000);
      expect(refunds[0].status).toBe('PENDING');
      expect(refunds[0].reason).toContain('giá thấp hơn');

      // ReturnOrder hoàn tất
      const updatedReturn = await prisma.returnOrder.findUnique({
        where: { id: returnOrderLower.id },
      });
      expect(updatedReturn?.status).toBe(ReturnOrderStatus.COMPLETED);
    });
  });

  // =========================================================================
  // KỊCH BẢN 4: CHẶN KHI HẾT HÀNG THAY THẾ (TC-RMA-16, AC1)
  // Biến thể varOos có ATP = 0 -> Ném BadRequestException
  // =========================================================================
  describe('Kịch bản 4: Chặn khi hết hàng thay thế (TC-RMA-16, AC1)', () => {
    it('Chặn tạo đơn thay thế và giữ nguyên trạng thái hồ sơ khi tồn kho ATP = 0', async () => {
      await expect(
        exchangeSettlementService.createReplacementOrder(
          returnOrderOos.id,
          testOperatorUserId,
          {
            replacementItems: [{ productVariantId: testVariantOosId, quantity: 1 }],
            shippingAddress: {
              fullName: 'Khách Đổi SKU Hết Hàng',
              phone: '0904445566',
              addressLine1: '321 Điện Biên Phủ',
              ward: 'Đa Kao',
              district: 'Quận 1',
              city: 'Hồ Chí Minh',
            },
          },
        ),
      ).rejects.toThrow(BadRequestException);

      // Hồ sơ vẫn giữ nguyên ở RESOLUTION_PENDING, không bị đóng hay sửa đổi
      const returnOrder = await prisma.returnOrder.findUnique({
        where: { id: returnOrderOos.id },
      });
      expect(returnOrder?.status).toBe(ReturnOrderStatus.RESOLUTION_PENDING);

      // Không có đơn hàng thay thế hay settlement nào được tạo
      const settlements = await prisma.exchangeSettlement.findMany({
        where: { returnOrderId: returnOrderOos.id },
      });
      expect(settlements).toHaveLength(0);
    });
  });

  // =========================================================================
  // KỊCH BẢN 5: CHỐNG ĐỔI TRÙNG LẶP (IDEMPOTENCY & DUPLICATE PREVENTION)
  // Hồ sơ returnOrderEqual đã được quyết toán -> Chặn lần gọi thứ 2
  // =========================================================================
  describe('Kịch bản 5: Chống quyết toán đổi hàng trùng lặp', () => {
    it('Chặn tạo đơn đổi hàng lần 2 trên cùng một ReturnOrder đã giải quyết', async () => {
      await expect(
        exchangeSettlementService.createReplacementOrder(
          returnOrderEqual.id,
          testOperatorUserId,
          {
            replacementItems: [{ productVariantId: testVariantEqualId, quantity: 1 }],
            shippingAddress: {
              fullName: 'Khách Đổi Lại',
              phone: '0901112233',
              addressLine1: '123 Đường Bến Nghé',
              ward: 'Phường Bến Nghé',
              district: 'Quận 1',
              city: 'Hồ Chí Minh',
            },
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
