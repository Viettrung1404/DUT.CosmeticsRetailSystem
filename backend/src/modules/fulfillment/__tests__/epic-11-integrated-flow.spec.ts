import { ConflictException, ForbiddenException } from '@nestjs/common';
import { LocationScopeGuard } from '@core/guards/location-scope.guard';
import { FulfillmentQueueService } from '../application/services/fulfillment-queue.service';
import { AdminActionMatrixService } from '../application/services/admin-action-matrix.service';
import { PickingService } from '../application/services/picking.service';
import { PackingService } from '../application/services/packing.service';
import { HandoverService } from '../application/services/handover.service';
import { AuditLogService } from '@core/services/audit-log.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

describe('EPIC 11: Integrated Admin Operations Flow Test', () => {
  let locationGuard: LocationScopeGuard;
  let queueService: FulfillmentQueueService;
  let actionMatrix: AdminActionMatrixService;
  let pickingService: PickingService;
  let packingService: PackingService;
  let handoverService: HandoverService;
  let auditLogService: AuditLogService;

  let prisma: any;
  let reflector: any;
  let userDataScope: any;
  let outboxWriter: any;
  let orderStateAggregator: any;

  const storeQ10 = '11111111-1111-1111-1111-111111111111';
  const storeQ1 = '22222222-2222-2222-2222-222222222222';
  const foId = '33333333-3333-3333-3333-333333333333';
  const orderId = '44444444-4444-4444-4444-444444444444';
  const shipmentId = '55555555-5555-5555-5555-555555555555';

  const auditHistoryDb: any[] = [];

  beforeEach(() => {
    auditHistoryDb.length = 0;

    prisma = {
      fulfillmentOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      fulfillmentOrderItem: {
        update: jest.fn(),
      },
      shipment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      package: {
        create: jest.fn(),
      },
      packageItem: {
        create: jest.fn(),
      },
      shipmentPackage: {
        create: jest.fn(),
      },
      domainStatusHistory: {
        create: jest.fn().mockImplementation(({ data }) => {
          const entry = { id: `hist-${auditHistoryDb.length + 1}`, ...data, occurredAt: new Date() };
          auditHistoryDb.push(entry);
          return Promise.resolve(entry);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            auditHistoryDb.filter(
              (h) => h.entityType === where.entityType && h.entityId === where.entityId,
            ),
          );
        }),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    reflector = {
      getAllAndOverride: jest.fn(),
    };

    userDataScope = {
      execute: jest.fn(),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    orderStateAggregator = {
      computeOrderStatus: jest.fn().mockResolvedValue({ orderId, status: 'DELIVERING' }),
    };

    auditLogService = new AuditLogService(prisma as unknown as PrismaService);
    actionMatrix = new AdminActionMatrixService();
    queueService = new FulfillmentQueueService(
      prisma as unknown as PrismaService,
      userDataScope,
      actionMatrix,
    );
    locationGuard = new LocationScopeGuard(
      reflector,
      prisma as unknown as PrismaService,
      userDataScope,
    );
    pickingService = new PickingService(
      prisma as unknown as PrismaService,
      auditLogService,
    );
    packingService = new PackingService(
      prisma as unknown as PrismaService,
      outboxWriter,
      undefined,
      auditLogService,
    );
    handoverService = new HandoverService(
      prisma as unknown as PrismaService,
      outboxWriter,
      orderStateAggregator,
      auditLogService,
    );
  });

  const staffQ10 = { userId: 'staff-q10', roleName: 'STAFF', dataScope: 'STORE' };
  const staffQ1 = { userId: 'staff-q1', roleName: 'STAFF', dataScope: 'STORE' };

  it('Toàn bộ quy trình Epic 11: Scope Guard -> Queue Lọc Chi Nhánh -> Concurrency OCC Collision -> Audit Trail', async () => {
    // -------------------------------------------------------------
    // Bước 1: EP11-T01 - Location Scope Guard chặn thao tác chéo chi nhánh
    // -------------------------------------------------------------
    reflector.getAllAndOverride.mockReturnValue({ resourceType: 'FULFILLMENT_ORDER', paramName: 'id' });
    
    // Đơn hàng thuộc Showroom Q10
    prisma.fulfillmentOrder.findUnique.mockResolvedValue({
      id: foId,
      sourceLocationId: storeQ10,
    });

    // Nhân viên Q1 gọi vào đơn của Q10
    userDataScope.execute.mockResolvedValue({
      type: 'STORE',
      storeIds: [storeQ1],
      employeeId: null,
    });

    const crossBranchCtx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: staffQ1, params: { id: foId } }),
      }),
    } as any;

    await expect(locationGuard.canActivate(crossBranchCtx)).rejects.toThrow(ForbiddenException);

    // Nhân viên Q10 gọi vào đơn của Q10 -> Thành công
    userDataScope.execute.mockResolvedValue({
      type: 'STORE',
      storeIds: [storeQ10],
      employeeId: null,
    });

    const validBranchCtx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: staffQ10, params: { id: foId } }),
      }),
    } as any;

    expect(await locationGuard.canActivate(validBranchCtx)).toBe(true);

    // -------------------------------------------------------------
    // Bước 2: EP11-T02 - Nhân viên mở Hàng đợi nhặt hàng (Picking Queue)
    // -------------------------------------------------------------
    prisma.fulfillmentOrder.count.mockResolvedValue(1);
    prisma.fulfillmentOrder.findMany.mockResolvedValue([
      {
        id: foId,
        fulfillmentOrderNumber: 'FO-20261116-0001',
        status: 'ALLOCATED',
        version: 1,
        sourceLocationId: storeQ10,
        totalItemsCount: 1,
        shippingServiceCode: 'GHN_STANDARD',
        sourceLocation: { id: storeQ10, name: 'Showroom Q10' },
        order: { orderNumber: 'ORD-001', recipientName: 'Khách Hàng A' },
      },
    ]);

    const pickingTasks = await queueService.getPickingTasks(staffQ10, {});
    expect(pickingTasks.items).toHaveLength(1);
    expect(pickingTasks.items[0].availableActions).toEqual(['START_PICKING', 'CANCEL']);

    // -------------------------------------------------------------
    // Bước 3: EP11-T03 - Hai nhân viên cùng bấm "Bắt đầu nhặt hàng" (OCC Concurrency Collision)
    // -------------------------------------------------------------
    let currentFoState = {
      id: foId,
      fulfillmentOrderNumber: 'FO-20261116-0001',
      status: 'ALLOCATED',
      version: 1,
      sourceLocationId: storeQ10,
      assignedPickerId: null,
      items: [
        {
          id: 'fo-item-1',
          productVariantId: 'var-1',
          quantityRequested: 1,
        },
      ],
      reservation: {
        items: [
          {
            productVariantId: 'var-1',
            lotId: 'lot-1',
            quantity: 1,
            lot: { batchCode: 'BATCH-2026' },
          },
        ],
      },
      packages: [] as any[],
      shipments: [] as any[],
      order: { payments: [] },
    };

    prisma.fulfillmentOrder.findUnique.mockImplementation(() => Promise.resolve(currentFoState));
    prisma.fulfillmentOrder.update.mockImplementation(({ data }: any) => {
      currentFoState = {
        ...currentFoState,
        ...data,
        version: (currentFoState.version || 1) + 1,
      };
      return Promise.resolve(currentFoState);
    });

    // Nhân viên A gửi expectedVersion: 1 -> Thành công!
    const staffAResult = await pickingService.startPicking(foId, 'staff-a', 1);
    expect(staffAResult.success).toBe(true);
    expect(staffAResult.status).toBe('PICKING');
    expect(currentFoState.version).toBe(2);

    // Nhân viên B gửi expectedVersion: 1 (bị trễ hơn) -> Bị chặn 409 Conflict
    await expect(
      pickingService.startPicking(foId, 'staff-b', 1),
    ).rejects.toThrow(ConflictException);

    // -------------------------------------------------------------
    // Bước 4: Hoàn tất toàn bộ chu trình với Version tăng tuần tự
    // -------------------------------------------------------------
    // Hoàn tất nhặt hàng với expectedVersion: 2
    const completePickResult = await pickingService.completePicking(
      foId,
      {
        expectedVersion: 2,
        items: [{ variantId: 'var-1', batchCode: 'BATCH-2026', quantity: 1 }],
      },
      'staff-a',
    );
    expect(completePickResult.status).toBe('PICKED');
    expect(currentFoState.version).toBe(3);

    // Hoàn tất đóng gói với expectedVersion: 3
    prisma.shipment.create.mockResolvedValue({ id: shipmentId, shipmentCode: 'SHP-001' });
    prisma.package.create.mockResolvedValue({ id: 'pkg-1', packageCode: 'PKG-001' });

    const completePackResult = await packingService.completePacking(
      foId,
      {
        expectedVersion: 3,
        packages: [
          {
            actualWeightGrams: 500,
            lengthCm: 20,
            widthCm: 15,
            heightCm: 10,
            items: [{ productVariantId: 'var-1', quantity: 1 }],
          },
        ],
      },
      'staff-a',
    );
    expect(completePackResult.status).toBe('PACKED');
    expect(currentFoState.version).toBe(4);

    // Bàn giao 3PL với expectedVersion: 4
    currentFoState.shipments = [
      { id: shipmentId, shipmentCode: 'SHP-001', trackingCode: 'GHN-TRACK-001', status: 'READY_TO_PICK' } as any,
    ];

    const handoverResult = await handoverService.confirmHandover(
      foId,
      { expectedVersion: 4, driverName: 'Shipper GHN' },
      'staff-a',
    );
    expect(handoverResult.status).toBe('HANDED_OVER');
    expect(currentFoState.version).toBe(5);

    // -------------------------------------------------------------
    // Bước 5: EP11-T03 AC2 - Universal Audit Log lưu vết đầy đủ
    // -------------------------------------------------------------
    const histories = await auditLogService.getEntityHistory('FULFILLMENT_ORDER', foId);
    expect(histories).toHaveLength(4);

    // 4 bước chuyển đổi đã lưu vết:
    // 1. START_PICKING: ALLOCATED -> PICKING
    // 2. COMPLETE_PICKING: PICKING -> PICKED
    // 3. COMPLETE_PACKING: PICKED -> PACKED
    // 4. CONFIRM_HANDOVER: PACKED -> HANDED_OVER
    expect(histories.map((h) => h.actionPerformed)).toEqual([
      'START_PICKING',
      'COMPLETE_PICKING',
      'COMPLETE_PACKING',
      'CONFIRM_HANDOVER',
    ]);
    expect(histories.every((h) => h.actorType === 'ADMIN_USER')).toBe(true);
    expect(histories.every((h) => h.actorId === 'staff-a')).toBe(true);
  });
});
