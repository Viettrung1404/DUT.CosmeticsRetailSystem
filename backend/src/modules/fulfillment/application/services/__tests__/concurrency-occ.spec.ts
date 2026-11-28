import { ConflictException } from '@nestjs/common';
import { PickingService } from '../picking.service';
import { PackingService } from '../packing.service';
import { HandoverService } from '../handover.service';
import { AuditLogService } from '@core/services/audit-log.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

describe('Optimistic Concurrency Control (OCC) & Audit Log (EP11-T03)', () => {
  let pickingService: PickingService;
  let packingService: PackingService;
  let handoverService: HandoverService;
  let prisma: any;
  let auditLogService: jest.Mocked<AuditLogService>;
  let outboxWriter: any;
  let orderStateAggregator: any;

  const foId = '11111111-2222-3333-4444-555555555555';
  const orderId = '99999999-8888-7777-6666-555555555555';

  beforeEach(() => {
    prisma = {
      fulfillmentOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      fulfillmentOrderItem: {
        update: jest.fn(),
      },
      shipment: {
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
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    auditLogService = {
      recordTransition: jest.fn().mockResolvedValue({ id: 'audit-1' } as any),
      getEntityHistory: jest.fn(),
    } as any;

    outboxWriter = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    orderStateAggregator = {
      computeOrderStatus: jest.fn().mockResolvedValue({ orderId, status: 'DELIVERING' }),
    };

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

  describe('AC1: Concurrency Collision Protection (Hai nhân viên bấm cùng lúc)', () => {
    it('1. Nhân viên 1 gửi expectedVersion = 1 -> Thành công và version tăng lên 2', async () => {
      // Đơn hàng ban đầu có version = 1
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        id: foId,
        fulfillmentOrderNumber: 'FO-001',
        status: 'ALLOCATED',
        version: 1,
        assignedPickerId: null,
      });

      prisma.fulfillmentOrder.update.mockResolvedValue({
        id: foId,
        status: 'PICKING',
        version: 2,
        assignedPickerId: 'picker-01',
      });

      const result = await pickingService.startPicking(foId, 'picker-01', 1);

      expect(result.success).toBe(true);
      expect(result.status).toBe('PICKING');
      expect(prisma.fulfillmentOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PICKING',
            version: { increment: 1 },
          }),
        }),
      );

      // AC2: Kiểm tra đã ghi Universal Audit Log
      expect(auditLogService.recordTransition).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entityType: 'FULFILLMENT_ORDER',
          entityId: foId,
          fromStatus: 'ALLOCATED',
          toStatus: 'PICKING',
          action: 'START_PICKING',
          actorId: 'picker-01',
        }),
      );
    });

    it('2. Nhân viên 2 cũng gửi expectedVersion = 1 (khi đơn đã lên version 2) -> Bị chặn với mã lỗi 409 Conflict (CONCURRENT_MODIFICATION_DETECTED)', async () => {
      // Sau khi nhân viên 1 cập nhật, đơn hàng trong database hiện đã là version = 2
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        id: foId,
        fulfillmentOrderNumber: 'FO-001',
        status: 'PICKING',
        version: 2,
        assignedPickerId: 'picker-01',
      });

      // Nhân viên 2 bấm sau với expectedVersion cũ (1)
      try {
        await pickingService.startPicking(foId, 'picker-02', 1);
        fail('Cần ném ConflictException nhưng không ném');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ConflictException);
        const response = error.getResponse();
        expect(response.statusCode).toBe(409);
        expect(response.errorCode).toBe('CONCURRENT_MODIFICATION_DETECTED');
      }

      // Đảm bảo không gọi update lần 2
      expect(prisma.fulfillmentOrder.update).not.toHaveBeenCalled();
    });
  });

  describe('OCC trên các nghiệp vụ tiếp theo (completePicking, completePacking, confirmHandover)', () => {
    it('3. completePicking phát hiện sai expectedVersion -> Ném 409 Conflict', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        id: foId,
        status: 'PICKING',
        version: 3,
        reservation: { items: [] },
      });

      await expect(
        pickingService.completePicking(foId, { items: [], expectedVersion: 2 }, 'staff-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('4. completePacking phát hiện sai expectedVersion -> Ném 409 Conflict', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        id: foId,
        status: 'PICKED',
        version: 4,
        order: { payments: [] },
      });

      await expect(
        packingService.completePacking(foId, { packages: [], expectedVersion: 3 }, 'staff-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('5. confirmHandover phát hiện sai expectedVersion -> Ném 409 Conflict', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        id: foId,
        status: 'PACKED',
        version: 5,
        shipments: [],
      });

      await expect(
        handoverService.confirmHandover(foId, { expectedVersion: 4 }, 'staff-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
