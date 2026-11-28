import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentAttemptService } from '../shipment-attempt.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';
import { OUTBOX_WRITER } from '@modules/async-infrastructure';
import { NotFoundException } from '@nestjs/common';

describe('EP08-T03: ShipmentAttemptService (Delivery Attempts Tracking)', () => {
  let service: ShipmentAttemptService;
  let prisma: PrismaService;
  let orderStateAggregator: OrderStateAggregator;
  let outboxWriter: any;

  let mockShipments: Map<string, any>;
  let mockAttempts: any[];
  let mockOutbox: any[];

  beforeEach(async () => {
    mockShipments = new Map();
    mockAttempts = [];
    mockOutbox = [];

    const mockPrisma = {
      shipment: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          for (const s of mockShipments.values()) {
            if (
              where.OR?.some(
                (c: any) =>
                  (c.id && c.id === s.id) ||
                  (c.trackingCode && c.trackingCode === s.trackingCode) ||
                  (c.shipmentCode && c.shipmentCode === s.shipmentCode),
              )
            ) {
              return s;
            }
          }
          return null;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const s = mockShipments.get(where.id);
          if (s) {
            const updated = { ...s, ...data };
            mockShipments.set(where.id, updated);
            return updated;
          }
          return null;
        }),
      },
      shipmentAttempt: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const attempt = { id: `attempt-${Date.now()}-${Math.random()}`, ...data };
          mockAttempts.push(attempt);
          return attempt;
        }),
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          return mockAttempts
            .filter((a) => a.shipmentId === where.shipmentId)
            .sort((a, b) => a.attemptNumber - b.attemptNumber);
        }),
      },
    };

    const mockAggregator = {
      computeOrderStatus: jest.fn().mockResolvedValue({
        orderId: 'order-123',
        newStatus: 'SHIPPED',
        hasChanged: false,
      }),
    };

    const mockWriter = {
      record: jest.fn().mockImplementation(async (client, event) => {
        mockOutbox.push(event);
        return { id: 'outbox-1', ...event };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentAttemptService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrderStateAggregator, useValue: mockAggregator },
        { provide: OUTBOX_WRITER, useValue: mockWriter },
      ],
    }).compile();

    service = module.get<ShipmentAttemptService>(ShipmentAttemptService);
    prisma = module.get<PrismaService>(PrismaService);
    orderStateAggregator = module.get<OrderStateAggregator>(OrderStateAggregator);
    outboxWriter = module.get(OUTBOX_WRITER);
  });

  describe('AC1: Giao thất bại lần 1, 2 không làm hủy đơn hàng', () => {
    it('Lần thất bại #1: Tạo attempt #1, status=DELIVERY_FAILED, Order KHÔNG bị hủy', async () => {
      const shipment = {
        id: 'shipment-001',
        orderId: 'order-001',
        trackingCode: 'LAD-ATTEMPT-01',
        status: 'OUT_FOR_DELIVERY',
        failedAttempts: 0,
      };
      mockShipments.set(shipment.id, shipment);

      const res = await service.recordFailedAttempt(shipment.id, {
        failureReasonCode: 'CUSTOMER_UNREACHABLE',
        failureReasonDetail: 'Gọi 3 cuộc không nghe máy',
      });

      expect(res.attemptNumber).toBe(1);
      expect(res.status).toBe('DELIVERY_FAILED');
      expect(res.isRtoSuggested).toBe(false);

      const updated = mockShipments.get(shipment.id);
      expect(updated.failedAttempts).toBe(1);
      expect(updated.status).toBe('DELIVERY_FAILED');

      // Attempt recorded
      expect(mockAttempts.length).toBe(1);
      expect(mockAttempts[0].attemptNumber).toBe(1);
      expect(mockAttempts[0].failureReasonCode).toBe('CUSTOMER_UNREACHABLE');

      // OrderStateAggregator called and Order remains active (not cancelled)
      expect(orderStateAggregator.computeOrderStatus).toHaveBeenCalledWith(
        'order-001',
        expect.anything(),
      );
    });

    it('Lần thất bại #2: Tạo attempt #2, status=DELIVERY_FAILED, Order KHÔNG bị hủy', async () => {
      const shipment = {
        id: 'shipment-001',
        orderId: 'order-001',
        trackingCode: 'LAD-ATTEMPT-01',
        status: 'DELIVERY_FAILED',
        failedAttempts: 1,
      };
      mockShipments.set(shipment.id, shipment);

      const res = await service.recordFailedAttempt(shipment.id, {
        failureReasonCode: 'RESCHEDULED',
        failureReasonDetail: 'Khách hẹn lại ngày mai',
      });

      expect(res.attemptNumber).toBe(2);
      expect(res.status).toBe('DELIVERY_FAILED');
      expect(res.isRtoSuggested).toBe(false);

      const updated = mockShipments.get(shipment.id);
      expect(updated.failedAttempts).toBe(2);
      expect(updated.status).toBe('DELIVERY_FAILED');
    });

    it('Lần thất bại #3: Đạt giới hạn tối đa 3 lần -> Tự động chuyển RETURNING và kích hoạt RTO', async () => {
      const shipment = {
        id: 'shipment-001',
        orderId: 'order-001',
        trackingCode: 'LAD-ATTEMPT-01',
        status: 'DELIVERY_FAILED',
        failedAttempts: 2,
      };
      mockShipments.set(shipment.id, shipment);

      const res = await service.recordFailedAttempt(shipment.id, {
        failureReasonCode: 'CUSTOMER_REFUSED',
        failureReasonDetail: 'Khách đổi ý từ chối nhận hàng',
      });

      expect(res.attemptNumber).toBe(3);
      expect(res.status).toBe('RETURNING');
      expect(res.isRtoSuggested).toBe(true);

      const updated = mockShipments.get(shipment.id);
      expect(updated.failedAttempts).toBe(3);
      expect(updated.status).toBe('RETURNING');

      // Outbox event SHIPMENT_RETURNING_TRIGGERED emitted
      expect(mockOutbox.some((e) => e.eventType === 'SHIPMENT_RETURNING_TRIGGERED')).toBe(true);
    });
  });

  describe('Lấy lịch sử giao hàng (getAttempts)', () => {
    it('Trả về danh sách attempts sắp xếp theo attemptNumber tăng dần', async () => {
      const shipmentId = 'ship-list-123';
      mockAttempts.push(
        { id: 'att-2', shipmentId, attemptNumber: 2, attemptedAt: new Date(), failureReasonCode: 'RETRY' },
        { id: 'att-1', shipmentId, attemptNumber: 1, attemptedAt: new Date(), failureReasonCode: 'NO_ANSWER' },
      );

      const list = await service.getAttempts(shipmentId);
      expect(list.length).toBe(2);
      expect(list[0].attemptNumber).toBe(1);
      expect(list[1].attemptNumber).toBe(2);
    });
  });

  describe('Ngoại lệ khi không tìm thấy vận đơn', () => {
    it('Ném NotFoundException khi ID không tồn tại', async () => {
      await expect(
        service.recordFailedAttempt('non-existent-id', { failureReasonCode: 'UNKNOWN' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
