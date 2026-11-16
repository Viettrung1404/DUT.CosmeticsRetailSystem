import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FulfillmentQueueService } from '../fulfillment-queue.service';
import { AdminActionMatrixService } from '../admin-action-matrix.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';

describe('FulfillmentQueueService (EP11-T02)', () => {
  let service: FulfillmentQueueService;
  let prisma: any;
  let userDataScope: jest.Mocked<GetUserDataScopeUseCase>;
  let actionMatrix: AdminActionMatrixService;

  const storeQ10 = '11111111-1111-1111-1111-111111111111';
  const storeQ1 = '22222222-2222-2222-2222-222222222222';
  const foId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    prisma = {
      fulfillmentOrder: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    userDataScope = {
      execute: jest.fn(),
    } as any;

    actionMatrix = new AdminActionMatrixService();

    service = new FulfillmentQueueService(
      prisma as unknown as PrismaService,
      userDataScope,
      actionMatrix,
    );
  });

  const staffQ10User = {
    userId: 'staff-q10',
    roleName: 'STAFF',
    dataScope: 'STORE',
  };

  const adminUser = {
    userId: 'admin-1',
    roleName: 'ADMIN',
    dataScope: 'ALL',
  };

  it('1. AC1: Hàng đợi nhặt hàng (getPickingTasks) chỉ nạp đơn ALLOCATED thuộc kho nhân viên phụ trách (Store Q10)', async () => {
    userDataScope.execute.mockResolvedValue({
      type: 'STORE',
      storeIds: [storeQ10],
      employeeId: null,
    });

    prisma.fulfillmentOrder.count.mockResolvedValue(1);
    prisma.fulfillmentOrder.findMany.mockResolvedValue([
      {
        id: foId,
        fulfillmentOrderNumber: 'FO-20261116-0001',
        status: 'ALLOCATED',
        sourceLocationId: storeQ10,
        totalItemsCount: 2,
        shippingServiceCode: 'GHN_STANDARD',
        sourceLocation: { id: storeQ10, name: 'Showroom Q10', code: 'S_Q10' },
        order: { orderNumber: 'ORD-001', recipientName: 'Nguyễn Văn A' },
      },
    ]);

    const result = await service.getPickingTasks(staffQ10User, { page: 1, limit: 10 });

    expect(prisma.fulfillmentOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'ALLOCATED',
          sourceLocationId: { in: [storeQ10] },
        },
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].availableActions).toEqual(['START_PICKING', 'CANCEL']);
    expect(result.total).toBe(1);
  });

  it('2. Admin gọi getPickingTasks sẽ xem được toàn bộ chi nhánh (không bị lọc sourceLocationId in [...])', async () => {
    prisma.fulfillmentOrder.count.mockResolvedValue(5);
    prisma.fulfillmentOrder.findMany.mockResolvedValue([]);

    await service.getPickingTasks(adminUser, {});

    expect(prisma.fulfillmentOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'ALLOCATED',
        },
      }),
    );
  });

  it('3. Nhân viên không có quyền trên storeId được truyền trong query -> Ném 403 Forbidden', async () => {
    userDataScope.execute.mockResolvedValue({
      type: 'STORE',
      storeIds: [storeQ10],
      employeeId: null,
    });

    await expect(
      service.getPickingTasks(staffQ10User, { storeId: storeQ1 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('4. Hàng đợi đóng gói (getPackingTasks) truy vấn trạng thái PICKED', async () => {
    userDataScope.execute.mockResolvedValue({
      type: 'STORE',
      storeIds: [storeQ10],
      employeeId: null,
    });

    prisma.fulfillmentOrder.count.mockResolvedValue(1);
    prisma.fulfillmentOrder.findMany.mockResolvedValue([
      {
        id: foId,
        status: 'PICKED',
        sourceLocationId: storeQ10,
        totalItemsCount: 3,
        shippingServiceCode: 'AHAMOVE_EXPRESS',
      },
    ]);

    const result = await service.getPackingTasks(staffQ10User, {});

    expect(prisma.fulfillmentOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PICKED',
          sourceLocationId: { in: [storeQ10] },
        },
      }),
    );
    expect(result.items[0].availableActions).toEqual(['COMPLETE_PACKING']);
  });

  it('5. Hàng đợi bàn giao (getHandoverTasks) truy vấn trạng thái PACKED', async () => {
    userDataScope.execute.mockResolvedValue({
      type: 'STORE',
      storeIds: [storeQ10],
      employeeId: null,
    });

    prisma.fulfillmentOrder.count.mockResolvedValue(1);
    prisma.fulfillmentOrder.findMany.mockResolvedValue([
      {
        id: foId,
        status: 'PACKED',
        sourceLocationId: storeQ10,
        totalItemsCount: 3,
        shippingServiceCode: 'GHN_STANDARD',
      },
    ]);

    const result = await service.getHandoverTasks(staffQ10User, {});

    expect(prisma.fulfillmentOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PACKED',
          sourceLocationId: { in: [storeQ10] },
        },
      }),
    );
    expect(result.items[0].availableActions).toEqual(['CONFIRM_HANDOVER']);
  });

  it('6. getFulfillmentOrderDetail trả về chi tiết đơn kèm availableActions và actionDetails', async () => {
    prisma.fulfillmentOrder.findUnique.mockResolvedValue({
      id: foId,
      fulfillmentOrderNumber: 'FO-20261116-0001',
      status: 'ALLOCATED',
      sourceLocationId: storeQ10,
      totalItemsCount: 1,
      items: [],
      packages: [],
      shipments: [],
    });

    const result = await service.getFulfillmentOrderDetail(foId, staffQ10User);

    expect(result.id).toBe(foId);
    expect(result.availableActions).toEqual(['START_PICKING', 'CANCEL']);
    expect(result.actionDetails).toHaveLength(2);
  });

  it('7. getFulfillmentOrderDetail ném NotFoundException nếu ID không tồn tại', async () => {
    prisma.fulfillmentOrder.findUnique.mockResolvedValue(null);

    await expect(service.getFulfillmentOrderDetail(foId, staffQ10User)).rejects.toThrow(
      NotFoundException,
    );
  });
});
