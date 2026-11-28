import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OUTBOX_WRITER } from '@modules/async-infrastructure/outbox/outbox-writer.interface';
import {
  CodManagementService,
} from '../cod-management.service';
import {
  allocateSplitCod,
  isValidCodTransition,
} from '../../../domain/cod-status';

describe('CodManagementService (EP10-T01)', () => {
  let service: CodManagementService;
  let prisma: any;
  let outboxWriter: any;

  beforeEach(async () => {
    prisma = {
      fulfillmentOrder: {
        findUnique: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      shipment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      recordMany: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodManagementService,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_WRITER, useValue: outboxWriter },
      ],
    }).compile();

    service = module.get<CodManagementService>(CodManagementService);
  });

  describe('Pure Function allocateSplitCod (AC1 & AC2)', () => {
    it('AC1: Đơn hàng nợ 500.000đ tách làm 2 kiện (kiện 1 giá trị 300k, kiện 2 giá trị 200k) -> Kiện 1 thu đúng 300.000đ, kiện 2 thu đúng 200.000đ', () => {
      const remainingPayable = 500000;
      const packages = [
        { id: 'pkg-1', value: 300000 },
        { id: 'pkg-2', value: 200000 },
      ];

      const allocations = allocateSplitCod(remainingPayable, packages);

      expect(allocations).toHaveLength(2);
      expect(allocations[0]).toEqual({ id: 'pkg-1', codAmount: 300000 });
      expect(allocations[1]).toEqual({ id: 'pkg-2', codAmount: 200000 });

      // AC2: Tổng tiền COD luôn khớp 100% số nợ
      const totalAllocated = allocations.reduce((sum, a) => sum + a.codAmount, 0);
      expect(totalAllocated).toBe(remainingPayable);
    });

    it('AC2: Phân bổ số tiền lẻ (500.000đ chia 3 kiện bằng giá trị 200k mỗi kiện) -> Phần dư làm tròn gán vào kiện cuối, tổng khớp 100%', () => {
      const remainingPayable = 500000;
      const packages = [
        { id: 'pkg-1', value: 200000 },
        { id: 'pkg-2', value: 200000 },
        { id: 'pkg-3', value: 200000 },
      ];

      const allocations = allocateSplitCod(remainingPayable, packages);

      expect(allocations).toHaveLength(3);
      // 500000 * 200000 / 600000 = 166666.667 -> Round = 166667
      expect(allocations[0].codAmount).toBe(166667);
      expect(allocations[1].codAmount).toBe(166667);
      // Kiện 3 nhận phần còn lại: 500000 - (166667 + 166667) = 166666
      expect(allocations[2].codAmount).toBe(166666);

      const totalAllocated = allocations.reduce((sum, a) => sum + a.codAmount, 0);
      expect(totalAllocated).toBe(remainingPayable);
    });

    it('Đơn hàng nợ 1.000.000đ chia 3 kiện tỷ lệ 1:2:3 -> Khớp 100%', () => {
      const remainingPayable = 1000000;
      const packages = [
        { id: 'pkg-1', value: 100000 },
        { id: 'pkg-2', value: 200000 },
        { id: 'pkg-3', value: 300000 },
      ];

      const allocations = allocateSplitCod(remainingPayable, packages);
      const totalAllocated = allocations.reduce((sum, a) => sum + a.codAmount, 0);

      expect(totalAllocated).toBe(remainingPayable);
    });

    it('Đơn hàng đã thanh toán online (remainingPayable = 0) -> Toàn bộ kiện có codAmount = 0', () => {
      const allocations = allocateSplitCod(0, [
        { id: 'pkg-1', value: 300000 },
        { id: 'pkg-2', value: 200000 },
      ]);

      expect(allocations).toEqual([
        { id: 'pkg-1', codAmount: 0 },
        { id: 'pkg-2', codAmount: 0 },
      ]);
    });

    it('Đơn hàng có 1 kiện duy nhất -> Nhận trọn vẹn remainingPayable', () => {
      const allocations = allocateSplitCod(450000, [{ id: 'pkg-1', value: 500000 }]);
      expect(allocations).toEqual([{ id: 'pkg-1', codAmount: 450000 }]);
    });

    it('Xử lý trường hợp mảng kiện rỗng', () => {
      const allocations = allocateSplitCod(500000, []);
      expect(allocations).toEqual([]);
    });

    it('Xử lý trường hợp tất cả kiện có giá trị 0 -> Chia đều cho các kiện', () => {
      const allocations = allocateSplitCod(100000, [
        { id: 'pkg-1', value: 0 },
        { id: 'pkg-2', value: 0 },
      ]);
      expect(allocations).toEqual([
        { id: 'pkg-1', codAmount: 50000 },
        { id: 'pkg-2', codAmount: 50000 },
      ]);
    });
  });

  describe('Domain State Machine: isValidCodTransition', () => {
    it('cho phép COD_EXPECTED -> COD_COLLECTED', () => {
      expect(isValidCodTransition('COD_EXPECTED', 'COD_COLLECTED').isValid).toBe(true);
    });

    it('cho phép COD_COLLECTED -> SETTLEMENT_PENDING', () => {
      expect(isValidCodTransition('COD_COLLECTED', 'SETTLEMENT_PENDING').isValid).toBe(true);
    });

    it('cho phép SETTLEMENT_PENDING -> SETTLED', () => {
      expect(isValidCodTransition('SETTLEMENT_PENDING', 'SETTLED').isValid).toBe(true);
    });

    it('cho phép SETTLEMENT_PENDING -> SETTLEMENT_DISCREPANCY', () => {
      expect(isValidCodTransition('SETTLEMENT_PENDING', 'SETTLEMENT_DISCREPANCY').isValid).toBe(true);
    });

    it('cho phép SETTLEMENT_DISCREPANCY -> SETTLED', () => {
      expect(isValidCodTransition('SETTLEMENT_DISCREPANCY', 'SETTLED').isValid).toBe(true);
    });

    it('chặn chuyển đổi lùi không hợp lệ: SETTLED -> COD_EXPECTED', () => {
      const check = isValidCodTransition('SETTLED', 'COD_EXPECTED');
      expect(check.isValid).toBe(false);
      expect(check.reason).toBeDefined();
    });

    it('cho phép chuyển đổi idempotency (cùng trạng thái)', () => {
      expect(isValidCodTransition('COD_COLLECTED', 'COD_COLLECTED').isValid).toBe(true);
    });
  });

  describe('calculateFulfillmentOrderCod', () => {
    it('tính toán chính xác COD cho một FO khi đơn hàng bị tách 2 kho', async () => {
      const mockOrder = {
        id: 'ord-123',
        payments: [
          { paymentMethod: 'COD', status: 'PENDING', amount: new Prisma.Decimal(500000) },
        ],
        fulfillmentOrders: [
          {
            id: 'fo-1',
            items: [
              {
                quantityRequested: 1,
                orderItem: { unitPrice: new Prisma.Decimal(300000) },
              },
            ],
          },
          {
            id: 'fo-2',
            items: [
              {
                quantityRequested: 1,
                orderItem: { unitPrice: new Prisma.Decimal(200000) },
              },
            ],
          },
        ],
      };

      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        id: 'fo-1',
        orderId: 'ord-123',
        order: mockOrder,
        items: mockOrder.fulfillmentOrders[0].items,
      });

      const codFo1 = await service.calculateFulfillmentOrderCod('fo-1');
      expect(codFo1).toBe(300000);
    });

    it('trả về 0 nếu đơn hàng không có thanh toán COD đang chờ thu', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        id: 'fo-1',
        order: {
          payments: [
            { paymentMethod: 'VNPAY', status: 'COMPLETED', amount: new Prisma.Decimal(500000) },
          ],
          fulfillmentOrders: [{ id: 'fo-1', items: [] }],
        },
        items: [],
      });

      const cod = await service.calculateFulfillmentOrderCod('fo-1');
      expect(cod).toBe(0);
    });

    it('ném NotFoundException nếu FO không tồn tại', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(null);
      await expect(service.calculateFulfillmentOrderCod('unknown-fo')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('transitionCodStatus & confirmCodCollected', () => {
    it('xác nhận thu tiền mặt thành công (COD_COLLECTED) phát Outbox Event COD_COLLECTED_CONFIRMED', async () => {
      const mockShipment = {
        id: 'ship-1',
        orderId: 'ord-1',
        fulfillmentOrderId: 'fo-1',
        trackingCode: 'LAD12345',
        carrierCode: 'GHN',
        codAmount: new Prisma.Decimal(300000),
        codStatus: 'COD_EXPECTED',
      };

      prisma.shipment.findUnique.mockResolvedValue(mockShipment);
      prisma.shipment.update.mockResolvedValue({
        ...mockShipment,
        codStatus: 'COD_COLLECTED',
      });

      const result = await service.confirmCodCollected('ship-1');

      expect(prisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'ship-1' },
        data: { codStatus: 'COD_COLLECTED' },
      });
      expect(outboxWriter.record).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          aggregateType: 'SHIPMENT',
          aggregateId: 'ship-1',
          eventType: 'COD_COLLECTED_CONFIRMED',
          payload: expect.objectContaining({
            shipmentId: 'ship-1',
            codAmount: 300000,
          }),
        }),
      );
      expect(result.codStatus).toBe('COD_COLLECTED');
    });

    it('chặn cập nhật lùi trạng thái từ SETTLED về COD_EXPECTED', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        codStatus: 'SETTLED',
      });

      await expect(
        service.transitionCodStatus('ship-1', 'COD_EXPECTED'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCodSummary', () => {
    it('tổng hợp chính xác trạng thái COD của các kiện thuộc đơn hàng', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        payments: [{ paymentMethod: 'COD', status: 'PENDING', amount: new Prisma.Decimal(600000) }],
        shipments: [
          {
            id: 'ship-1',
            shipmentCode: 'S1',
            fulfillmentOrderId: 'fo-1',
            trackingCode: 'TRK1',
            carrierCode: 'GHN',
            codAmount: new Prisma.Decimal(300000),
            codStatus: 'SETTLED',
          },
          {
            id: 'ship-2',
            shipmentCode: 'S2',
            fulfillmentOrderId: 'fo-2',
            trackingCode: 'TRK2',
            carrierCode: 'GHN',
            codAmount: new Prisma.Decimal(300000),
            codStatus: 'COD_EXPECTED',
          },
        ],
      });

      const summary = await service.getCodSummary('ord-1');

      expect(summary.totalRemainingPayable).toBe(600000);
      expect(summary.totalSettled).toBe(300000);
      expect(summary.totalExpected).toBe(300000);
      expect(summary.shipments).toHaveLength(2);
    });
  });
});
