import { Test, TestingModule } from '@nestjs/testing';
import { RmaQueueService } from '../rma-queue.service';
import { RmaActionMatrixService } from '../rma-action-matrix.service';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import {
  ReturnOrderStatus,
  ReturnChannel,
} from '../../../domain/entities/return-policy.entity';
import {
  RmaQueueSortBy,
  SortOrder,
} from '../../../presentation/dtos/rma-queue.dto';

describe('RmaQueueService Unit Tests (EP18-T01)', () => {
  let service: RmaQueueService;
  let prisma: any;
  let rmaActionMatrixService: any;

  const mockReturnOrder = {
    id: 'ret-uuid-1',
    returnCode: 'RET-20261117-0001',
    status: ReturnOrderStatus.SUBMITTED,
    version: 1,
    createdAt: new Date(),
    order: { orderNumber: 'ORD-001' },
    customer: { fullName: 'Nguyen Van A', phone: '0901234567' },
    dropoffLocation: { id: 'store-1', name: 'Showroom Q1' },
    items: [],
  };

  beforeEach(async () => {
    prisma = {
      returnOrder: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([mockReturnOrder]),
      },
    };

    rmaActionMatrixService = {
      getAvailableActions: jest.fn().mockReturnValue(['APPROVE', 'REJECT', 'REQUEST_MORE_INFO']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RmaQueueService,
        { provide: PrismaService, useValue: prisma },
        { provide: RmaActionMatrixService, useValue: rmaActionMatrixService },
      ],
    }).compile();

    service = module.get<RmaQueueService>(RmaQueueService);
  });

  describe('getReviewQueue (Queue 1: CSKH Review)', () => {
    it('truy vấn danh sách hồ sơ SUBMITTED và gắn ma trận availableActions', async () => {
      const result = await service.getReviewQueue({ page: 1, limit: 10 });

      expect(prisma.returnOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ReturnOrderStatus.SUBMITTED }),
          skip: 0,
          take: 10,
        }),
      );
      expect(result.queueName).toBe('REVIEW');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].availableActions).toEqual(['APPROVE', 'REJECT', 'REQUEST_MORE_INFO']);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getDropoffQueue (Queue 2: Showroom Dropoff - AC1 Location Scope)', () => {
    it('1. Nhân viên Showroom chi nhánh chỉ thấy hồ sơ của chi nhánh mình (AC1)', async () => {
      const userContext = { userId: 'staff-1', storeId: 'store-q1-id' };
      const result = await service.getDropoffQueue({ page: 1, limit: 20 }, userContext);

      expect(prisma.returnOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ReturnOrderStatus.APPROVED,
            returnChannel: ReturnChannel.STORE_DROPOFF,
            dropoffLocationId: 'store-q1-id',
          }),
        }),
      );
      expect(result.queueName).toBe('DROPOFF');
    });

    it('2. Quản trị viên hệ thống có thể xem toàn bộ hoặc lọc theo dropoffLocationId tùy chọn', async () => {
      const adminContext = { userId: 'admin-1', role: 'ADMIN' };
      await service.getDropoffQueue(
        { page: 1, limit: 20, dropoffLocationId: 'store-q3-id' },
        adminContext,
      );

      expect(prisma.returnOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ReturnOrderStatus.APPROVED,
            returnChannel: ReturnChannel.STORE_DROPOFF,
            dropoffLocationId: 'store-q3-id',
          }),
        }),
      );
    });
  });

  describe('getInspectionQueue (Queue 3: KCS Inspection)', () => {
    it('truy vấn danh sách hồ sơ RECEIVED chờ kiểm định KCS', async () => {
      const result = await service.getInspectionQueue({ page: 1, limit: 20 });

      expect(prisma.returnOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ReturnOrderStatus.RECEIVED }),
        }),
      );
      expect(result.queueName).toBe('INSPECTION');
    });
  });

  describe('getSettlementQueue (Queue 4: Finance Settlement)', () => {
    it('truy vấn danh sách hồ sơ RESOLUTION_PENDING chờ duyệt hoàn tiền/đổi hàng', async () => {
      const result = await service.getSettlementQueue({ page: 1, limit: 20 });

      expect(prisma.returnOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ReturnOrderStatus.RESOLUTION_PENDING,
          }),
        }),
      );
      expect(result.queueName).toBe('SETTLEMENT');
    });
  });

  describe('getQueueSummary', () => {
    it('tính toán số lượng chờ xử lý trên cả 4 hàng đợi đồng thời', async () => {
      prisma.returnOrder.count
        .mockResolvedValueOnce(5)  // review
        .mockResolvedValueOnce(3)  // dropoff
        .mockResolvedValueOnce(4)  // inspection
        .mockResolvedValueOnce(2); // settlement

      const summary = await service.getQueueSummary();

      expect(summary.reviewCount).toBe(5);
      expect(summary.dropoffCount).toBe(3);
      expect(summary.inspectionCount).toBe(4);
      expect(summary.settlementCount).toBe(2);
      expect(summary.totalPending).toBe(14);
    });
  });

  describe('Sorting & Search (AC2)', () => {
    it('sắp xếp theo SLA (createdAt asc) để đưa đơn chờ lâu nhất lên đầu xử lý trước', async () => {
      await service.getReviewQueue({
        sortBy: RmaQueueSortBy.SLA,
      });

      expect(prisma.returnOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('tìm kiếm theo từ khóa text search', async () => {
      await service.getReviewQueue({
        search: 'RET-001',
      });

      expect(prisma.returnOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { returnCode: { contains: 'RET-001', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });
});
