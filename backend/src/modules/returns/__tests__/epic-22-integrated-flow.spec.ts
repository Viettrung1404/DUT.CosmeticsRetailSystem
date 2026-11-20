import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LotQualityAnalyticsService } from '../application/services/lot-quality-analytics.service';
import { SubmitReturnRequestUseCase } from '../application/use-cases/submit-return-request.use-case';
import { RmaEligibilityService } from '../application/services/rma-eligibility.service';
import { OutboxWriterService } from '../../async-infrastructure/outbox/outbox-writer.service';
import {
  ReturnReasonCode,
  ReturnChannel,
} from '../domain/entities/return-policy.entity';
import { seedDefaultReturnPolicy } from '../infrastructure/seeds/return-policy.seed';
import {
  cleanupTestDataByPattern,
  cleanupTestEntities,
} from '../../../core/test/test-cleanup.helper';

describe('EPIC 22 INTEGRATED FLOW: Advanced BI & Lot Quality Analytics (FR-09)', () => {
  jest.setTimeout(90000);

  let prisma: PrismaClient;
  let service: LotQualityAnalyticsService;
  let submitReturnUseCase: SubmitReturnRequestUseCase;

  const testSuffix = Math.random().toString(36).substring(2, 7);
  let testStoreId: string;
  let testCustomerId: string;
  let testPolicyVersionId: string;
  let testCategoryId: string;
  let testProductId: string;
  let testVariantId: string;
  let testLotId: string;
  let testOrderId: string;
  let testReturnOrderId: string;
  let testReturnItemId: string;

  const createdOrderIds: string[] = [];
  const createdReturnOrderIds: string[] = [];
  const createdShipmentIds: string[] = [];
  const createdLotIds: string[] = [];
  const createdDispositionIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    const policy = await seedDefaultReturnPolicy(prisma);
    testPolicyVersionId = policy.id;

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        LotQualityAnalyticsService,
        SubmitReturnRequestUseCase,
        RmaEligibilityService,
        OutboxWriterService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<LotQualityAnalyticsService>(LotQualityAnalyticsService);
    submitReturnUseCase = module.get<SubmitReturnRequestUseCase>(SubmitReturnRequestUseCase);

    // 1. Tạo Store
    const store = await prisma.store.create({
      data: {
        code: `STR-E22-${testSuffix}`.slice(0, 20),
        name: `Showroom E22 ${testSuffix}`,
        address: '150 Đồng Khởi, Quận 1, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        phone: '02838888888',
        type: 'STORE',
        isActive: true,
      },
    });
    testStoreId = store.id;

    // 2. Tạo Category, Product & Variant
    const category = await prisma.category.create({
      data: {
        name: `Dưỡng Da E22 ${testSuffix}`,
        slug: `duong-da-e22-${testSuffix}`,
      },
    });
    testCategoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `PRD-E22-${testSuffix}`,
        name: `Serum Retinol E22 ${testSuffix}`,
        slug: `serum-retinol-e22-${testSuffix}`,
        basePrice: 450000,
        categoryId: category.id,
        isActive: true,
      },
    });
    testProductId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `SKU-E22-${testSuffix}`,
        barcode: `893000${Math.floor(100000 + Math.random() * 900000)}`,
        price: 450000,
        costPrice: 200000,
        stockQuantity: 50,
        isActive: true,
      },
    });
    testVariantId = variant.id;

    // 3. Tạo InventoryLot (Lô sản xuất) có 20 sản phẩm
    const lot = await prisma.inventoryLot.create({
      data: {
        locationId: testStoreId,
        productVariantId: testVariantId,
        batchCode: `LOT-E22-DEFECT-${testSuffix}`,
        expiryDate: new Date('2027-12-31'),
        quantityOnHand: 20,
        quantityReserved: 0,
      },
    });
    testLotId = lot.id;
    createdLotIds.push(lot.id);

    // 4. Tạo Customer
    const customer = await prisma.customer.create({
      data: {
        fullName: `Khách Hàng E22 ${testSuffix}`,
        phone: `093${Math.floor(1000000 + Math.random() * 9000000)}`,
      },
    });
    testCustomerId = customer.id;

    // 5. Tạo Order (Trạng thái DELIVERED vừa giao 3 tiếng trước)
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 3);

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-E22-${testSuffix}`.slice(0, 20),
        customerId: testCustomerId,
        storeId: testStoreId,
        orderType: 'ONLINE',
        status: 'DELIVERED',
        subtotal: 900000,
        discountAmount: 0,
        totalAmount: 900000,
        policyVersionId: testPolicyVersionId,
        createdAt: pastDate,
        updatedAt: pastDate,
        items: {
          create: [
            {
              productVariantId: testVariantId,
              productName: 'Serum Retinol Phục Hồi',
              variantName: '50ml',
              quantity: 2,
              unitPrice: 450000,
              unitCost: 200000,
              totalPrice: 900000,
              discountAmount: 0,
            },
          ],
        },
        shipments: {
          create: {
            shipmentCode: `SHP-E22-${testSuffix}`,
            carrierCode: 'GHN',
            shipmentType: 'OUTBOUND',
            status: 'DELIVERED',
            deliveredAt: pastDate,
            shippingFeePaid: 30000,
          },
        },
      },
      include: { items: true, shipments: true },
    });
    testOrderId = order.id;
    createdOrderIds.push(order.id);
    if (order.shipments[0]) {
      createdShipmentIds.push(order.shipments[0].id);
    }

    // 6. Nộp yêu cầu đổi trả RMA 1 với lý do DEFECTIVE qua submitReturnUseCase
    const rma1 = await submitReturnUseCase.execute(testCustomerId, {
      orderId: testOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: testStoreId,
      items: [
        {
          orderItemId: order.items[0].id,
          quantity: 2,
          reasonCode: ReturnReasonCode.DEFECTIVE,
          customerNote: 'Kem bị tách nước và có mùi lạ',
          evidenceImages: ['https://s3.glowup.vn/evidence/defect-lot.jpg'],
          evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing-lot.mp4',
        },
      ],
    });
    testReturnOrderId = rma1.id;
    createdReturnOrderIds.push(rma1.id);

    const rma1Full = await prisma.returnOrder.findUnique({
      where: { id: rma1.id },
      include: { items: true },
    });
    testReturnItemId = rma1Full!.items[0].id;

    // Cập nhật kết quả KCS và số tiền hoàn
    await prisma.returnOrderItem.update({
      where: { id: testReturnItemId },
      data: {
        inspectionStatus: 'FAILED',
        disposition: 'SCRAP',
        refundAmountPerUnit: 450000,
      },
    });

    // 7. Tạo InventoryDisposition gắn vào testLotId (loại SCRAP tiêu hủy)
    const disposition = await prisma.inventoryDisposition.create({
      data: {
        dispositionCode: `DSP-E22-${testSuffix}`,
        locationId: testStoreId,
        productVariantId: testVariantId,
        lotId: testLotId,
        returnItemId: testReturnItemId,
        dispositionType: 'SCRAP',
        quantity: 2,
        notes: 'Tiêu hủy do sản phẩm lỗi biến chất theo biên bản KCS',
      },
    });
    createdDispositionIds.push(disposition.id);

    // 8. Tạo thêm đơn hàng thứ 2 và nộp RMA với lý do DAMAGED_IN_TRANSIT và CHANGE_OF_MIND
    const order2 = await prisma.order.create({
      data: {
        orderNumber: `ORD-E22-B-${testSuffix}`.slice(0, 20),
        customerId: testCustomerId,
        storeId: testStoreId,
        orderType: 'ONLINE',
        status: 'DELIVERED',
        subtotal: 900000,
        discountAmount: 0,
        totalAmount: 900000,
        policyVersionId: testPolicyVersionId,
        createdAt: pastDate,
        updatedAt: pastDate,
        items: {
          create: [
            {
              productVariantId: testVariantId,
              productName: 'Serum Retinol Phục Hồi',
              variantName: '50ml',
              quantity: 2,
              unitPrice: 450000,
              unitCost: 200000,
              totalPrice: 900000,
              discountAmount: 0,
            },
          ],
        },
        shipments: {
          create: {
            shipmentCode: `SHP-E22-B-${testSuffix}`,
            carrierCode: 'GHN',
            shipmentType: 'OUTBOUND',
            status: 'DELIVERED',
            deliveredAt: pastDate,
            shippingFeePaid: 30000,
          },
        },
      },
      include: { items: true, shipments: true },
    });
    createdOrderIds.push(order2.id);
    if (order2.shipments[0]) {
      createdShipmentIds.push(order2.shipments[0].id);
    }

    const rma2 = await submitReturnUseCase.execute(testCustomerId, {
      orderId: order2.id,
      returnChannel: ReturnChannel.CARRIER_PICKUP,
      pickupAddress: {
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Bến Nghé',
        street: '150 Đồng Khởi',
        contactName: 'Khách Hàng E22',
        contactPhone: '0938888888',
      },
      items: [
        {
          orderItemId: order2.items[0].id,
          quantity: 1,
          reasonCode: ReturnReasonCode.DAMAGED_IN_TRANSIT,
          customerNote: 'Vỡ lọ serum khi vận chuyển',
          evidenceImages: ['https://s3.glowup.vn/evidence/broken-bottle.jpg'],
          evidenceVideoUrl: 'https://s3.glowup.vn/evidence/unboxing-broken.mp4',
        },
      ],
    });
    createdReturnOrderIds.push(rma2.id);

    // Cập nhật refundAmountPerUnit cho rma2
    await prisma.returnOrderItem.updateMany({
      where: { returnOrderId: rma2.id },
      data: { refundAmountPerUnit: 450000 },
    });
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
        orderIds: [...createdOrderIds, testOrderId].filter(Boolean),
        returnOrderIds: [...createdReturnOrderIds, testReturnOrderId].filter(Boolean),
        shipmentIds: createdShipmentIds,
        lotIds: [...createdLotIds, testLotId].filter(Boolean),
        dispositionIds: createdDispositionIds,
      });
    } catch (e) {
      // ignore
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('Kịch bản 1: Báo cáo chất lượng theo lô & Kích hoạt cảnh báo cách ly (LOT_DEFECT_ALERT)', () => {
    it('Lô hàng có 2 sản phẩm bị lỗi / 20 sản phẩm xuất = 10% tỷ lệ lỗi -> Vượt ngưỡng 5% -> Kích hoạt cảnh báo QUARANTINE_LOT_IMMEDIATELY', async () => {
      const report = await service.getLotQualityReport({
        variantId: testVariantId,
        thresholdPercent: 5.0,
        minReturns: 1,
      });

      expect(report).toBeDefined();
      expect(report.length).toBeGreaterThanOrEqual(1);

      const targetLot = report.find((l) => l.lotId === testLotId);
      expect(targetLot).toBeDefined();
      expect(targetLot?.batchCode).toBe(`LOT-E22-DEFECT-${testSuffix}`);
      expect(targetLot?.defectiveQuantity).toBe(2);
      expect(targetLot?.defectRatePercentage).toBe(10.0);
      expect(targetLot?.isAlertTriggered).toBe(true);
      expect(targetLot?.alertSeverity).toBe('WARNING');
      expect(targetLot?.recommendedAction).toBe('QUARANTINE_LOT_IMMEDIATELY');

      // Xác minh sự kiện Outbox đã được ghi nhận trong CSDL
      const outboxAlert = await prisma.outboxEvent.findFirst({
        where: {
          aggregateType: 'INVENTORY_LOT',
          aggregateId: testLotId,
          eventType: 'LOT_DEFECT_ALERT',
        },
      });

      expect(outboxAlert).toBeDefined();
      expect((outboxAlert?.payload as any).batchCode).toBe(`LOT-E22-DEFECT-${testSuffix}`);
      expect((outboxAlert?.payload as any).defectRatePercentage).toBe(10.0);
    });
  });

  describe('Kịch bản 2: Phân tích cơ cấu lý do trả hàng (Return Reason Breakdown)', () => {
    it('Tổng hợp đúng cơ cấu lý do trả hàng và giá trị tiền hoàn', async () => {
      const breakdown = await service.getReturnReasonBreakdown({
        variantId: testVariantId,
      });

      expect(breakdown).toBeDefined();
      // 2 DEFECTIVE + 1 DAMAGED_IN_TRANSIT = 3 items
      expect(breakdown.totalReturns).toBe(3);
      expect(breakdown.totalRefundValue).toBe(3 * 450000); // 1,350,000

      const defectiveReason = breakdown.reasons.find((r) => r.reasonCode === 'DEFECTIVE');
      const transitReason = breakdown.reasons.find((r) => r.reasonCode === 'DAMAGED_IN_TRANSIT');

      expect(defectiveReason).toBeDefined();
      expect(defectiveReason?.count).toBe(2);
      expect(defectiveReason?.percentage).toBe(66.67);

      expect(transitReason).toBeDefined();
      expect(transitReason?.count).toBe(1);
      expect(transitReason?.percentage).toBe(33.33);
    });
  });

  describe('Kịch bản 3: So sánh tỷ lệ hư hại trong quá trình vận chuyển (Carrier Damage Comparison)', () => {
    it('Phát hiện bưu kiện vỡ hỏng gắn với hãng vận chuyển GHN', async () => {
      const carrierComparison = await service.getCarrierDamageComparison({});

      expect(carrierComparison).toBeDefined();
      expect(carrierComparison.carriers).toBeDefined();

      const ghnCarrier = carrierComparison.carriers.find((c) => c.carrierCode === 'GHN');
      expect(ghnCarrier).toBeDefined();
      expect(ghnCarrier?.totalDeliveredShipments).toBeGreaterThanOrEqual(1);
      expect(ghnCarrier?.damagedReturnsCount).toBeGreaterThanOrEqual(1);
      expect(ghnCarrier?.damageRatePercentage).toBeGreaterThan(0);
    });
  });
});
