import { AuditLogService } from '../audit-log.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

describe('AuditLogService (EP11-T03)', () => {
  let service: AuditLogService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      domainStatusHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    service = new AuditLogService(prisma as unknown as PrismaService);
  });

  const foId = '11111111-2222-3333-4444-555555555555';

  it('1. recordTransition ghi nhận chính xác lịch sử chuyển trạng thái vào bảng domain_status_histories (AC2)', async () => {
    const mockEntry = {
      id: 'history-1',
      entityType: 'FULFILLMENT_ORDER',
      entityId: foId,
      fromStatus: 'ALLOCATED',
      toStatus: 'PICKING',
      actionPerformed: 'START_PICKING',
      actorType: 'ADMIN_USER',
      actorId: 'picker-01',
      occurredAt: new Date(),
    };
    prisma.domainStatusHistory.create.mockResolvedValue(mockEntry);

    const result = await service.recordTransition(undefined, {
      entityType: 'FULFILLMENT_ORDER',
      entityId: foId,
      fromStatus: 'ALLOCATED',
      toStatus: 'PICKING',
      action: 'START_PICKING',
      actorId: 'picker-01',
    });

    expect(result).toBe(mockEntry);
    expect(prisma.domainStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'FULFILLMENT_ORDER',
        entityId: foId,
        fromStatus: 'ALLOCATED',
        toStatus: 'PICKING',
        actionPerformed: 'START_PICKING',
        actorType: 'ADMIN_USER',
        actorId: 'picker-01',
      }),
    });
  });

  it('2. recordTransition tự động gán SYSTEM_WORKER khi không có actorId', async () => {
    prisma.domainStatusHistory.create.mockResolvedValue({ id: 'history-2' });

    await service.recordTransition(undefined, {
      entityType: 'FULFILLMENT_ORDER',
      entityId: foId,
      fromStatus: 'PENDING_ALLOCATION',
      toStatus: 'ALLOCATED',
      action: 'ALLOCATE_INVENTORY',
    });

    expect(prisma.domainStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'SYSTEM_WORKER',
        actorId: null,
      }),
    });
  });

  it('3. getEntityHistory truy vấn lịch sử sắp xếp giảm dần theo thời gian (occurredAt desc)', async () => {
    prisma.domainStatusHistory.findMany.mockResolvedValue([]);

    await service.getEntityHistory('FULFILLMENT_ORDER', foId);

    expect(prisma.domainStatusHistory.findMany).toHaveBeenCalledWith({
      where: {
        entityType: 'FULFILLMENT_ORDER',
        entityId: foId,
      },
      orderBy: {
        occurredAt: 'desc',
      },
    });
  });
});
