import { Test, TestingModule } from '@nestjs/testing';
import { AdminRmaQueueController } from '../admin-rma-queue.controller';
import { RmaQueueService } from '../../../application/services/rma-queue.service';
import { JwtAuthGuard } from '../../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../../core/guards/permission.guard';
import { LocationScopeGuard } from '../../../../../core/guards/location-scope.guard';

describe('AdminRmaQueueController Unit Tests (EP18-T01)', () => {
  let controller: AdminRmaQueueController;
  let rmaQueueService: any;

  const mockUser = { userId: 'admin-uuid-1', role: 'ADMIN', storeId: 'store-1' };
  const mockReq = { user: mockUser };

  beforeEach(async () => {
    rmaQueueService = {
      getReviewQueue: jest.fn().mockResolvedValue({
        data: [{ id: 'ret-1', status: 'SUBMITTED' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        queueName: 'REVIEW',
      }),
      getDropoffQueue: jest.fn().mockResolvedValue({
        data: [{ id: 'ret-2', status: 'APPROVED' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        queueName: 'DROPOFF',
      }),
      getInspectionQueue: jest.fn().mockResolvedValue({
        data: [{ id: 'ret-3', status: 'RECEIVED' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        queueName: 'INSPECTION',
      }),
      getSettlementQueue: jest.fn().mockResolvedValue({
        data: [{ id: 'ret-4', status: 'RESOLUTION_PENDING' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        queueName: 'SETTLEMENT',
      }),
      getQueueSummary: jest.fn().mockResolvedValue({
        reviewCount: 3,
        dropoffCount: 2,
        inspectionCount: 4,
        settlementCount: 1,
        totalPending: 10,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminRmaQueueController],
      providers: [
        { provide: RmaQueueService, useValue: rmaQueueService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(LocationScopeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminRmaQueueController>(AdminRmaQueueController);
  });

  it('1. getReviewQueue chuyển tiếp tham số query và userContext đến RmaQueueService', async () => {
    const query = { page: 1, limit: 20 };
    const result = await controller.getReviewQueue(query as any, mockReq);

    expect(rmaQueueService.getReviewQueue).toHaveBeenCalledWith(query, mockUser);
    expect(result.queueName).toBe('REVIEW');
    expect(result.data).toHaveLength(1);
  });

  it('2. getDropoffQueue chuyển tiếp tham số query và userContext đến RmaQueueService', async () => {
    const query = { page: 1, limit: 10 };
    const result = await controller.getDropoffQueue(query as any, mockReq);

    expect(rmaQueueService.getDropoffQueue).toHaveBeenCalledWith(query, mockUser);
    expect(result.queueName).toBe('DROPOFF');
  });

  it('3. getInspectionQueue chuyển tiếp tham số query và userContext đến RmaQueueService', async () => {
    const query = { page: 2, limit: 15 };
    const result = await controller.getInspectionQueue(query as any, mockReq);

    expect(rmaQueueService.getInspectionQueue).toHaveBeenCalledWith(query, mockUser);
    expect(result.queueName).toBe('INSPECTION');
  });

  it('4. getSettlementQueue chuyển tiếp tham số query và userContext đến RmaQueueService', async () => {
    const query = { page: 1, limit: 25 };
    const result = await controller.getSettlementQueue(query as any, mockReq);

    expect(rmaQueueService.getSettlementQueue).toHaveBeenCalledWith(query, mockUser);
    expect(result.queueName).toBe('SETTLEMENT');
  });

  it('5. getQueueSummary chuyển tiếp userContext đến RmaQueueService', async () => {
    const result = await controller.getQueueSummary(mockReq);

    expect(rmaQueueService.getQueueSummary).toHaveBeenCalledWith(mockUser);
    expect(result.totalPending).toBe(10);
    expect(result.reviewCount).toBe(3);
  });
});
