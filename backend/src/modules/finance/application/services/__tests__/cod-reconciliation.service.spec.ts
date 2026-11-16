import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OUTBOX_WRITER } from '@modules/async-infrastructure/outbox/outbox-writer.interface';
import { CodReconciliationService } from '../cod-reconciliation.service';
import { ReconcileBatchDto } from '../../../presentation/dtos/cod-reconciliation.dto';

describe('CodReconciliationService (EP10-T02)', () => {
  let service: CodReconciliationService;
  let prisma: any;
  let outboxWriter: any;

  beforeEach(async () => {
    prisma = {
      codReconciliation: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      codReconciliationItem: {
        create: jest.fn(),
      },
      shipment: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (arg) => {
        if (typeof arg === 'function') {
          return arg(prisma);
        }
        return Promise.all(arg);
      }),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      recordMany: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodReconciliationService,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_WRITER, useValue: outboxWriter },
      ],
    }).compile();

    service = module.get<CodReconciliationService>(CodReconciliationService);
  });

  describe('reconcileBatch', () => {
    it('AC1: Đối tác thu thiếu 10.000đ -> Đánh dấu DISCREPANCY kèm số tiền lệch rõ ràng và gắn cờ DISCREPANCY_FLAGGED', async () => {
      // Giả lập Shipment có codAmount = 300.000đ
      const mockShipment = {
        id: 'ship-1',
        shipmentCode: 'SHIP-001',
        trackingCode: 'LAD12345',
        codAmount: new Prisma.Decimal(300000),
        codStatus: 'COD_COLLECTED',
      };

      prisma.codReconciliation.findUnique.mockResolvedValue(null);
      prisma.shipment.findMany.mockResolvedValue([mockShipment]);

      prisma.codReconciliation.create.mockImplementation(({ data }: any) => ({
        id: 'rec-1',
        ...data,
        createdAt: new Date(),
      }));

      prisma.codReconciliationItem.create.mockImplementation(({ data }: any) => ({
        id: 'rec-item-1',
        ...data,
      }));

      // Bảng kê đối tác trả 290.000đ (thiếu 10.000đ)
      const dto: ReconcileBatchDto = {
        reconciliationCode: 'REC-GHN-20261116-01',
        carrierCode: 'GHN',
        reconciliationDate: '2026-11-16',
        items: [
          {
            trackingCode: 'LAD12345',
            carrierPaidCodAmount: 290000,
            carrierFeeCharged: 22000,
          },
        ],
      };

      const result = await service.reconcileBatch(dto, 'user-admin-1');

      // AC1: Kiểm chứng kết quả đánh dấu DISCREPANCY
      expect(result.status).toBe('DISCREPANCY_FLAGGED');
      expect(result.differenceAmount).toBe(10000);
      expect(result.discrepancyCount).toBe(1);
      expect(result.matchedCount).toBe(0);

      expect(result.items[0]).toEqual(
        expect.objectContaining({
          trackingCode: 'LAD12345',
          declaredCodAmount: 300000,
          carrierPaidCodAmount: 290000,
          discrepancyAmount: 10000,
          status: 'DISCREPANCY',
        }),
      );

      // Cập nhật shipment sang SETTLEMENT_DISCREPANCY
      expect(prisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'ship-1' },
        data: { codStatus: 'SETTLEMENT_DISCREPANCY' },
      });

      // Phát outbox event
      expect(outboxWriter.record).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          aggregateType: 'COD_RECONCILIATION',
          eventType: 'COD_RECONCILIATION_COMPLETED',
          payload: expect.objectContaining({
            reconciliationCode: 'REC-GHN-20261116-01',
            status: 'DISCREPANCY_FLAGGED',
            differenceAmount: 10000,
          }),
        }),
      );
    });

    it('AC2: Bảng kê khớp 100% tự động chuyển trạng thái hoàn tất đối soát (APPROVED & SETTLED)', async () => {
      const mockShipment1 = {
        id: 'ship-1',
        shipmentCode: 'SHIP-001',
        trackingCode: 'LAD111',
        codAmount: new Prisma.Decimal(300000),
        codStatus: 'COD_COLLECTED',
      };
      const mockShipment2 = {
        id: 'ship-2',
        shipmentCode: 'SHIP-002',
        trackingCode: 'LAD222',
        codAmount: new Prisma.Decimal(200000),
        codStatus: 'COD_COLLECTED',
      };

      prisma.codReconciliation.findUnique.mockResolvedValue(null);
      prisma.shipment.findMany.mockResolvedValue([mockShipment1, mockShipment2]);

      prisma.codReconciliation.create.mockImplementation(({ data }: any) => ({
        id: 'rec-2',
        ...data,
        createdAt: new Date(),
      }));

      prisma.codReconciliationItem.create.mockImplementation(({ data }: any) => ({
        id: 'item-id',
        ...data,
      }));

      const dto: ReconcileBatchDto = {
        reconciliationCode: 'REC-GHN-20261116-MATCHED',
        carrierCode: 'GHN',
        reconciliationDate: '2026-11-16',
        items: [
          {
            trackingCode: 'LAD111',
            carrierPaidCodAmount: 300000,
            carrierFeeCharged: 22000,
          },
          {
            trackingCode: 'LAD222',
            carrierPaidCodAmount: 200000,
            carrierFeeCharged: 22000,
          },
        ],
      };

      const result = await service.reconcileBatch(dto, 'user-admin-1');

      // AC2: Khớp 100% -> APPROVED
      expect(result.status).toBe('APPROVED');
      expect(result.differenceAmount).toBe(0);
      expect(result.matchedCount).toBe(2);
      expect(result.discrepancyCount).toBe(0);
      expect(result.totalCodDeclared).toBe(500000);
      expect(result.totalCodReceived).toBe(500000);

      // Cả 2 shipment đều chuyển sang SETTLED
      expect(prisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'ship-1' },
        data: { codStatus: 'SETTLED' },
      });
      expect(prisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'ship-2' },
        data: { codStatus: 'SETTLED' },
      });
    });

    it('chặn nhập bảng kê trùng mã kỳ đối soát (Idempotency / Concurrency Guard)', async () => {
      prisma.codReconciliation.findUnique.mockResolvedValue({
        id: 'rec-existing',
        reconciliationCode: 'REC-GHN-DUPLICATE',
      });

      const dto: ReconcileBatchDto = {
        reconciliationCode: 'REC-GHN-DUPLICATE',
        carrierCode: 'GHN',
        reconciliationDate: '2026-11-16',
        items: [
          {
            trackingCode: 'LAD111',
            carrierPaidCodAmount: 100000,
          },
        ],
      };

      await expect(service.reconcileBatch(dto)).rejects.toThrow(ConflictException);
    });

    it('ném BadRequestException nếu danh sách bưu kiện đối soát rỗng', async () => {
      const dto: ReconcileBatchDto = {
        reconciliationCode: 'REC-EMPTY',
        carrierCode: 'GHN',
        reconciliationDate: '2026-11-16',
        items: [],
      };

      await expect(service.reconcileBatch(dto)).rejects.toThrow(BadRequestException);
    });

    it('ném NotFoundException nếu bưu kiện có mã trackingCode không tồn tại trong hệ thống', async () => {
      prisma.codReconciliation.findUnique.mockResolvedValue(null);
      prisma.shipment.findMany.mockResolvedValue([]); // Không tìm thấy shipment nào

      const dto: ReconcileBatchDto = {
        reconciliationCode: 'REC-GHN-UNKNOWN-TRK',
        carrierCode: 'GHN',
        reconciliationDate: '2026-11-16',
        items: [
          {
            trackingCode: 'NON_EXISTENT_TRACKING',
            carrierPaidCodAmount: 100000,
          },
        ],
      };

      await expect(service.reconcileBatch(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReconciliation', () => {
    it('truy vấn thông tin chi tiết bảng kê kèm danh sách bưu kiện', async () => {
      prisma.codReconciliation.findUnique.mockResolvedValue({
        id: 'rec-1',
        reconciliationCode: 'REC-001',
        carrierCode: 'GHN',
        reconciliationDate: new Date('2026-11-16'),
        totalCodDeclared: new Prisma.Decimal(500000),
        totalCodReceived: new Prisma.Decimal(500000),
        differenceAmount: new Prisma.Decimal(0),
        status: 'APPROVED',
        bankStatementRef: 'FT123',
        createdAt: new Date(),
        items: [
          {
            id: 'item-1',
            shipmentId: 'ship-1',
            declaredCodAmount: new Prisma.Decimal(500000),
            carrierPaidCodAmount: new Prisma.Decimal(500000),
            discrepancyAmount: new Prisma.Decimal(0),
            carrierFeeCharged: new Prisma.Decimal(22000),
            status: 'MATCHED',
            shipment: {
              shipmentCode: 'SHIP-1',
              trackingCode: 'TRK-1',
            },
          },
        ],
      });

      const res = await service.getReconciliation('rec-1');
      expect(res.reconciliationCode).toBe('REC-001');
      expect(res.matchedCount).toBe(1);
      expect(res.discrepancyCount).toBe(0);
      expect(res.items).toHaveLength(1);
    });

    it('ném NotFoundException khi không tìm thấy ID', async () => {
      prisma.codReconciliation.findUnique.mockResolvedValue(null);
      await expect(service.getReconciliation('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listReconciliations', () => {
    it('trả về danh sách bảng kê đối soát có phân trang', async () => {
      prisma.codReconciliation.findMany.mockResolvedValue([
        {
          id: 'rec-1',
          reconciliationCode: 'REC-001',
          carrierCode: 'GHN',
          reconciliationDate: new Date('2026-11-16'),
          totalCodDeclared: new Prisma.Decimal(300000),
          totalCodReceived: new Prisma.Decimal(300000),
          differenceAmount: new Prisma.Decimal(0),
          status: 'APPROVED',
          bankStatementRef: null,
          createdAt: new Date(),
          items: [{ status: 'MATCHED' }],
        },
      ]);
      prisma.codReconciliation.count.mockResolvedValue(1);

      const res = await service.listReconciliations({ page: 1, limit: 10 });
      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].reconciliationCode).toBe('REC-001');
    });
  });
});
