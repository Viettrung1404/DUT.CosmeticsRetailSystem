import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RmaWorkflowService } from '../rma-workflow.service';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../../../async-infrastructure/outbox/outbox-writer.service';
import { RefundCalculatorService } from '../refund-calculator.service';
import {
  ReturnOrderStatus,
  ReturnChannel,
} from '../../../domain/entities/return-policy.entity';

describe('RmaWorkflowService Unit Tests (Epic 19)', () => {
  let service: RmaWorkflowService;
  let prisma: any;
  let outboxWriter: any;
  let refundCalculatorService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'user-uuid-1' }),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue({ id: 'outbox-uuid-1' }),
      },
      returnOrder: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      returnStatusHistory: {
        create: jest.fn(),
      },
      shipment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      carrierClaim: {
        create: jest.fn(),
      },
      refund: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    refundCalculatorService = {
      calculateRefund: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RmaWorkflowService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxWriterService, useValue: outboxWriter },
        { provide: RefundCalculatorService, useValue: refundCalculatorService },
      ],
    }).compile();

    service = module.get<RmaWorkflowService>(RmaWorkflowService);
  });

  describe('expireStaleApprovedRmas (TC-RMA-18)', () => {
    it('1. Tự động hủy yêu cầu RMA quá 7 ngày khách không gửi hàng tại quầy', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const staleRma = {
        id: 'rma-uuid-1',
        returnCode: 'RET-STALE-1',
        customerId: 'cust-uuid-1',
        returnChannel: ReturnChannel.STORE_DROPOFF,
        status: ReturnOrderStatus.APPROVED,
        updatedAt: pastDate,
        receipts: [],
        shipments: [],
      };

      prisma.returnOrder.findMany.mockResolvedValue([staleRma]);
      prisma.returnOrder.update.mockResolvedValue({
        ...staleRma,
        status: ReturnOrderStatus.CANCELLED,
      });

      const result = await service.expireStaleApprovedRmas(7);

      expect(result.expiredCount).toBe(1);
      expect(result.expiredReturnOrders[0].id).toBe('rma-uuid-1');
      expect(prisma.returnOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rma-uuid-1' },
          data: expect.objectContaining({
            status: ReturnOrderStatus.CANCELLED,
            version: { increment: 1 },
          }),
        }),
      );
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'RMA_EXPIRED_CANCELLED',
          }),
        }),
      );
    });

    it('2. Bỏ qua hồ sơ chưa quá hạn 7 ngày', async () => {
      prisma.returnOrder.findMany.mockResolvedValue([]);
      const result = await service.expireStaleApprovedRmas(7);
      expect(result.expiredCount).toBe(0);
      expect(prisma.returnOrder.update).not.toHaveBeenCalled();
    });
  });

  describe('checkQcSlaBreaches', () => {
    it('1. Phát hiện hồ sơ đã nhận kho quá 48h chưa KCS và phát sự kiện SLA breached', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3); // 72 hours ago

      const breachedRma = {
        id: 'rma-uuid-2',
        returnCode: 'RET-SLA-BREACH-1',
        storeId: 'store-uuid-1',
        status: ReturnOrderStatus.RECEIVED,
        updatedAt: pastDate,
        receipts: [{ id: 'rcp-1', createdAt: pastDate }],
        inspections: [],
      };

      prisma.returnOrder.findMany.mockResolvedValue([breachedRma]);

      const result = await service.checkQcSlaBreaches(48);

      expect(result.breachCount).toBe(1);
      expect(result.breachedReturnOrders[0].hoursOverdue).toBeGreaterThanOrEqual(48);
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'RMA_QC_SLA_BREACHED',
          }),
        }),
      );
    });
  });

  describe('handleLostReturnPackage (TC-RMA-19)', () => {
    it('1. Ném NotFoundException nếu không tìm thấy vận đơn', async () => {
      prisma.shipment.findUnique.mockResolvedValue(null);
      await expect(service.handleLostReturnPackage('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('2. Tự động bồi thường hoàn tiền cho khách và tạo hồ sơ khiếu nại 3PL', async () => {
      const shipment = {
        id: 'shp-uuid-1',
        shipmentCode: 'SHP-RET-GHN-1',
        carrierCode: 'GHN',
        status: 'IN_TRANSIT',
        returnOrder: {
          id: 'rma-uuid-3',
          returnCode: 'RET-LOST-1',
          orderId: 'order-uuid-1',
          items: [{ id: 'ri-1', orderItemId: 'oi-1', quantity: 1, reasonCode: 'DEFECTIVE' }],
          order: {
            id: 'order-uuid-1',
            totalAmount: 300000,
            items: [{ id: 'oi-1', unitPrice: 300000 }],
            payments: [{ id: 'pm-1', amount: 300000 }],
            customer: { id: 'cust-1' },
          },
        },
      };

      prisma.shipment.findUnique.mockResolvedValue(shipment);
      refundCalculatorService.calculateRefund.mockReturnValue({
        netRefundAmount: 300000,
        totalPointsToRestore: 0,
        items: [
          {
            orderItemId: 'oi-1',
            returnItemId: 'ri-1',
            lineRefundCash: 300000,
            pointsToRestore: 0,
          },
        ],
      });

      prisma.carrierClaim.create.mockResolvedValue({
        id: 'claim-uuid-1',
        claimCode: 'CLM-001',
        claimAmount: 300000,
      });

      prisma.refund.create.mockResolvedValue({
        id: 'ref-uuid-1',
        amount: 300000,
      });

      const res = await service.handleLostReturnPackage('shp-uuid-1', {
        reason: 'GHN làm thất lạc kiện hàng',
        operatorUserId: 'admin-uuid-1',
      });

      expect(res.returnOrderId).toBe('rma-uuid-3');
      expect(res.claimId).toBe('claim-uuid-1');
      expect(res.refundId).toBe('ref-uuid-1');
      expect(res.status).toBe(ReturnOrderStatus.COMPLETED);

      expect(prisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shp-uuid-1' },
          data: expect.objectContaining({ status: 'LOST' }),
        }),
      );

      expect(prisma.carrierClaim.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            carrierCode: 'GHN',
            claimType: 'LOST_IN_TRANSIT',
            claimAmount: 300000,
          }),
        }),
      );

      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'CARRIER_CLAIM_INITIATED',
          }),
        }),
      );
    });
  });
});
