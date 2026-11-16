import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import workerHandler from '../../../../../cloudflare-workers/src/index';
import { handleQueueBatch } from '../../../../../cloudflare-workers/src/consumer';
import {
  Env,
  LogisticsWebhookMessage,
  Message,
  MessageBatch,
} from '../../../../../cloudflare-workers/src/types';
import { InternalWebhookController } from '../webhooks/internal-webhook.controller';
import { InternalTokenGuard } from '../webhooks/internal-token.guard';
import { WebhookInboxService } from '../webhooks/webhook-inbox.service';
import { WebhookProcessorService } from '../webhooks/webhook-processor.service';
import { OutboxRelayScheduler } from '../outbox/outbox-relay.scheduler';
import { CLOUDFLARE_QUEUE_CLIENT } from '../outbox/cloudflare-queue.client';

describe('EPIC 09: Integrated Event-Driven Async Flow (Edge -> Queue -> Consumer -> NestJS -> Outbox Relay)', () => {
  let internalController: InternalWebhookController;
  let outboxScheduler: OutboxRelayScheduler;
  let mockPrisma: any;
  let mockQueueClient: any;
  let mockProcessorService: any;
  let mockInboxService: any;

  beforeEach(async () => {
    mockQueueClient = {
      sendMessage: jest.fn().mockResolvedValue({ success: true, messageId: 'cf-prod-1' }),
      sendBatch: jest.fn().mockResolvedValue({ success: true, sentCount: 1 }),
    };

    mockProcessorService = {
      processWebhook: jest.fn().mockResolvedValue({
        status: 'PROCESSED',
        inboxId: 'inbox-e2e-1',
        shipmentId: 'shp-e2e-1',
        newStatus: 'DELIVERED',
      }),
    };

    mockInboxService = {
      recordWebhook: jest.fn(),
    };

    mockPrisma = {
      $transaction: jest.fn(async (cb: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([
            {
              id: 'outbox-evt-1',
              aggregate_type: 'SHIPMENT',
              aggregate_id: 'shp-e2e-1',
              event_type: 'SHIPMENT_STATUS_UPDATED',
              payload: { status: 'DELIVERED' },
              retry_count: 0,
            },
          ]),
          $executeRaw: jest.fn().mockResolvedValue(1),
        };
        return cb(tx);
      }),
    };

    const mockConfig = {
      get: jest.fn((key: string, def?: string) => {
        if (key === 'INTERNAL_DISPATCH_SECRET') return 'secret-internal-key-999';
        if (key === 'OUTBOX_RELAY_ENABLED') return 'true';
        return def;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalWebhookController],
      providers: [
        InternalTokenGuard,
        OutboxRelayScheduler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: WebhookInboxService, useValue: mockInboxService },
        { provide: WebhookProcessorService, useValue: mockProcessorService },
        { provide: CLOUDFLARE_QUEUE_CLIENT, useValue: mockQueueClient },
      ],
    }).compile();

    internalController = module.get<InternalWebhookController>(InternalWebhookController);
    outboxScheduler = module.get<OutboxRelayScheduler>(OutboxRelayScheduler);
  });

  it('Complete End-to-End Cycle: Edge Ingress -> Cloudflare Queue -> Consumer -> NestJS Internal Dispatcher -> Outbox Relay', async () => {
    // -------------------------------------------------------------
    // Giai đoạn 1: Webhook Ingress tại Edge (Cloudflare Worker)
    // -------------------------------------------------------------
    const queueEnqueuedMessages: any[] = [];
    const mockWorkerEnv: Env = {
      ENVIRONMENT: 'production',
      GHN_WEBHOOK_SECRET: 'ghn-live-secret',
      AHAMOVE_WEBHOOK_SECRET: 'ahamove-live-secret',
      NESTJS_INTERNAL_URL: 'http://internal.glowup.vn',
      INTERNAL_DISPATCH_SECRET: 'secret-internal-key-999',
      LOGISTICS_WEBHOOK_QUEUE: {
        send: jest.fn(async (msg: any) => {
          queueEnqueuedMessages.push(msg);
        }),
        sendBatch: jest.fn(),
      },
    };

    const ghnWebhookRequest = new Request('https://edge.glowup.vn/webhooks/ghn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: 'ghn-live-secret',
      },
      body: JSON.stringify({
        OrderCode: 'GHN-E2E-999',
        Status: 'delivered',
        Time: '2026-11-16T17:15:00Z',
      }),
    });

    const ingressResponse = await workerHandler.fetch(ghnWebhookRequest, mockWorkerEnv);
    expect(ingressResponse.status).toBe(200);
    const ingressBody = await ingressResponse.json();
    expect(ingressBody.success).toBe(true);
    expect(queueEnqueuedMessages.length).toBe(1);
    expect(queueEnqueuedMessages[0].carrierCode).toBe('GHN');

    // -------------------------------------------------------------
    // Giai đoạn 2: Cloudflare Queue Consumer kéo batch & gọi Internal NestJS API
    // -------------------------------------------------------------
    const enqueued = queueEnqueuedMessages[0];
    const mockQueueMessage: Message<LogisticsWebhookMessage> = {
      id: enqueued.id,
      timestamp: new Date(),
      body: enqueued,
      ack: jest.fn(),
      retry: jest.fn(),
    };

    const mockBatch: MessageBatch<LogisticsWebhookMessage> = {
      queue: 'glowup-logistics-webhooks',
      messages: [mockQueueMessage],
      ackAll: jest.fn(),
      retryAll: jest.fn(),
    };

    // Giả lập NestJS Internal Endpoint xử lý thành công
    global.fetch = jest.fn().mockImplementation(async (url: string, init: any) => {
      // Gọi trực tiếp controller để mô phỏng HTTP invocation
      const parsedBody = JSON.parse(init.body);
      const res = await internalController.consumeWebhook(parsedBody, init.headers);
      return {
        ok: true,
        status: 200,
        json: async () => res,
      };
    });

    await handleQueueBatch(mockBatch, mockWorkerEnv);

    // Xác nhận Consumer nhận 200 OK và gọi ack() xóa message khỏi Queue
    expect(mockQueueMessage.ack).toHaveBeenCalled();
    expect(mockQueueMessage.retry).not.toHaveBeenCalled();
    expect(mockProcessorService.processWebhook).toHaveBeenCalledWith(
      'GHN',
      enqueued.payload,
      expect.any(Object),
    );

    // -------------------------------------------------------------
    // Giai đoạn 3: Outbox Relay quét SKIP LOCKED và đẩy sang Queue Producer
    // -------------------------------------------------------------
    const relayStats = await outboxScheduler.relayBatch(50);
    expect(relayStats.processed).toBe(1);
    expect(relayStats.succeeded).toBe(1);
    expect(relayStats.failed).toBe(0);
    expect(mockQueueClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'SHIPMENT',
        eventType: 'SHIPMENT_STATUS_UPDATED',
      }),
    );
  });
});
