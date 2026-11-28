import { Test, TestingModule } from '@nestjs/testing';
import { LogisticsDashboardService } from '../logistics-dashboard.service';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';

describe('LogisticsDashboardService Unit Tests (Epic 20)', () => {
  let service: LogisticsDashboardService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      shipment: {
        findMany: jest.fn(),
      },
      fulfillmentOrder: {
        findMany: jest.fn(),
      },
      store: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogisticsDashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LogisticsDashboardService>(LogisticsDashboardService);
  });

  describe('getFirstAttemptDeliveryRate', () => {
    it('1. Tính đúng tỷ lệ giao thành công lần đầu 75% khi 3/4 đơn không thất bại lần nào', async () => {
      prisma.shipment.findMany.mockResolvedValue([
        { id: 's1', failedAttempts: 0 },
        { id: 's2', failedAttempts: 0 },
        { id: 's3', failedAttempts: 0 },
        { id: 's4', failedAttempts: 1 },
      ]);

      const result = await service.getFirstAttemptDeliveryRate();

      expect(result.totalDelivered).toBe(4);
      expect(result.firstAttemptSuccessCount).toBe(3);
      expect(result.multiAttemptCount).toBe(1);
      expect(result.firstAttemptRatePercentage).toBe(75);
    });

    it('2. Trả về 100% nếu chưa có đơn nào được giao', async () => {
      prisma.shipment.findMany.mockResolvedValue([]);
      const result = await service.getFirstAttemptDeliveryRate();
      expect(result.totalDelivered).toBe(0);
      expect(result.firstAttemptRatePercentage).toBe(100);
    });
  });

  describe('getExpressSlaMetrics', () => {
    it('1. Tính tỷ lệ vi phạm SLA giao hỏa tốc 2H khi vượt quá 120 phút', async () => {
      const now = new Date();
      const createdAtOnTime = new Date(now.getTime() - 60 * 60 * 1000); // 60 mins ago
      const deliveredAtOnTime = new Date(now.getTime());

      const createdAtBreached = new Date(now.getTime() - 180 * 60 * 1000); // 180 mins ago
      const deliveredAtBreached = new Date(now.getTime());

      prisma.shipment.findMany.mockResolvedValue([
        {
          id: 'exp-1',
          status: 'DELIVERED',
          createdAt: createdAtOnTime,
          deliveredAt: deliveredAtOnTime,
        },
        {
          id: 'exp-2',
          status: 'DELIVERED',
          createdAt: createdAtBreached,
          deliveredAt: deliveredAtBreached,
        },
      ]);

      const result = await service.getExpressSlaMetrics();

      expect(result.totalExpress).toBe(2);
      expect(result.onTimeCount).toBe(1);
      expect(result.breachedCount).toBe(1);
      expect(result.breachRatePercentage).toBe(50);
      expect(result.onTimeRatePercentage).toBe(50);
    });
  });

  describe('getCodReconciliationHeatmap', () => {
    it('1. Tính đúng số liệu đối soát và sai lệch COD theo từng hãng vận chuyển', async () => {
      prisma.shipment.findMany.mockResolvedValue([
        {
          carrierCode: 'GHN',
          codAmount: 500000,
          codStatus: 'COD_COLLECTED',
          status: 'DELIVERED',
        },
        {
          carrierCode: 'GHN',
          codAmount: 300000,
          codStatus: 'COD_RECONCILED',
          status: 'DELIVERED',
        },
      ]);

      const result = await service.getCodReconciliationHeatmap();

      expect(result.totalCodExpected).toBe(800000);
      expect(result.totalCodCollected).toBe(800000);
      expect(result.totalCodReconciled).toBe(300000);
      expect(result.overallDiscrepancy).toBe(500000); // 800k - 300k = 500k lệch chưa đối soát
      expect(result.byCarrier.length).toBe(1);
      expect(result.byCarrier[0].carrierCode).toBe('GHN');
    });
  });

  describe('getFulfillmentThroughput', () => {
    it('1. Thống kê năng suất hoàn tất đơn hàng theo từng kho', async () => {
      prisma.store.findMany.mockResolvedValue([
        { id: 'wh-1', code: 'WH-TB', name: 'Tổng kho Tân Bình', type: 'WAREHOUSE' },
      ]);
      prisma.fulfillmentOrder.findMany.mockResolvedValue([
        { sourceLocationId: 'wh-1', status: 'ALLOCATED' },
        { sourceLocationId: 'wh-1', status: 'PACKED' },
        { sourceLocationId: 'wh-1', status: 'HANDED_OVER' },
      ]);

      const result = await service.getFulfillmentThroughput();

      expect(result.totalFulfillmentOrders).toBe(3);
      expect(result.byLocation.length).toBe(1);
      expect(result.byLocation[0].locationCode).toBe('WH-TB');
      expect(result.byLocation[0].allocatedCount).toBe(1);
      expect(result.byLocation[0].packedCount).toBe(1);
      expect(result.byLocation[0].handedOverCount).toBe(1);
    });
  });

  describe('getDashboardOverview', () => {
    it('1. Tổng hợp toàn cảnh Dashboard đầy đủ 4 phân hệ', async () => {
      prisma.shipment.findMany.mockResolvedValue([]);
      prisma.fulfillmentOrder.findMany.mockResolvedValue([]);
      prisma.store.findMany.mockResolvedValue([]);

      const overview = await service.getDashboardOverview();

      expect(overview).toBeDefined();
      expect(overview.firstAttemptDelivery).toBeDefined();
      expect(overview.express2hSla).toBeDefined();
      expect(overview.codReconciliation).toBeDefined();
      expect(overview.fulfillmentThroughput).toBeDefined();
    });
  });
});
