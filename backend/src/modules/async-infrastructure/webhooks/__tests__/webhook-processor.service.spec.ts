import { Test, TestingModule } from '@nestjs/testing';
import {
  WebhookProcessorService,
  isValidShipmentTransition,
} from '../webhook-processor.service';
import { WebhookInboxService } from '../webhook-inbox.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';
import { OUTBOX_WRITER } from '../../outbox/outbox-writer.interface';

describe('EP08-T02: WebhookProcessorService (State Transition Pipeline)', () => {
  let service: WebhookProcessorService;
  let inboxService: WebhookInboxService;
  let prisma: PrismaService;
  let orderStateAggregator: OrderStateAggregator;
  let outboxWriter: any;

  // In-memory mocks
  let mockShipments: Map<string, any>;
  let mockInboxes: Map<string, any>;
  let mockEvents: any[];
  let mockOutbox: any[];

  beforeEach(async () => {
    mockShipments = new Map();
    mockInboxes = new Map();
    mockEvents = [];
    mockOutbox = [];

    const mockPrisma = {
      shippingWebhookInbox: {
        findUnique: jest.fn().mockImplementation(async ({ where }) => {
          return mockInboxes.get(where.id) || null;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const item = mockInboxes.get(where.id);
          if (item) {
            const updated = { ...item, ...data };
            mockInboxes.set(where.id, updated);
            return updated;
          }
          return null;
        }),
      },
      shipment: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          for (const s of mockShipments.values()) {
            if (
              where.OR?.some(
                (cond: any) =>
                  (cond.trackingCode && cond.trackingCode === s.trackingCode) ||
                  (cond.carrierReferenceId && cond.carrierReferenceId === s.carrierReferenceId) ||
                  (cond.shipmentCode && cond.shipmentCode === s.shipmentCode),
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
            const updated = {
              ...s,
              ...data,
              failedAttempts:
                data.failedAttempts?.increment !== undefined
                  ? s.failedAttempts + data.failedAttempts.increment
                  : (data.failedAttempts ?? s.failedAttempts),
            };
            mockShipments.set(where.id, updated);
            return updated;
          }
          return null;
        }),
      },
      shipmentEvent: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          mockEvents.push(data);
          return { id: `event-${Date.now()}`, ...data };
        }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    const mockInboxService = {
      extractTrackingCode: jest.fn().mockImplementation((carrier, payload) => {
        if (carrier === 'GHN') return payload.OrderCode || payload.order_code || '';
        if (carrier === 'AHAMOVE') return payload._id || payload.order_id || '';
        return payload.trackingCode || '';
      }),
      extractOccurredAt: jest.fn().mockReturnValue(new Date('2026-11-16T14:30:00Z')),
      markProcessed: jest.fn().mockImplementation(async (id) => {
        const item = mockInboxes.get(id);
        if (item) {
          item.processedStatus = 'PROCESSED';
          item.processedAt = new Date();
        }
        return item;
      }),
      markFailed: jest.fn().mockImplementation(async (id, err) => {
        const item = mockInboxes.get(id);
        if (item) {
          item.processedStatus = 'FAILED';
          item.errorMessage = err;
        }
        return item;
      }),
      markIgnored: jest.fn().mockImplementation(async (id, reason) => {
        const item = mockInboxes.get(id);
        if (item) {
          item.processedStatus = 'IGNORED';
          item.errorMessage = reason;
        }
        return item;
      }),
      recordWebhook: jest.fn(),
    };

    const mockAggregator = {
      computeOrderStatus: jest.fn().mockResolvedValue({
        orderId: 'order-123',
        hasChanged: true,
        newStatus: 'DELIVERED',
      }),
    };

    const mockOutboxWriterInstance = {
      record: jest.fn().mockImplementation(async (tx, event) => {
        mockOutbox.push(event);
        return { id: `outbox-${Date.now()}`, ...event };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookInboxService, useValue: mockInboxService },
        { provide: OrderStateAggregator, useValue: mockAggregator },
        { provide: OUTBOX_WRITER, useValue: mockOutboxWriterInstance },
      ],
    }).compile();

    service = module.get<WebhookProcessorService>(WebhookProcessorService);
    inboxService = module.get<WebhookInboxService>(WebhookInboxService);
    prisma = module.get<PrismaService>(PrismaService);
    orderStateAggregator = module.get<OrderStateAggregator>(OrderStateAggregator);
    outboxWriter = module.get(OUTBOX_WRITER);
  });

  describe('Pure Function: isValidShipmentTransition (State Transition Guard)', () => {
    it('Chặn lùi trạng thái khi đã DELIVERED', () => {
      expect(isValidShipmentTransition('DELIVERED', 'IN_TRANSIT').isValid).toBe(false);
      expect(isValidShipmentTransition('DELIVERED', 'OUT_FOR_DELIVERY').isValid).toBe(false);
      expect(isValidShipmentTransition('DELIVERED', 'CREATED').isValid).toBe(false);
    });

    it('Chặn lùi trạng thái khi đã RETURNED hoặc CANCELLED', () => {
      expect(isValidShipmentTransition('RETURNED', 'IN_TRANSIT').isValid).toBe(false);
      expect(isValidShipmentTransition('CANCELLED', 'CREATED').isValid).toBe(false);
    });

    it('Chặn sự kiện gửi trễ: OUT_FOR_DELIVERY không nhận lại IN_TRANSIT', () => {
      const check = isValidShipmentTransition('OUT_FOR_DELIVERY', 'IN_TRANSIT');
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('Outdated event rejected');
    });

    it('Cho phép chuyển tiếp tiến độ thuận: CREATED -> DRIVER_ASSIGNED -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED', () => {
      expect(isValidShipmentTransition('CREATED', 'DRIVER_ASSIGNED').isValid).toBe(true);
      expect(isValidShipmentTransition('DRIVER_ASSIGNED', 'IN_TRANSIT').isValid).toBe(true);
      expect(isValidShipmentTransition('IN_TRANSIT', 'OUT_FOR_DELIVERY').isValid).toBe(true);
      expect(isValidShipmentTransition('OUT_FOR_DELIVERY', 'DELIVERED').isValid).toBe(true);
    });

    it('Cho phép từ DELIVERY_FAILED chuyển sang OUT_FOR_DELIVERY (giao lại) hoặc RETURNING (chuyển hoàn)', () => {
      expect(isValidShipmentTransition('DELIVERY_FAILED', 'OUT_FOR_DELIVERY').isValid).toBe(true);
      expect(isValidShipmentTransition('DELIVERY_FAILED', 'RETURNING').isValid).toBe(true);
    });

    it('Cho phép chuyển sang EXCEPTION khi gặp mã lạ', () => {
      expect(isValidShipmentTransition('IN_TRANSIT', 'EXCEPTION').isValid).toBe(true);
    });
  });

  describe('AC1: Xử lý Webhook DELIVERED thành công', () => {
    it('Nhận webhook delivered -> Cập nhật DELIVERED, deliveredAt, codStatus=COD_COLLECTED, gọi OrderStateAggregator', async () => {
      // Setup Shipment
      const shipment = {
        id: 'shipment-uuid-001',
        orderId: 'order-uuid-001',
        shipmentCode: 'SHIP-001',
        trackingCode: 'LAD-TEST-001',
        status: 'OUT_FOR_DELIVERY',
        codStatus: 'COD_EXPECTED',
        deliveredAt: null,
        failedAttempts: 0,
      };
      mockShipments.set(shipment.id, shipment);

      // Setup Webhook Inbox item
      const inbox = {
        id: 'inbox-uuid-001',
        carrierCode: 'GHN',
        eventId: 'EVT-GHN-DELIVERED-01',
        trackingCode: 'LAD-TEST-001',
        payload: {
          OrderCode: 'LAD-TEST-001',
          Status: 'delivered',
          Time: '2026-11-16T14:30:00Z',
        },
        processedStatus: 'PENDING',
      };
      mockInboxes.set(inbox.id, inbox);

      const result = await service.processEvent(inbox.id);

      expect(result.status).toBe('PROCESSED');
      expect(result.previousStatus).toBe('OUT_FOR_DELIVERY');
      expect(result.newStatus).toBe('DELIVERED');

      // Verify Shipment DB update
      const updatedShipment = mockShipments.get(shipment.id);
      expect(updatedShipment.status).toBe('DELIVERED');
      expect(updatedShipment.deliveredAt).toBeDefined();
      expect(updatedShipment.codStatus).toBe('COD_COLLECTED');

      // Verify ShipmentEvent created
      expect(mockEvents.length).toBe(1);
      expect(mockEvents[0].status).toBe('DELIVERED');
      expect(mockEvents[0].carrierCode).toBe('GHN');

      // Verify Outbox Event emitted
      expect(mockOutbox.length).toBe(1);
      expect(mockOutbox[0].eventType).toBe('SHIPMENT_STATUS_UPDATED');
      expect(mockOutbox[0].payload.newStatus).toBe('DELIVERED');

      // Verify OrderStateAggregator called
      expect(orderStateAggregator.computeOrderStatus).toHaveBeenCalledWith(
        'order-uuid-001',
        expect.anything(),
      );

      // Verify Inbox marked as PROCESSED
      expect(inboxService.markProcessed).toHaveBeenCalledWith(inbox.id, expect.anything());
    });
  });

  describe('AC2: Chống lùi trạng thái khi nhận Webhook sai thứ tự', () => {
    it('Shipment đã DELIVERED nhưng nhận webhook IN_TRANSIT trễ -> Bỏ qua, đánh dấu IGNORED, giữ nguyên DELIVERED', async () => {
      const shipment = {
        id: 'shipment-uuid-002',
        orderId: 'order-uuid-002',
        trackingCode: 'LAD-TEST-002',
        status: 'DELIVERED',
        codStatus: 'COD_COLLECTED',
        deliveredAt: new Date('2026-11-16T12:00:00Z'),
        failedAttempts: 0,
      };
      mockShipments.set(shipment.id, shipment);

      const inbox = {
        id: 'inbox-uuid-002',
        carrierCode: 'GHN',
        eventId: 'EVT-GHN-LATE-01',
        trackingCode: 'LAD-TEST-002',
        payload: {
          OrderCode: 'LAD-TEST-002',
          Status: 'transporting', // mapGHNStatus -> IN_TRANSIT
          Time: '2026-11-16T11:00:00Z',
        },
        processedStatus: 'PENDING',
      };
      mockInboxes.set(inbox.id, inbox);

      const result = await service.processEvent(inbox.id);

      expect(result.status).toBe('IGNORED');
      expect(result.reason).toContain('Cannot transition from terminal status DELIVERED');

      // Shipment status remains DELIVERED
      const currentShipment = mockShipments.get(shipment.id);
      expect(currentShipment.status).toBe('DELIVERED');

      // Inbox marked as IGNORED
      expect(inboxService.markIgnored).toHaveBeenCalledWith(
        inbox.id,
        expect.stringContaining('Cannot transition'),
        expect.anything(),
      );
    });
  });

  describe('Tích hợp Ahamove Webhook: Ánh xạ trạng thái và chuyển đổi', () => {
    it('Nhận webhook Ahamove IN_PROCESS + DELIVERING -> OUT_FOR_DELIVERY', async () => {
      const shipment = {
        id: 'shipment-ahm-001',
        orderId: 'order-ahm-001',
        trackingCode: '22VMV-TEST-99',
        status: 'DRIVER_ASSIGNED',
        failedAttempts: 0,
      };
      mockShipments.set(shipment.id, shipment);

      const inbox = {
        id: 'inbox-ahm-001',
        carrierCode: 'AHAMOVE',
        eventId: 'EVT-AHM-01',
        trackingCode: '22VMV-TEST-99',
        payload: {
          _id: '22VMV-TEST-99',
          status: 'IN_PROCESS',
          dropoff_status: 'DELIVERING',
        },
        processedStatus: 'PENDING',
      };
      mockInboxes.set(inbox.id, inbox);

      const result = await service.processEvent(inbox.id);
      expect(result.status).toBe('PROCESSED');
      expect(result.newStatus).toBe('OUT_FOR_DELIVERY');

      const updated = mockShipments.get(shipment.id);
      expect(updated.status).toBe('OUT_FOR_DELIVERY');
    });

    it('Nhận webhook Ahamove trạng thái lạ -> Chuyển sang EXCEPTION', async () => {
      const shipment = {
        id: 'shipment-ahm-002',
        orderId: 'order-ahm-002',
        trackingCode: '22VMV-TEST-EXC',
        status: 'IN_TRANSIT',
        failedAttempts: 0,
      };
      mockShipments.set(shipment.id, shipment);

      const inbox = {
        id: 'inbox-ahm-002',
        carrierCode: 'AHAMOVE',
        eventId: 'EVT-AHM-EXC',
        trackingCode: '22VMV-TEST-EXC',
        payload: {
          _id: '22VMV-TEST-EXC',
          status: 'alien_abduction',
        },
        processedStatus: 'PENDING',
      };
      mockInboxes.set(inbox.id, inbox);

      const result = await service.processEvent(inbox.id);
      expect(result.status).toBe('PROCESSED');
      expect(result.newStatus).toBe('EXCEPTION');

      const updated = mockShipments.get(shipment.id);
      expect(updated.status).toBe('EXCEPTION');
    });
  });

  describe('Xử lý ngoại lệ và Biên giới Idempotency', () => {
    it('Không tìm thấy Shipment tương ứng -> Đánh dấu FAILED', async () => {
      const inbox = {
        id: 'inbox-not-found',
        carrierCode: 'GHN',
        eventId: 'EVT-404',
        trackingCode: 'LAD-UNKNOWN-999',
        payload: { OrderCode: 'LAD-UNKNOWN-999', Status: 'delivering' },
        processedStatus: 'PENDING',
      };
      mockInboxes.set(inbox.id, inbox);

      const result = await service.processEvent(inbox.id);
      expect(result.status).toBe('FAILED');
      expect(result.reason).toBe('SHIPMENT_NOT_FOUND');
      expect(inboxService.markFailed).toHaveBeenCalledWith(
        inbox.id,
        expect.stringContaining('Shipment not found'),
        expect.anything(),
      );
    });

    it('Inbox đã ở trạng thái PROCESSED từ trước -> Trả về ALREADY_PROCESSED không chạy lại', async () => {
      const inbox = {
        id: 'inbox-already-done',
        carrierCode: 'GHN',
        eventId: 'EVT-DONE',
        trackingCode: 'LAD-DONE',
        payload: {},
        processedStatus: 'PROCESSED',
      };
      mockInboxes.set(inbox.id, inbox);

      const result = await service.processEvent(inbox.id);
      expect(result.status).toBe('ALREADY_PROCESSED');
      expect(prisma.shipment.update).not.toHaveBeenCalled();
    });
  });
});
