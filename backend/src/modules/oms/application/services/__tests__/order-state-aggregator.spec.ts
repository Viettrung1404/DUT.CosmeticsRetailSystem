import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OUTBOX_WRITER } from '@modules/async-infrastructure';
import { OrderStateAggregator } from '../order-state-aggregator';

describe('OrderStateAggregator (OMS State Machine & Delivery Aggregation)', () => {
  let aggregator: OrderStateAggregator;
  let prisma: any;
  let outboxWriter: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation((args) => args.data),
        findMany: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn().mockImplementation((args) => args.data),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue({ id: 'outbox-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderStateAggregator,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_WRITER, useValue: outboxWriter },
      ],
    }).compile();

    aggregator = module.get<OrderStateAggregator>(OrderStateAggregator);
  });

  // =========================================================================
  // ACCEPTANCE CRITERIA 1: Split Order - 1st Package Delivered -> PARTIALLY_DELIVERED
  // =========================================================================
  describe('Acceptance Criteria 1: Đơn 2 kiện, Kiện 1 giao thành công', () => {
    it('phải chuyển trạng thái đơn hàng sang PARTIALLY_DELIVERED khi 1 trong 2 kiện đã DELIVERED', async () => {
      const orderId = 'order-split-123';
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'SHIPPED',
        fulfillmentOrders: [
          { id: 'fo-1', status: 'HANDED_OVER' },
          { id: 'fo-2', status: 'HANDED_OVER' },
        ],
        shipments: [
          { id: 'ship-1', status: 'DELIVERED' }, // Kiện 1 đã giao
          { id: 'ship-2', status: 'IN_TRANSIT' }, // Kiện 2 đang giao
        ],
      });

      const result = await aggregator.computeOrderStatus(orderId);

      expect(result.hasChanged).toBe(true);
      expect(result.previousStatus).toBe('SHIPPED');
      expect(result.newStatus).toBe('PARTIALLY_DELIVERED');

      // Kiểm tra cập nhật DB
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: 'PARTIALLY_DELIVERED' },
      });

      // Kiểm tra ghi lịch sử trạng thái
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          status: 'PARTIALLY_DELIVERED',
        }),
      });

      // Kiểm tra Outbox Event
      expect(outboxWriter.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          aggregateType: 'ORDER',
          aggregateId: orderId,
          eventType: 'ORDER_STATUS_CHANGED',
          payload: expect.objectContaining({
            previousStatus: 'SHIPPED',
            newStatus: 'PARTIALLY_DELIVERED',
          }),
        }),
      );
    });
  });

  // =========================================================================
  // ACCEPTANCE CRITERIA 2: Split Order - 2nd Package Delivered -> DELIVERED
  // =========================================================================
  describe('Acceptance Criteria 2: Kiện 2 giao thành công (100% Shipments DELIVERED)', () => {
    it('phải chuyển trạng thái đơn hàng sang DELIVERED khi toàn bộ kiện hàng đã DELIVERED', async () => {
      const orderId = 'order-split-123';
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'PARTIALLY_DELIVERED',
        fulfillmentOrders: [
          { id: 'fo-1', status: 'HANDED_OVER' },
          { id: 'fo-2', status: 'HANDED_OVER' },
        ],
        shipments: [
          { id: 'ship-1', status: 'DELIVERED' },
          { id: 'ship-2', status: 'DELIVERED' }, // Cả 2 kiện đều đã giao
        ],
      });

      const result = await aggregator.computeOrderStatus(orderId);

      expect(result.hasChanged).toBe(true);
      expect(result.previousStatus).toBe('PARTIALLY_DELIVERED');
      expect(result.newStatus).toBe('DELIVERED');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: 'DELIVERED' },
      });
    });
  });

  // =========================================================================
  // SCENARIO: WMS Handover (Xuất Xưởng)
  // =========================================================================
  describe('Giai đoạn bàn giao kiện hàng cho đối tác vận chuyển (Handover)', () => {
    it('phải chuyển trạng thái sang SHIPPED khi 100% FO là HANDED_OVER', async () => {
      const orderId = 'order-handover-all';
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'PROCESSING',
        fulfillmentOrders: [
          { id: 'fo-1', status: 'HANDED_OVER' },
          { id: 'fo-2', status: 'HANDED_OVER' },
        ],
        shipments: [],
      });

      const result = await aggregator.computeOrderStatus(orderId);

      expect(result.hasChanged).toBe(true);
      expect(result.newStatus).toBe('SHIPPED');
    });

    it('phải chuyển trạng thái sang PARTIALLY_SHIPPED khi 1 FO HANDED_OVER và 1 FO đang PACKING', async () => {
      const orderId = 'order-handover-partial';
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'PROCESSING',
        fulfillmentOrders: [
          { id: 'fo-1', status: 'HANDED_OVER' },
          { id: 'fo-2', status: 'PACKING' },
        ],
        shipments: [],
      });

      const result = await aggregator.computeOrderStatus(orderId);

      expect(result.hasChanged).toBe(true);
      expect(result.newStatus).toBe('PARTIALLY_SHIPPED');
    });

    it('phải chuyển sang PROCESSING khi các FO đang trong tiến trình nhặt/đóng gói', async () => {
      const orderId = 'order-picking';
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'CONFIRMED',
        fulfillmentOrders: [
          { id: 'fo-1', status: 'PICKING' },
          { id: 'fo-2', status: 'ALLOCATED' },
        ],
        shipments: [],
      });

      const result = await aggregator.computeOrderStatus(orderId);

      expect(result.hasChanged).toBe(true);
      expect(result.newStatus).toBe('PROCESSING');
    });
  });

  // =========================================================================
  // SCENARIO: DEC-03 Automatic 24h Completion
  // =========================================================================
  describe('Quy định DEC-03: Tự động hoàn tất đơn sau 24h giao thành công', () => {
    it('processAutoCompletion phải quét và chuyển trạng thái COMPLETED cho đơn DELIVERED quá 24h', async () => {
      const now = new Date('2026-11-16T12:00:00Z');
      const orderId = 'order-delivered-old';

      // Mock tìm thấy đơn DELIVERED quá 24h
      prisma.order.findMany.mockResolvedValue([{ id: orderId }]);

      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'DELIVERED',
        fulfillmentOrders: [{ id: 'fo-1', status: 'COMPLETED' }],
        shipments: [{ id: 'ship-1', status: 'DELIVERED' }],
      });

      const completedCount = await aggregator.processAutoCompletion(now);

      expect(completedCount).toBe(1);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: 'COMPLETED' },
      });
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          status: 'COMPLETED',
          note: expect.stringContaining('DEC-03'),
        }),
      });
    });
  });

  // =========================================================================
  // SCENARIO: RTO / Return Isolation (Không hủy toàn bộ đơn)
  // =========================================================================
  describe('Xử lý chuyển hoàn RTO: Không hủy toàn bộ Order khi 1 kiện bị trả về', () => {
    it('khi 1 kiện bị RETURNED và 1 kiện đã DELIVERED, Order giữ nguyên PARTIALLY_DELIVERED', async () => {
      const orderId = 'order-rto';
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'PARTIALLY_DELIVERED',
        fulfillmentOrders: [
          { id: 'fo-1', status: 'COMPLETED' },
          { id: 'fo-2', status: 'HANDED_OVER' },
        ],
        shipments: [
          { id: 'ship-1', status: 'DELIVERED' }, // Kiện 1 giao thành công
          { id: 'ship-2', status: 'RETURNED' },  // Kiện 2 bị khách từ chối nhận
        ],
      });

      const result = await aggregator.computeOrderStatus(orderId);

      // Không đổi thành CANCELLED
      expect(result.newStatus).toBe('PARTIALLY_DELIVERED');
      expect(result.hasChanged).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO: All FOs Cancelled -> Order Cancelled
  // =========================================================================
  describe('Hủy toàn bộ đơn hàng', () => {
    it('phải chuyển sang CANCELLED khi 100% FO là CANCELLED', async () => {
      const orderId = 'order-cancel-all';
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'CONFIRMED',
        fulfillmentOrders: [
          { id: 'fo-1', status: 'CANCELLED' },
          { id: 'fo-2', status: 'CANCELLED' },
        ],
        shipments: [],
      });

      const result = await aggregator.computeOrderStatus(orderId);

      expect(result.hasChanged).toBe(true);
      expect(result.newStatus).toBe('CANCELLED');
    });
  });

  // =========================================================================
  // IDEMPOTENCY & TERMINAL STATE
  // =========================================================================
  describe('Tính bất biến và Idempotency', () => {
    it('không thay đổi trạng thái và không emit event nếu trạng thái tính toán trùng trạng thái hiện tại', async () => {
      const orderId = 'order-idempotent';
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'SHIPPED',
        fulfillmentOrders: [{ id: 'fo-1', status: 'HANDED_OVER' }],
        shipments: [],
      });

      const result = await aggregator.computeOrderStatus(orderId);

      expect(result.hasChanged).toBe(false);
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(outboxWriter.record).not.toHaveBeenCalled();
    });

    it('không thay đổi trạng thái nếu đơn hàng đã ở trạng thái kết thúc (COMPLETED/CANCELLED)', async () => {
      const orderId = 'order-completed';
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'COMPLETED',
        fulfillmentOrders: [{ id: 'fo-1', status: 'COMPLETED' }],
        shipments: [{ id: 'ship-1', status: 'DELIVERED' }],
      });

      const result = await aggregator.computeOrderStatus(orderId);

      expect(result.hasChanged).toBe(false);
      expect(result.newStatus).toBe('COMPLETED');
    });

    it('ném NotFoundException nếu đơn hàng không tồn tại', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        aggregator.computeOrderStatus('non-existent-order'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
