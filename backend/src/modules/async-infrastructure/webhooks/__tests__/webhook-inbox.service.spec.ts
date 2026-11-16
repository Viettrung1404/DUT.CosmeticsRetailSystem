import { Test, TestingModule } from '@nestjs/testing';
import { WebhookInboxService } from '../webhook-inbox.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

describe('EP08-T01: WebhookInboxService (Deduplication & Fingerprint)', () => {
  let service: WebhookInboxService;
  let prisma: PrismaService;

  // Mock Prisma in-memory store for isolated, deterministic tests
  const inMemoryInbox = new Map<string, any>();

  const mockPrismaService = {
    shippingWebhookInbox: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const uniqueKey = `${data.carrierCode}:${data.eventId}`;
        if (inMemoryInbox.has(uniqueKey)) {
          const error = new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed on the fields: (`carrier_code`, `event_id`)',
            {
              code: 'P2002',
              clientVersion: '6.19.3',
              meta: { target: ['carrier_code', 'event_id'] },
            },
          );
          throw error;
        }

        const record = {
          id: `inbox-uuid-${Date.now()}-${Math.random()}`,
          carrierCode: data.carrierCode,
          eventId: data.eventId,
          eventType: data.eventType || 'SHIPMENT_STATUS_UPDATE',
          trackingCode: data.trackingCode || null,
          payload: data.payload,
          processedStatus: data.processedStatus || 'PENDING',
          errorMessage: null,
          receivedAt: new Date(),
          processedAt: null,
        };
        inMemoryInbox.set(uniqueKey, record);
        return record;
      }),

      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        const { carrierCode, eventId } = where.carrierCode_eventId;
        return inMemoryInbox.get(`${carrierCode}:${eventId}`) || null;
      }),

      update: jest.fn().mockImplementation(async ({ where, data }) => {
        for (const [key, record] of inMemoryInbox.entries()) {
          if (record.id === where.id) {
            const updated = { ...record, ...data };
            inMemoryInbox.set(key, updated);
            return updated;
          }
        }
        return null;
      }),
    },
  };

  beforeEach(async () => {
    inMemoryInbox.clear();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookInboxService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WebhookInboxService>(WebhookInboxService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('AC1: Chống trùng lặp tuyệt đối (Deduplication)', () => {
    it('Bắn 10 lần cùng một payload webhook có eventId -> Chỉ 1 lần lưu, 9 lần sau báo ALREADY_PROCESSED', async () => {
      const ghnPayload = {
        OrderCode: 'LAD987654321',
        Status: 'delivering',
        Time: '2026-11-16T10:00:00.000Z',
        EventId: 'GHN-EVT-001239',
      };

      // Lần 1: Nhận diện mới
      const firstResult = await service.recordWebhook('GHN', ghnPayload);
      expect(firstResult.isDuplicate).toBe(false);
      expect(firstResult.status).toBe('RECORDED');
      expect(firstResult.inbox.eventId).toBe('GHN-EVT-001239');
      expect(firstResult.inbox.trackingCode).toBe('LAD987654321');

      // 9 lần tiếp theo: Bị chặn và đánh dấu ALREADY_PROCESSED
      for (let i = 2; i <= 10; i++) {
        const duplicateResult = await service.recordWebhook('GHN', ghnPayload);
        expect(duplicateResult.isDuplicate).toBe(true);
        expect(duplicateResult.status).toBe('ALREADY_PROCESSED');
        expect(duplicateResult.inbox.eventId).toBe('GHN-EVT-001239');
      }

      // Tổng số bản ghi trong store chỉ duy nhất 1
      expect(inMemoryInbox.size).toBe(1);
    });
  });

  describe('AC2: Tạo Fingerprint xác định khi Webhook không có Event ID', () => {
    it('Sinh mã SHA256 Fingerprint đồng nhất và chống trùng lặp khi không có eventId', async () => {
      const ahamovePayload = {
        _id: '22VMV987654',
        status: 'IN_PROCESS',
        dropoff_status: 'DELIVERING',
        timestamp: '2026-11-16T11:30:00.000Z',
      };

      const result1 = await service.recordWebhook('AHAMOVE', ahamovePayload);
      expect(result1.isDuplicate).toBe(false);
      expect(result1.status).toBe('RECORDED');
      expect(result1.inbox.eventId).toBeDefined();
      expect(result1.inbox.eventId.length).toBe(64); // SHA256 hex length = 64

      // Lần 2 với cùng nội dung: Fingerprint phải giống hệt và bị coi là duplicate
      const result2 = await service.recordWebhook('AHAMOVE', ahamovePayload);
      expect(result2.isDuplicate).toBe(true);
      expect(result2.status).toBe('ALREADY_PROCESSED');
      expect(result2.inbox.eventId).toBe(result1.inbox.eventId);
    });

    it('Hai sự kiện có trạng thái khác nhau tại cùng trackingCode sẽ sinh 2 fingerprint khác nhau', async () => {
      const payloadStep1 = {
        OrderCode: 'GHN-TRACK-001',
        Status: 'picking',
        Time: '2026-11-16T08:00:00.000Z',
      };

      const payloadStep2 = {
        OrderCode: 'GHN-TRACK-001',
        Status: 'delivered',
        Time: '2026-11-16T14:00:00.000Z',
      };

      const res1 = await service.recordWebhook('GHN', payloadStep1);
      const res2 = await service.recordWebhook('GHN', payloadStep2);

      expect(res1.isDuplicate).toBe(false);
      expect(res2.isDuplicate).toBe(false);
      expect(res1.inbox.eventId).not.toBe(res2.inbox.eventId);
      expect(inMemoryInbox.size).toBe(2);
    });
  });

  describe('Concurrency & Race Condition Handling (20 đồng thời)', () => {
    it('Bắn 20 requests đồng thời cùng một webhook -> Chỉ 1 bản ghi được lưu, không crash', async () => {
      const concurrentPayload = {
        OrderCode: 'CONCURRENT-TRK-777',
        Status: 'picked',
        Time: '2026-11-16T12:00:00.000Z',
        EventId: 'CONC-EVT-777',
      };

      // Gửi đồng thời 20 requests
      const promises = Array.from({ length: 20 }, () =>
        service.recordWebhook('GHN', concurrentPayload),
      );

      const results = await Promise.all(promises);

      const recorded = results.filter((r) => !r.isDuplicate && r.status === 'RECORDED');
      const duplicates = results.filter(
        (r) => r.isDuplicate && r.status === 'ALREADY_PROCESSED',
      );

      expect(recorded.length).toBe(1);
      expect(duplicates.length).toBe(19);
      expect(inMemoryInbox.size).toBe(1);
    });
  });

  describe('Trạng thái vòng đời Inbox (markProcessed, markFailed, markIgnored)', () => {
    it('Cập nhật đúng trạng thái PROCESSED, FAILED, IGNORED', async () => {
      const { inbox } = await service.recordWebhook('GHN', {
        OrderCode: 'STATUS-TRK-100',
        Status: 'delivering',
        EventId: 'EVT-STATUS-100',
      });

      // PROCESSED
      const processed = await service.markProcessed(inbox.id);
      expect(processed.processedStatus).toBe('PROCESSED');
      expect(processed.processedAt).toBeDefined();

      // FAILED
      const failed = await service.markFailed(inbox.id, 'Connection timeout');
      expect(failed.processedStatus).toBe('FAILED');
      expect(failed.errorMessage).toBe('Connection timeout');

      // IGNORED
      const ignored = await service.markIgnored(inbox.id, 'Outdated event ignored');
      expect(ignored.processedStatus).toBe('IGNORED');
      expect(ignored.errorMessage).toBe('Outdated event ignored');
    });
  });
});
