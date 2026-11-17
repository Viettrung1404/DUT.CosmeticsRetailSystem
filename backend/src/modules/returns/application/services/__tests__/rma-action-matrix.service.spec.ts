import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  RmaActionMatrixService,
  RmaAction,
} from '../rma-action-matrix.service';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import {
  ReturnOrderStatus,
  ReturnChannel,
} from '../../../domain/entities/return-policy.entity';

describe('RmaActionMatrixService Unit Tests (EP18-T02)', () => {
  let service: RmaActionMatrixService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      returnOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      returnStatusHistory: {
        create: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RmaActionMatrixService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RmaActionMatrixService>(RmaActionMatrixService);
  });

  describe('getAvailableActions - Dynamic Action Matrix (AC1 & AC2)', () => {
    it('1. Trạng thái SUBMITTED: chỉ cho phép APPROVE, REJECT, REQUEST_MORE_INFO (AC1)', () => {
      const actions = service.getAvailableActions({
        status: ReturnOrderStatus.SUBMITTED,
      });

      expect(actions).toEqual([
        RmaAction.APPROVE,
        RmaAction.REJECT,
        RmaAction.REQUEST_MORE_INFO,
      ]);
    });

    it('2. Trạng thái APPROVED: cho phép tiếp nhận tại quầy hoặc bưu tá thu gom tùy theo kênh', () => {
      const storeActions = service.getAvailableActions({
        status: ReturnOrderStatus.APPROVED,
        returnChannel: ReturnChannel.STORE_DROPOFF,
      });
      expect(storeActions).toEqual([RmaAction.RECEIVE_DROPOFF, RmaAction.CANCEL]);

      const pickupActions = service.getAvailableActions({
        status: ReturnOrderStatus.APPROVED,
        returnChannel: ReturnChannel.CARRIER_PICKUP,
      });
      expect(pickupActions).toEqual([RmaAction.DISPATCH_PICKUP, RmaAction.CANCEL]);
    });

    it('3. Trạng thái RECEIVED: chỉ cho phép kiểm định KCS, tuyệt đối KHÔNG cho phép REFUND hay EXCHANGE (AC2)', () => {
      const actions = service.getAvailableActions({
        status: ReturnOrderStatus.RECEIVED,
      });

      expect(actions).toEqual([
        RmaAction.START_INSPECTION,
        RmaAction.COMPLETE_INSPECTION,
      ]);
      expect(actions).not.toContain(RmaAction.CALCULATE_REFUND);
      expect(actions).not.toContain(RmaAction.CREATE_REFUND);
      expect(actions).not.toContain(RmaAction.CREATE_EXCHANGE_ORDER);
    });

    it('4. Trạng thái RESOLUTION_PENDING: cho phép hoàn tiền và quyết toán đổi hàng', () => {
      const actions = service.getAvailableActions({
        status: ReturnOrderStatus.RESOLUTION_PENDING,
      });

      expect(actions).toEqual([
        RmaAction.CALCULATE_REFUND,
        RmaAction.CREATE_REFUND,
        RmaAction.CALCULATE_EXCHANGE_QUOTE,
        RmaAction.CREATE_EXCHANGE_ORDER,
      ]);
    });

    it('5. Trạng thái đóng COMPLETED, REJECTED, CANCELLED: không còn hành động nào', () => {
      expect(
        service.getAvailableActions({ status: ReturnOrderStatus.COMPLETED }),
      ).toEqual([]);
      expect(
        service.getAvailableActions({ status: ReturnOrderStatus.REJECTED }),
      ).toEqual([]);
      expect(
        service.getAvailableActions({ status: ReturnOrderStatus.CANCELLED }),
      ).toEqual([]);
    });
  });

  describe('validateAction', () => {
    it('ném BadRequestException nếu hành động không nằm trong danh mục khả dụng', () => {
      expect(() =>
        service.validateAction(
          { status: ReturnOrderStatus.SUBMITTED },
          RmaAction.CREATE_REFUND,
        ),
      ).toThrow(BadRequestException);
    });

    it('không ném lỗi nếu hành động hợp lệ', () => {
      expect(() =>
        service.validateAction(
          { status: ReturnOrderStatus.SUBMITTED },
          RmaAction.APPROVE,
        ),
      ).not.toThrow();
    });
  });

  describe('transitionWithOcc - Optimistic Concurrency Control (AC3 & AC4)', () => {
    const mockReturn = {
      id: 'ret-1',
      returnCode: 'RET-20261117-001',
      status: ReturnOrderStatus.SUBMITTED,
      version: 1,
      rejectionReason: null,
      adminNote: null,
    };

    it('1. Chuyển trạng thái thành công, tăng version từ 1 lên 2, ghi nhận history và outbox', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue(mockReturn);
      prisma.returnOrder.update.mockResolvedValue({
        ...mockReturn,
        status: ReturnOrderStatus.APPROVED,
        version: 2,
      });

      const result = await service.transitionWithOcc('ret-1', 'admin-user-1', {
        expectedVersion: 1,
        targetStatus: ReturnOrderStatus.APPROVED,
        note: 'Duyệt yêu cầu đổi trả',
      });

      expect(result.returnOrder.status).toBe(ReturnOrderStatus.APPROVED);
      expect(result.returnOrder.version).toBe(2);
      expect(prisma.returnOrder.update).toHaveBeenCalledWith({
        where: { id: 'ret-1' },
        data: expect.objectContaining({
          status: ReturnOrderStatus.APPROVED,
          version: { increment: 1 },
          handledBy: 'admin-user-1',
        }),
      });

      // Ghi nhận ReturnStatusHistory
      expect(prisma.returnStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          returnOrderId: 'ret-1',
          status: ReturnOrderStatus.APPROVED,
          changedBy: 'admin-user-1',
        }),
      });

      // Phát sự kiện Outbox
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          aggregateType: 'RETURN_ORDER',
          eventType: 'RMA_STATUS_TRANSITIONED',
        }),
      });
    });

    it('2. Ném ConflictException (409) khi phát hiện xung đột phiên bản OCC (AC3)', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue({
        ...mockReturn,
        version: 2, // Phiên bản thực tế trong DB đã tăng lên 2 bởi người khác
      });

      await expect(
        service.transitionWithOcc('ret-1', 'admin-user-2', {
          expectedVersion: 1, // Người dùng gửi lên phiên bản cũ 1
          targetStatus: ReturnOrderStatus.REJECTED,
          reason: 'Từ chối sau khi xem ảnh',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.returnOrder.update).not.toHaveBeenCalled();
    });

    it('3. Ném NotFoundException khi không tìm thấy hồ sơ RMA', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.transitionWithOcc('non-existent-id', 'admin-user-1', {
          expectedVersion: 1,
          targetStatus: ReturnOrderStatus.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('4. Ném BadRequestException nếu chuyển trạng thái không hợp lệ trong state machine', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue(mockReturn);

      // Cố tình chuyển thẳng từ SUBMITTED sang COMPLETED
      await expect(
        service.transitionWithOcc('ret-1', 'admin-user-1', {
          expectedVersion: 1,
          targetStatus: ReturnOrderStatus.COMPLETED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
