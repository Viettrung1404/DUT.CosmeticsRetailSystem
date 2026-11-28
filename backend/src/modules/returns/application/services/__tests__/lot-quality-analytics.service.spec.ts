import { Test, TestingModule } from '@nestjs/testing';
import { LotQualityAnalyticsService } from '../lot-quality-analytics.service';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../../../async-infrastructure/outbox/outbox-writer.service';

describe('LotQualityAnalyticsService', () => {
  let service: LotQualityAnalyticsService;
  let prisma: any;
  let outboxWriter: any;

  beforeEach(async () => {
    prisma = {
      inventoryLot: {
        findMany: jest.fn(),
      },
      returnOrderItem: {
        findMany: jest.fn(),
      },
      shipment: {
        findMany: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
    };

    outboxWriter = {
      write: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LotQualityAnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxWriterService, useValue: outboxWriter },
      ],
    }).compile();

    service = module.get<LotQualityAnalyticsService>(LotQualityAnalyticsService);
  });

  describe('getLotQualityReport', () => {
    it('Lô hàng có chất lượng tốt: Tỷ lệ lỗi 0% -> Trả về NORMAL, không kích hoạt cảnh báo', async () => {
      const mockLot = {
        id: 'lot-1',
        batchCode: 'BATCH-2026-001',
        productVariantId: 'var-1',
        locationId: 'loc-1',
        expiryDate: new Date('2027-12-31'),
        quantityOnHand: 100,
        quantityReserved: 10,
        variant: {
          sku: 'SKU-SERUM-01',
          product: { name: 'Serum GlowUp Vitamin C' },
        },
        location: { id: 'loc-1', name: 'Tổng kho Tân Bình' },
        inventoryDispositions: [],
        reservationItems: [
          { quantity: 50, reservation: { status: 'COMMITTED' } },
        ],
      };

      prisma.inventoryLot.findMany.mockResolvedValue([mockLot]);
      prisma.returnOrderItem.findMany.mockResolvedValue([]);

      const result = await service.getLotQualityReport({
        thresholdPercent: 5.0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].batchCode).toBe('BATCH-2026-001');
      expect(result[0].defectRatePercentage).toBe(0);
      expect(result[0].isAlertTriggered).toBe(false);
      expect(result[0].alertSeverity).toBe('NORMAL');
      expect(result[0].recommendedAction).toBe('NORMAL');
      expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
    });

    it('Lô hàng có tỷ lệ lỗi vượt ngưỡng (20% >= 5%): Kích hoạt cảnh báo LOT_DEFECT_ALERT & QUARANTINE_LOT_IMMEDIATELY', async () => {
      const mockLot = {
        id: 'lot-bad',
        batchCode: 'BATCH-2026-BAD',
        productVariantId: 'var-bad',
        locationId: 'loc-1',
        expiryDate: new Date('2027-06-30'),
        quantityOnHand: 40,
        quantityReserved: 10,
        variant: {
          sku: 'SKU-CREAM-BAD',
          product: { name: 'Kem Dưỡng Retinol Phục Hồi' },
        },
        location: { id: 'loc-1', name: 'Tổng kho Tân Bình' },
        inventoryDispositions: [
          {
            quantity: 20,
            dispositionType: 'SCRAP',
            returnItem: { inspectionStatus: 'FAILED', reasonCode: 'DEFECTIVE' },
          },
        ],
        reservationItems: [
          { quantity: 100, reservation: { status: 'COMMITTED' } },
        ],
      };

      prisma.inventoryLot.findMany.mockResolvedValue([mockLot]);
      prisma.outboxEvent.create.mockResolvedValue({ id: 'evt-alert-1' });

      const result = await service.getLotQualityReport({
        thresholdPercent: 5.0,
        minReturns: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].batchCode).toBe('BATCH-2026-BAD');
      expect(result[0].defectiveQuantity).toBe(20);
      expect(result[0].defectRatePercentage).toBe(20.0);
      expect(result[0].isAlertTriggered).toBe(true);
      expect(result[0].alertSeverity).toBe('CRITICAL');
      expect(result[0].recommendedAction).toBe('QUARANTINE_LOT_IMMEDIATELY');
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aggregateType: 'INVENTORY_LOT',
            aggregateId: 'lot-bad',
            eventType: 'LOT_DEFECT_ALERT',
          }),
        }),
      );
    });
  });

  describe('getReturnReasonBreakdown', () => {
    it('Phân rã cơ cấu lý do trả hàng và tính tỷ lệ phần trăm chính xác', async () => {
      const mockReturnItems = [
        {
          id: 'item-1',
          reasonCode: 'CHANGE_OF_MIND',
          quantity: 3,
          refundAmountPerUnit: '100000',
        },
        {
          id: 'item-2',
          reasonCode: 'DEFECTIVE',
          quantity: 2,
          refundAmountPerUnit: '200000',
        },
        {
          id: 'item-3',
          reasonCode: 'DAMAGED_IN_TRANSIT',
          quantity: 5,
          refundAmountPerUnit: '150000',
        },
      ];

      prisma.returnOrderItem.findMany.mockResolvedValue(mockReturnItems);

      const result = await service.getReturnReasonBreakdown({});

      expect(result.totalReturns).toBe(10);
      // Total value = 3 * 100k + 2 * 200k + 5 * 150k = 300k + 400k + 750k = 1,450,000
      expect(result.totalRefundValue).toBe(1450000);
      expect(result.reasons).toHaveLength(3);

      // Sắp xếp giảm dần theo số lượng -> DAMAGED_IN_TRANSIT (5 = 50%) đầu tiên
      expect(result.reasons[0].reasonCode).toBe('DAMAGED_IN_TRANSIT');
      expect(result.reasons[0].count).toBe(5);
      expect(result.reasons[0].percentage).toBe(50.0);

      expect(result.reasons[1].reasonCode).toBe('CHANGE_OF_MIND');
      expect(result.reasons[1].count).toBe(3);
      expect(result.reasons[1].percentage).toBe(30.0);

      expect(result.reasons[2].reasonCode).toBe('DEFECTIVE');
      expect(result.reasons[2].count).toBe(2);
      expect(result.reasons[2].percentage).toBe(20.0);
    });
  });

  describe('getCarrierDamageComparison', () => {
    it('So sánh tỷ lệ hư hại hàng bể vỡ giữa các hãng vận chuyển GHN và AHAMOVE', async () => {
      const mockShipments = [
        { id: 'ship-1', orderId: 'ord-1', carrierCode: 'GHN', status: 'DELIVERED' },
        { id: 'ship-2', orderId: 'ord-2', carrierCode: 'GHN', status: 'DELIVERED' },
        { id: 'ship-3', orderId: 'ord-3', carrierCode: 'GHN', status: 'DELIVERED' },
        { id: 'ship-4', orderId: 'ord-4', carrierCode: 'AHAMOVE', status: 'DELIVERED' },
      ];

      const mockDamagedItems = [
        {
          id: 'ret-item-1',
          quantity: 1,
          returnOrder: { id: 'ret-1', orderId: 'ord-1' }, // GHN
        },
      ];

      prisma.shipment.findMany.mockResolvedValue(mockShipments);
      prisma.returnOrderItem.findMany.mockResolvedValue(mockDamagedItems);

      const result = await service.getCarrierDamageComparison({});

      expect(result.carriers).toBeDefined();
      const ghn = result.carriers.find((c) => c.carrierCode === 'GHN');
      const ahamove = result.carriers.find((c) => c.carrierCode === 'AHAMOVE');

      expect(ghn).toBeDefined();
      expect(ghn?.totalDeliveredShipments).toBe(3);
      expect(ghn?.damagedReturnsCount).toBe(1);
      // 1 / 3 = 33.33%
      expect(ghn?.damageRatePercentage).toBe(33.33);

      expect(ahamove).toBeDefined();
      expect(ahamove?.totalDeliveredShipments).toBe(1);
      expect(ahamove?.damagedReturnsCount).toBe(0);
      expect(ahamove?.damageRatePercentage).toBe(0);
    });
  });
});
