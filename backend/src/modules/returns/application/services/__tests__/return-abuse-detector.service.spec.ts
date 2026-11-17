import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReturnAbuseDetectorService } from '../return-abuse-detector.service';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { ReturnRiskLevel } from '../../../presentation/dtos/return-abuse.dto';

describe('ReturnAbuseDetectorService Unit Tests (Epic 21)', () => {
  let service: ReturnAbuseDetectorService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      returnOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      order: {
        count: jest.fn(),
      },
      returnOrderItem: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      returnAbuseEvaluation: {
        create: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnAbuseDetectorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReturnAbuseDetectorService>(ReturnAbuseDetectorService);
  });

  describe('evaluateReturnOrder', () => {
    it('1. Ném NotFoundException nếu hồ sơ RMA không tồn tại', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue(null);
      await expect(service.evaluateReturnOrder('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('2. Đánh giá rủi ro THẤP (LOW) cho khách hàng có lịch sử mua bình thường, không vi phạm KCS', async () => {
      const rma = {
        id: 'rma-1',
        returnCode: 'RET-001',
        customerId: 'cust-clean',
        items: [{ id: 'ri-1', evidenceImages: [], evidenceVideoUrl: null, reasonCode: 'DEFECTIVE' }],
      };

      prisma.returnOrder.findUnique.mockResolvedValue(rma);
      prisma.order.count.mockResolvedValue(10); // Đã mua 10 đơn
      prisma.returnOrder.findMany.mockResolvedValue([rma]); // Chỉ mới trả 1 đơn (10%)
      prisma.returnOrderItem.count.mockResolvedValue(0); // 0 lần KCS thất bại
      prisma.returnOrderItem.findMany.mockResolvedValue([]); // Không trùng bằng chứng

      const result = await service.evaluateReturnOrder('rma-1');

      expect(result.riskScore).toBeLessThan(30);
      expect(result.riskLevel).toBe(ReturnRiskLevel.LOW);
      expect(result.isFlagged).toBe(false);
      expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
    });

    it('3. Đánh giá rủi ro CAO / CRITICAL và gắn cờ khi khách có tỷ lệ trả cao, từng bị KCS từ chối và trùng bằng chứng', async () => {
      const rma = {
        id: 'rma-abuser',
        returnCode: 'RET-ABUSE-999',
        customerId: 'cust-abuser',
        items: [
          {
            id: 'ri-abuser-1',
            evidenceImages: ['https://s3.glowup.vn/evidence/duplicate-box.jpg'],
            evidenceVideoUrl: null,
            reasonCode: 'ALLERGIC',
          },
        ],
      };

      prisma.returnOrder.findUnique.mockResolvedValue(rma);
      prisma.order.count.mockResolvedValue(4); // Mua 4 đơn
      prisma.returnOrder.findMany.mockResolvedValue([
        rma,
        { id: 'rma-old-1', createdAt: new Date(), items: [{ reasonCode: 'ALLERGIC' }] },
        { id: 'rma-old-2', createdAt: new Date(), items: [{ reasonCode: 'ALLERGIC' }] },
      ]); // 3/4 đơn trả (75% > 50%) -> +35 pts, dị ứng lặp lại -> +20 pts
      prisma.returnOrderItem.count.mockResolvedValue(2); // 2 lần bị KCS từ chối -> +50 pts
      prisma.returnOrderItem.findMany.mockResolvedValue([
        { id: 'other-item', returnOrderId: 'other-rma', returnOrder: { returnCode: 'RET-OTHER' } },
      ]); // Trùng bằng chứng -> +45 pts

      const result = await service.evaluateReturnOrder('rma-abuser');

      expect(result.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.isFlagged).toBe(true);
      expect(result.factors.length).toBeGreaterThan(0);

      expect(prisma.returnOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rma-abuser' },
          data: expect.objectContaining({
            isFraudFlagged: true,
          }),
        }),
      );

      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'RETURN_ABUSE_FLAGGED',
          }),
        }),
      );
    });
  });

  describe('getCustomerRiskProfile', () => {
    it('1. Trả về hồ sơ rủi ro của khách hàng', async () => {
      prisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        fullName: 'Nguyễn Văn A',
        returnAbuseEvaluations: [],
      });
      prisma.order.count.mockResolvedValue(5);
      prisma.returnOrder.count.mockResolvedValue(1);
      prisma.returnOrderItem.count.mockResolvedValue(0);

      const profile = await service.getCustomerRiskProfile('cust-1');

      expect(profile.customerId).toBe('cust-1');
      expect(profile.totalOrders).toBe(5);
      expect(profile.totalReturns).toBe(1);
      expect(profile.returnRatePercentage).toBe(20);
      expect(profile.isWatchlist).toBe(false);
    });
  });
});
