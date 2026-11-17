import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LogisticsDashboardService } from '../application/services/logistics-dashboard.service';

describe('EPIC 20 INTEGRATED FLOW: Real-Time Ops & Logistics Dashboard', () => {
  jest.setTimeout(90000);

  let prisma: PrismaClient;
  let service: LogisticsDashboardService;

  const testSuffix = Math.random().toString(36).substring(2, 7);
  let testStoreId: string;
  let testCustomerId: string;

  const createdShipmentIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdFulfillmentOrderIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        LogisticsDashboardService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<LogisticsDashboardService>(LogisticsDashboardService);

    // 1. Seed Store
    const store = await prisma.store.create({
      data: {
        code: `STR-E20-${testSuffix}`.slice(0, 20),
        name: `Tổng Kho Vận Hành E20 ${testSuffix}`,
        address: '120 Trường Chinh, Tân Bình, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Tân Bình',
        phone: '02838888888',
        type: 'WAREHOUSE',
        isActive: true,
      },
    });
    testStoreId = store.id;

    // 2. Seed Customer
    const customer = await prisma.customer.create({
      data: {
        fullName: `Khách Hàng Dashboard E20 ${testSuffix}`,
        phone: `0933${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });
    testCustomerId = customer.id;

    // 3. Seed Base Order
    const createOrder = async (seq: number) => {
      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-E20-${seq}-${testSuffix}`.slice(0, 20),
          customerId: testCustomerId,
          storeId: testStoreId,
          orderType: 'ONLINE',
          status: 'CONFIRMED',
          subtotal: 500000,
          discountAmount: 0,
          totalAmount: 500000,
        },
      });
      createdOrderIds.push(order.id);
      return order;
    };

    const order1 = await createOrder(1);
    const order2 = await createOrder(2);
    const order3 = await createOrder(3);
    const order4 = await createOrder(4);

    const now = new Date();

    // 4. Seed Shipments:
    // S1: Delivered 1st attempt, Standard GHN, COD 500k COLLECTED
    const s1 = await prisma.shipment.create({
      data: {
        orderId: order1.id,
        shipmentCode: `SHP-E20-1-${testSuffix}`,
        carrierCode: 'GHN',
        carrierServiceCode: 'STANDARD',
        status: 'DELIVERED',
        deliveredAt: new Date(now.getTime() - 30 * 60 * 1000),
        failedAttempts: 0,
        codAmount: 500000,
        codStatus: 'COD_COLLECTED',
      },
    });
    createdShipmentIds.push(s1.id);

    // S2: Delivered Multi-attempt (failedAttempts = 2), Standard GHN, COD 300k RECONCILED
    const s2 = await prisma.shipment.create({
      data: {
        orderId: order2.id,
        shipmentCode: `SHP-E20-2-${testSuffix}`,
        carrierCode: 'GHN',
        carrierServiceCode: 'STANDARD',
        status: 'DELIVERED',
        deliveredAt: new Date(now.getTime() - 20 * 60 * 1000),
        failedAttempts: 2,
        codAmount: 300000,
        codStatus: 'COD_RECONCILED',
      },
    });
    createdShipmentIds.push(s2.id);

    // S3: Ahamove Express 2H, On-time (took 45 minutes)
    const fortyFiveMinsAgo = new Date(now.getTime() - 45 * 60 * 1000);
    const s3 = await prisma.shipment.create({
      data: {
        orderId: order3.id,
        shipmentCode: `SHP-E20-3-${testSuffix}`,
        carrierCode: 'AHAMOVE',
        carrierServiceCode: 'EXPRESS_2H',
        status: 'DELIVERED',
        createdAt: fortyFiveMinsAgo,
        deliveredAt: now,
        failedAttempts: 0,
        codAmount: 0,
      },
    });
    createdShipmentIds.push(s3.id);

    // S4: Ahamove Express 2H, Breached SLA (> 150 mins elapsed, still IN_TRANSIT)
    const twoAndHalfHoursAgo = new Date(now.getTime() - 150 * 60 * 1000);
    const s4 = await prisma.shipment.create({
      data: {
        orderId: order4.id,
        shipmentCode: `SHP-E20-4-${testSuffix}`,
        carrierCode: 'AHAMOVE',
        carrierServiceCode: 'EXPRESS_2H',
        status: 'IN_TRANSIT',
        createdAt: twoAndHalfHoursAgo,
        failedAttempts: 0,
        codAmount: 0,
      },
    });
    createdShipmentIds.push(s4.id);

    // 5. Seed FulfillmentOrders
    const fo1 = await prisma.fulfillmentOrder.create({
      data: {
        fulfillmentOrderNumber: `FO-E20-1-${testSuffix}`.slice(0, 20),
        orderId: order1.id,
        sourceLocationId: testStoreId,
        shippingServiceCode: 'GHN_STANDARD',
        status: 'ALLOCATED',
        totalItemsCount: 1,
      },
    });
    createdFulfillmentOrderIds.push(fo1.id);

    const fo2 = await prisma.fulfillmentOrder.create({
      data: {
        fulfillmentOrderNumber: `FO-E20-2-${testSuffix}`.slice(0, 20),
        orderId: order2.id,
        sourceLocationId: testStoreId,
        shippingServiceCode: 'GHN_STANDARD',
        status: 'HANDED_OVER',
        totalItemsCount: 1,
      },
    });
    createdFulfillmentOrderIds.push(fo2.id);
  });

  afterAll(async () => {
    const safeDelete = async (fn: () => Promise<any>) => {
      try {
        await fn();
      } catch (e) {}
    };

    if (createdShipmentIds.length > 0) {
      await safeDelete(() =>
        prisma.shipment.deleteMany({ where: { id: { in: createdShipmentIds } } }),
      );
    }

    if (createdFulfillmentOrderIds.length > 0) {
      await safeDelete(() =>
        prisma.fulfillmentOrder.deleteMany({ where: { id: { in: createdFulfillmentOrderIds } } }),
      );
    }

    if (createdOrderIds.length > 0) {
      await safeDelete(() =>
        prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } }),
      );
    }

    await safeDelete(() =>
      prisma.store.deleteMany({ where: { id: testStoreId } }),
    );
    await safeDelete(() =>
      prisma.customer.deleteMany({ where: { id: testCustomerId } }),
    );

    await prisma.$disconnect();
  });

  describe('Kịch bản 1: Tỷ lệ giao hàng thành công lần đầu (First-attempt Delivery Rate)', () => {
    it('Tính toán chính xác tỷ lệ giao lần đầu thành công trên dữ liệu thực tế', async () => {
      const metric = await service.getFirstAttemptDeliveryRate();

      expect(metric.totalDelivered).toBeGreaterThanOrEqual(3);
      expect(metric.firstAttemptSuccessCount).toBeGreaterThanOrEqual(2);
      expect(metric.multiAttemptCount).toBeGreaterThanOrEqual(1);
      expect(metric.firstAttemptRatePercentage).toBeGreaterThan(0);
      expect(metric.firstAttemptRatePercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Kịch bản 2: Tỷ lệ vi phạm cam kết giao hỏa tốc 2H (2H Express SLA)', () => {
    it('Phát hiện chính xác các đơn giao hỏa tốc vượt ngưỡng 120 phút', async () => {
      const metric = await service.getExpressSlaMetrics();

      expect(metric.totalExpress).toBeGreaterThanOrEqual(2);
      expect(metric.onTimeCount).toBeGreaterThanOrEqual(1);
      expect(metric.breachedCount).toBeGreaterThanOrEqual(1);
      expect(metric.breachRatePercentage).toBeGreaterThan(0);
    });
  });

  describe('Kịch bản 3: Báo cáo & Heatmap sai lệch đối soát COD', () => {
    it('Tính đúng tổng COD thu hộ, đã đối soát và số tiền sai lệch', async () => {
      const metric = await service.getCodReconciliationHeatmap();

      expect(metric.totalCodExpected).toBeGreaterThanOrEqual(800000);
      expect(metric.totalCodCollected).toBeGreaterThanOrEqual(800000);
      expect(metric.totalCodReconciled).toBeGreaterThanOrEqual(300000);
      expect(metric.overallDiscrepancy).toBeGreaterThanOrEqual(500000);

      const ghnSummary = metric.byCarrier.find((c) => c.carrierCode === 'GHN');
      expect(ghnSummary).toBeDefined();
      expect(ghnSummary?.discrepancyAmount).toBeGreaterThanOrEqual(500000);
    });
  });

  describe('Kịch bản 4: Năng suất hoàn tất đơn hàng theo địa điểm (Throughput)', () => {
    it('Thống kê chính xác số đơn đang phân bổ và đã bàn giao theo từng kho', async () => {
      const metric = await service.getFulfillmentThroughput({ locationId: testStoreId });

      expect(metric.totalFulfillmentOrders).toBe(2);
      expect(metric.byLocation.length).toBe(1);
      expect(metric.byLocation[0].locationId).toBe(testStoreId);
      expect(metric.byLocation[0].allocatedCount).toBe(1);
      expect(metric.byLocation[0].handedOverCount).toBe(1);
    });
  });

  describe('Kịch bản 5: Toàn cảnh Dashboard tổng hợp (Unified Dashboard Overview)', () => {
    it('Trả về đầy đủ 4 phân hệ thống kê thời gian thực trong một truy vấn duy nhất', async () => {
      const overview = await service.getDashboardOverview();

      expect(overview).toBeDefined();
      expect(overview.generatedAt).toBeInstanceOf(Date);
      expect(overview.firstAttemptDelivery.totalDelivered).toBeGreaterThanOrEqual(3);
      expect(overview.express2hSla.totalExpress).toBeGreaterThanOrEqual(2);
      expect(overview.codReconciliation.overallDiscrepancy).toBeGreaterThanOrEqual(500000);
      expect(overview.fulfillmentThroughput.totalFulfillmentOrders).toBeGreaterThanOrEqual(2);
    });
  });
});
