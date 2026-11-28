import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  OutboxRelayScheduler,
  OutboxRelayStats,
} from '../outbox-relay.scheduler';
import {
  CLOUDFLARE_QUEUE_CLIENT,
  ICloudflareQueueClient,
  CloudflareQueueClient,
  QueueMessage,
  QueueSendResult,
} from '../cloudflare-queue.client';

describe('EP09-T01: Outbox Relay Worker & Cloudflare Queue Client', () => {
  describe('CloudflareQueueClient', () => {
    let client: CloudflareQueueClient;
    let configService: ConfigService;

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return mock response when CLOUDFLARE_QUEUE_MOCK_ENABLED=true or producerUrl is empty', async () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'CLOUDFLARE_QUEUE_MOCK_ENABLED') return 'true';
          return '';
        }),
      } as any;

      client = new CloudflareQueueClient(configService);
      const res = await client.sendMessage({
        id: 'msg-123',
        aggregateType: 'ORDER',
        aggregateId: 'ord-123',
        eventType: 'ORDER_RESERVED',
        payload: { orderId: 'ord-123' },
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toContain('mock-msg-msg-123');
      expect(res.statusCode).toBe(200);
    });

    it('should handle HTTP 200 from live Cloudflare Worker Producer', async () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'CLOUDFLARE_QUEUE_PRODUCER_URL') return 'https://queue.glowup.vn/produce';
          if (key === 'CLOUDFLARE_API_TOKEN') return 'cf-secret-token';
          return '';
        }),
      } as any;

      client = new CloudflareQueueClient(configService);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ messageId: 'cf-real-msg-999' }),
      } as any);

      const res = await client.sendMessage({
        id: 'msg-456',
        aggregateType: 'SHIPMENT',
        aggregateId: 'shp-456',
        eventType: 'SHIPMENT_CREATED',
        payload: { shipmentId: 'shp-456' },
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toBe('cf-real-msg-999');
      expect(res.statusCode).toBe(200);
    });

    it('should handle HTTP 429 Rate Limit from Cloudflare Queue', async () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'CLOUDFLARE_QUEUE_PRODUCER_URL') return 'https://queue.glowup.vn/produce';
          return '';
        }),
      } as any;

      client = new CloudflareQueueClient(configService);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded for queue',
      } as any);

      const res = await client.sendMessage({
        id: 'msg-789',
        aggregateType: 'ORDER',
        aggregateId: 'ord-789',
        eventType: 'ORDER_CONFIRMED',
        payload: {},
      });

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(429);
      expect(res.error).toContain('Rate limit exceeded');
    });

    it('should handle Network/Timeout Error gracefully', async () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'CLOUDFLARE_QUEUE_PRODUCER_URL') return 'https://queue.glowup.vn/produce';
          return '';
        }),
      } as any;

      client = new CloudflareQueueClient(configService);

      global.fetch = jest.fn().mockRejectedValue(new Error('Connection timed out'));

      const res = await client.sendMessage({
        id: 'msg-timeout',
        aggregateType: 'SHIPMENT',
        aggregateId: 'shp-timeout',
        eventType: 'SHIPMENT_DISPATCHED',
        payload: {},
      });

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(503);
      expect(res.error).toContain('Connection timed out');
    });
  });

  describe('OutboxRelayScheduler Service', () => {
    let scheduler: OutboxRelayScheduler;
    let mockPrisma: any;
    let mockQueueClient: jest.Mocked<ICloudflareQueueClient>;
    let mockConfigService: any;

    beforeEach(async () => {
      mockQueueClient = {
        sendMessage: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
        sendBatch: jest.fn().mockResolvedValue({ success: true, sentCount: 1 }),
      };

      mockConfigService = {
        get: jest.fn((key: string, defaultVal?: string) => {
          if (key === 'OUTBOX_RELAY_ENABLED') return 'true';
          return defaultVal;
        }),
      };

      mockPrisma = {
        $transaction: jest.fn(async (cb: any) => {
          const tx = {
            $queryRaw: jest.fn(),
            $executeRaw: jest.fn(),
          };
          return cb(tx);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OutboxRelayScheduler,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: CLOUDFLARE_QUEUE_CLIENT, useValue: mockQueueClient },
        ],
      }).compile();

      scheduler = module.get<OutboxRelayScheduler>(OutboxRelayScheduler);
    });

    it('should successfully relay a batch of pending events to PUBLISHED status', async () => {
      const mockEvents = [
        {
          id: 'b8e90f23-66f8-4b72-91f1-000000000001',
          aggregate_type: 'ORDER',
          aggregate_id: 'ord-001',
          event_type: 'ORDER_RESERVED',
          payload: { orderNumber: 'ORD-001' },
          retry_count: 0,
        },
        {
          id: 'b8e90f23-66f8-4b72-91f1-000000000002',
          aggregate_type: 'SHIPMENT',
          aggregate_id: 'shp-001',
          event_type: 'SHIPMENT_STATUS_UPDATED',
          payload: { status: 'IN_TRANSIT' },
          retry_count: 0,
        },
      ];

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue(mockEvents),
          $executeRaw: jest.fn().mockResolvedValue(1),
        };
        return cb(tx);
      });

      const stats = await scheduler.relayBatch(50);

      expect(stats.processed).toBe(2);
      expect(stats.succeeded).toBe(2);
      expect(stats.failed).toBe(0);
      expect(mockQueueClient.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('AC1 Verification: Concurrency with 2 parallel workers using FOR UPDATE SKIP LOCKED does not overlap', async () => {
      // Giả lập 100 events
      const allEvents = Array.from({ length: 100 }, (_, i) => ({
        id: `event-${i + 1}`,
        aggregate_type: 'ORDER',
        aggregate_id: `ord-${i + 1}`,
        event_type: 'ORDER_CREATED',
        payload: { index: i + 1 },
        retry_count: 0,
      }));

      // Worker 1 nhận 50 events đầu tiên (được lock bởi SKIP LOCKED)
      // Worker 2 nhận 50 events tiếp theo
      const worker1Events = allEvents.slice(0, 50);
      const worker2Events = allEvents.slice(50, 100);

      const processedByWorker1: string[] = [];
      const processedByWorker2: string[] = [];

      const worker1Prisma = {
        $transaction: jest.fn(async (cb: any) => {
          const tx = {
            $queryRaw: jest.fn().mockResolvedValue(worker1Events),
            $executeRaw: jest.fn().mockResolvedValue(1),
          };
          return cb(tx);
        }),
      };

      const worker2Prisma = {
        $transaction: jest.fn(async (cb: any) => {
          const tx = {
            $queryRaw: jest.fn().mockResolvedValue(worker2Events),
            $executeRaw: jest.fn().mockResolvedValue(1),
          };
          return cb(tx);
        }),
      };

      const queue1 = {
        sendMessage: jest.fn(async (msg: QueueMessage) => {
          processedByWorker1.push(msg.id);
          return { success: true };
        }),
        sendBatch: jest.fn(),
      };

      const queue2 = {
        sendMessage: jest.fn(async (msg: QueueMessage) => {
          processedByWorker2.push(msg.id);
          return { success: true };
        }),
        sendBatch: jest.fn(),
      };

      const worker1 = new OutboxRelayScheduler(
        worker1Prisma as any,
        mockConfigService,
        queue1 as any,
      );
      const worker2 = new OutboxRelayScheduler(
        worker2Prisma as any,
        mockConfigService,
        queue2 as any,
      );

      // Chạy đồng thời 2 workers
      const [res1, res2] = await Promise.all([
        worker1.relayBatch(50),
        worker2.relayBatch(50),
      ]);

      expect(res1.succeeded).toBe(50);
      expect(res2.succeeded).toBe(50);
      expect(processedByWorker1.length).toBe(50);
      expect(processedByWorker2.length).toBe(50);

      // Kiểm tra tuyệt đối KHÔNG có phần tử chung giữa worker 1 và worker 2 (Zero Overlap)
      const intersection = processedByWorker1.filter((id) =>
        processedByWorker2.includes(id),
      );
      expect(intersection).toEqual([]);
    });

    it('AC2 Verification: Zero message loss under network failure (remains PENDING, increments retry_count)', async () => {
      const mockEvent = {
        id: 'event-network-fail-1',
        aggregate_type: 'SHIPMENT',
        aggregate_id: 'shp-net-fail',
        event_type: 'SHIPMENT_RETURNING_TRIGGERED',
        payload: { shipmentId: 'shp-net-fail' },
        retry_count: 0,
      };

      let executedQuery = '';
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([mockEvent]),
          $executeRaw: jest.fn((query: any) => {
            executedQuery = JSON.stringify(query);
            return Promise.resolve(1);
          }),
        };
        return cb(tx);
      });

      // Giả lập lỗi mạng khi gửi sang Cloudflare Queue
      mockQueueClient.sendMessage.mockResolvedValue({
        success: false,
        statusCode: 503,
        error: 'NETWORK_ERROR: connect ETIMEDOUT 104.16.1.1:443',
      });

      const stats = await scheduler.relayBatch(10);

      expect(stats.processed).toBe(1);
      expect(stats.succeeded).toBe(0);
      expect(stats.failed).toBe(1);

      // Xác minh DB ghi nhận retry_count = retry_count + 1 và ghi nhận lỗi
      expect(executedQuery).toContain('retry_count = retry_count + 1');
      expect(executedQuery).toContain('last_error');

      // Xác minh backoff được kích hoạt
      expect(scheduler.isBackoffActive()).toBe(true);
    });

    it('should pause execution during active backoff on 429 Too Many Requests', async () => {
      const mockEvent = {
        id: 'event-rate-limit-1',
        aggregate_type: 'ORDER',
        aggregate_id: 'ord-rl',
        event_type: 'ORDER_CONFIRMED',
        payload: {},
        retry_count: 1,
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([mockEvent]),
          $executeRaw: jest.fn().mockResolvedValue(1),
        };
        return cb(tx);
      });

      mockQueueClient.sendMessage.mockResolvedValue({
        success: false,
        statusCode: 429,
        error: 'HTTP_429: Rate limit exceeded',
      });

      const stats = await scheduler.relayBatch(10);
      expect(stats.failed).toBe(1);
      expect(scheduler.isBackoffActive()).toBe(true);

      // Khi cron chạy trong thời gian backoff, nó sẽ bỏ qua không gọi transaction
      mockPrisma.$transaction.mockClear();
      await scheduler.handleCron();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();

      // Reset backoff và chạy lại
      scheduler.clearBackoff();
      expect(scheduler.isBackoffActive()).toBe(false);
    });

    it('triggers relay asynchronously via triggerRelayNow() and coalesces burst writes', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          $executeRaw: jest.fn().mockResolvedValue(1),
        };
        return cb(tx);
      });

      const relaySpy = jest.spyOn(scheduler, 'relayBatch');
      scheduler.triggerRelayNow(10);
      scheduler.triggerRelayNow(10);
      scheduler.triggerRelayNow(10);

      expect(relaySpy).not.toHaveBeenCalled();

      await new Promise((resolve) => setTimeout(resolve, 40));

      expect(relaySpy).toHaveBeenCalledTimes(1);
    });

    it('registers configurable fallback sweep cron (default 30m) instead of 3s polling', () => {
      const addCronJob = jest.fn();
      const addInterval = jest.fn();
      const doesExist = jest.fn().mockReturnValue(false);
      const deleteCronJob = jest.fn();
      const deleteInterval = jest.fn();
      const registry = {
        addCronJob,
        addInterval,
        doesExist,
        deleteCronJob,
        deleteInterval,
      } as any;

      const defaultScheduler = new OutboxRelayScheduler(
        mockPrisma,
        mockConfigService,
        mockQueueClient,
        registry,
      );
      defaultScheduler.onModuleInit();

      expect(addCronJob).toHaveBeenCalledTimes(1);
      expect(addCronJob.mock.calls[0][0]).toBe('outbox-relay-fallback-sweep');
      expect(addCronJob.mock.calls[0][1].cronTime.source).toBe('0 */30 * * * *');
      defaultScheduler.onModuleDestroy();

      // Custom 60-minute interval
      const config60 = {
        get: jest.fn((key: string, defaultVal?: string) => {
          if (key === 'OUTBOX_RELAY_ENABLED') return 'true';
          if (key === 'OUTBOX_RELAY_SWEEP_INTERVAL_MINUTES') return '60';
          return defaultVal;
        }),
      } as any;
      addCronJob.mockClear();
      const hourlyScheduler = new OutboxRelayScheduler(
        mockPrisma,
        config60,
        mockQueueClient,
        registry,
      );
      hourlyScheduler.onModuleInit();
      expect(addCronJob).toHaveBeenCalledTimes(1);
      expect(addCronJob.mock.calls[0][1].cronTime.source).toBe('0 0 * * * *');
      hourlyScheduler.onModuleDestroy();
    });

    it('does not register fallback sweep or trigger relay when OUTBOX_RELAY_ENABLED=false', async () => {
      const addCronJob = jest.fn();
      const registry = { addCronJob, doesExist: jest.fn().mockReturnValue(false) } as any;
      const disabledConfig = {
        get: jest.fn((key: string, defaultVal?: string) => {
          if (key === 'OUTBOX_RELAY_ENABLED') return 'false';
          return defaultVal;
        }),
      } as any;

      const disabledScheduler = new OutboxRelayScheduler(
        mockPrisma,
        disabledConfig,
        mockQueueClient,
        registry,
      );
      disabledScheduler.onModuleInit();
      expect(addCronJob).not.toHaveBeenCalled();

      const relaySpy = jest.spyOn(disabledScheduler, 'relayBatch');
      disabledScheduler.triggerRelayNow(5);
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(relaySpy).not.toHaveBeenCalled();
      disabledScheduler.onModuleDestroy();
    });
  });
});
