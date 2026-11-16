import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { OutboxWriterService } from '../outbox-writer.service';
import { BaseDomainEvent } from '../base-domain-event';

describe('EP01-T02: Transactional Outbox Foundation & Event Contract Integration Tests', () => {
  jest.setTimeout(30000);
  let prisma: PrismaClient;

  let outboxWriter: OutboxWriterService;
  const testIdsToCleanup: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();
    outboxWriter = new OutboxWriterService();
  });

  afterAll(async () => {
    if (testIdsToCleanup.length > 0) {
      await prisma.outboxEvent.deleteMany({
        where: { id: { in: testIdsToCleanup } },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. Outbox Event Persistence in Successful Transaction', () => {
    it('phải ghi thành công outbox event với trạng thái PENDING và retry_count = 0', async () => {
      const eventId = randomUUID();
      testIdsToCleanup.push(eventId);

      const event: BaseDomainEvent<{ orderNumber: string; totalAmount: number }> = {
        id: eventId,
        aggregateType: 'ORDER',
        aggregateId: 'ord_test_001',
        eventType: 'ORDER_RESERVED',
        payload: {
          orderNumber: 'ORD-20261115-0001',
          totalAmount: 550000,
        },
      };

      await prisma.$transaction(async (tx) => {
        const saved = await outboxWriter.record(tx, event);
        expect(saved).toBeDefined();
        expect(saved.id).toBe(eventId);
        expect(saved.status).toBe('PENDING');
        expect(saved.retryCount).toBe(0);
      });

      // Kiểm tra trực tiếp trong DB sau khi transaction commit
      const persisted = await prisma.outboxEvent.findUnique({
        where: { id: eventId },
      });

      expect(persisted).toBeDefined();
      expect(persisted?.aggregateType).toBe('ORDER');
      expect(persisted?.aggregateId).toBe('ord_test_001');
      expect(persisted?.eventType).toBe('ORDER_RESERVED');
      expect(persisted?.status).toBe('PENDING');
      expect(persisted?.retryCount).toBe(0);
      expect(persisted?.lastError).toBeNull();
      expect(persisted?.publishedAt).toBeNull();
      expect(persisted?.payload).toEqual({
        orderNumber: 'ORD-20261115-0001',
        totalAmount: 550000,
      });
    });

    it('phải tự động sinh UUID v4 nếu event không cung cấp id', async () => {
      let generatedId: string | undefined;

      await prisma.$transaction(async (tx) => {
        const event: BaseDomainEvent = {
          aggregateType: 'INVENTORY',
          aggregateId: 'inv_test_001',
          eventType: 'STOCK_RESERVED',
          payload: { variantId: 'var_01', quantity: 2 },
        };

        const saved = await outboxWriter.record(tx, event);
        generatedId = saved.id;
        testIdsToCleanup.push(saved.id);
        expect(saved.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      });

      const persisted = await prisma.outboxEvent.findUnique({
        where: { id: generatedId },
      });
      expect(persisted).toBeDefined();
      expect(persisted?.eventType).toBe('STOCK_RESERVED');
    });

    it('phải ghi hàng loạt nhiều events thành công qua recordMany', async () => {
      const eventId1 = randomUUID();
      const eventId2 = randomUUID();
      testIdsToCleanup.push(eventId1, eventId2);

      const events: BaseDomainEvent[] = [
        {
          id: eventId1,
          aggregateType: 'SHIPMENT',
          aggregateId: 'ship_001',
          eventType: 'SHIPMENT_CREATED',
          payload: { trackingCode: 'GHN123' },
        },
        {
          id: eventId2,
          aggregateType: 'SHIPMENT',
          aggregateId: 'ship_001',
          eventType: 'SHIPMENT_LABEL_GENERATED',
          payload: { labelUrl: 'https://cdn.glowup.vn/label/123.pdf' },
        },
      ];

      await prisma.$transaction(async (tx) => {
        await outboxWriter.recordMany(tx, events);
      });

      const records = await prisma.outboxEvent.findMany({
        where: { id: { in: [eventId1, eventId2] } },
        orderBy: { createdAt: 'asc' },
      });

      expect(records).toHaveLength(2);
      expect(records[0].eventType).toBe('SHIPMENT_CREATED');
      expect(records[1].eventType).toBe('SHIPMENT_LABEL_GENERATED');
      expect(records[0].status).toBe('PENDING');
      expect(records[1].status).toBe('PENDING');
    });
  });

  describe('2. Transaction Rollback & ACID Guarantee (Acceptance Criteria)', () => {
    it('phải ROLLBACK hoàn toàn bản ghi outbox nếu transaction nghiệp vụ bị lỗi/ném ngoại lệ', async () => {
      const doomedEventId = randomUUID();
      // Không cần add vào testIdsToCleanup vì mong đợi nó không bao giờ được commit!

      const event: BaseDomainEvent = {
        id: doomedEventId,
        aggregateType: 'ORDER',
        aggregateId: 'ord_doomed_999',
        eventType: 'ORDER_FAILED_ROLLBACK',
        payload: { reason: 'Simulated business logic failure' },
      };

      await expect(
        prisma.$transaction(async (tx) => {
          // 1. Ghi outbox event
          await outboxWriter.record(tx, event);

          // 2. Giả lập nghiệp vụ tiếp theo bị lỗi nghiêm trọng
          throw new Error('SIMULATED_BUSINESS_EXCEPTION_TRIGGERING_ROLLBACK');
        }),
      ).rejects.toThrow('SIMULATED_BUSINESS_EXCEPTION_TRIGGERING_ROLLBACK');

      // 3. Xác minh trong database: Bản ghi outbox tuyệt đối KHÔNG tồn tại
      const record = await prisma.outboxEvent.findUnique({
        where: { id: doomedEventId },
      });

      expect(record).toBeNull();
    });

    it('phải ROLLBACK toàn bộ danh sách recordMany nếu transaction gặp sự cố', async () => {
      const doomedId1 = randomUUID();
      const doomedId2 = randomUUID();

      const events: BaseDomainEvent[] = [
        {
          id: doomedId1,
          aggregateType: 'ORDER',
          aggregateId: 'ord_batch_fail',
          eventType: 'EVENT_ONE',
          payload: {},
        },
        {
          id: doomedId2,
          aggregateType: 'ORDER',
          aggregateId: 'ord_batch_fail',
          eventType: 'EVENT_TWO',
          payload: {},
        },
      ];

      await expect(
        prisma.$transaction(async (tx) => {
          await outboxWriter.recordMany(tx, events);
          throw new Error('BATCH_TRANSACTION_FAILED');
        }),
      ).rejects.toThrow('BATCH_TRANSACTION_FAILED');

      const records = await prisma.outboxEvent.findMany({
        where: { id: { in: [doomedId1, doomedId2] } },
      });

      expect(records).toHaveLength(0);
    });
  });
});
