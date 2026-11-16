import { CorrelationIdMiddleware, CORRELATION_ID_HEADER } from '@core/middlewares/correlation-id.middleware';
import { getCorrelationId } from '@core/logger/correlation-context';
import { StructuredLoggerService } from '@core/logger/structured-logger.service';
import { OutboxWriterService } from '../outbox/outbox-writer.service';
import { CloudflareQueueClient } from '../outbox/cloudflare-queue.client';
import { DlqAlertService } from '../operations/dlq-alert.service';
import { DlqOperationsService } from '../operations/dlq-operations.service';
import { DlqOperationsController } from '../operations/dlq-operations.controller';

describe('EPIC 12: Observability & Disaster Recovery Integrated Flow', () => {
  let correlationMiddleware: CorrelationIdMiddleware;
  let loggerService: StructuredLoggerService;
  let outboxWriter: OutboxWriterService;
  let queueClient: CloudflareQueueClient;
  let dlqAlertService: DlqAlertService;
  let dlqOperationsService: DlqOperationsService;
  let dlqController: DlqOperationsController;

  let mockPrisma: any;
  let mockWebhookProcessor: any;
  let mockConfigService: any;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, messageId: 'cf-msg-123' }),
      text: () => Promise.resolve('OK'),
    } as any);

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'CLOUDFLARE_QUEUE_PRODUCER_URL') return 'https://queue.glowup.vn/produce';
        if (key === 'CLOUDFLARE_API_TOKEN') return 'mock-cf-token';
        if (key === 'CLOUDFLARE_QUEUE_MOCK_ENABLED') return 'false';
        if (key === 'DISCORD_DLQ_WEBHOOK_URL') return 'https://discord.com/api/webhooks/dlq';
        if (key === 'SLACK_DLQ_WEBHOOK_URL') return 'https://hooks.slack.com/services/dlq';
        return undefined;
      }),
    };

    mockPrisma = {
      shippingWebhookInbox: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'inbox-dlq-001',
            carrierCode: 'GHN',
            eventId: 'ghn-evt-fail-888',
            trackingCode: 'GHN888',
            processedStatus: 'DEAD_LETTER',
            errorMessage: 'Timeout contacting database',
            receivedAt: new Date(),
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'inbox-dlq-001',
          carrierCode: 'GHN',
          eventId: 'ghn-evt-fail-888',
          trackingCode: 'GHN888',
          processedStatus: 'DEAD_LETTER',
        }),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({ id: where.id, ...data }),
        ),
        upsert: jest.fn().mockImplementation(({ create }) =>
          Promise.resolve({ id: 'inbox-dlq-001', ...create }),
        ),
      },
      outboxEvent: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: data.id, ...data })),
        findMany: jest.fn().mockResolvedValue([{ id: 'stuck-outbox-1' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    mockWebhookProcessor = {
      processEvent: jest.fn().mockResolvedValue({
        status: 'PROCESSED',
        inboxId: 'inbox-dlq-001',
        shipmentId: 'shipment-ghn-888',
        newStatus: 'DELIVERED',
      }),
    };

    correlationMiddleware = new CorrelationIdMiddleware();
    loggerService = new StructuredLoggerService('ObservabilityFlow');
    outboxWriter = new OutboxWriterService();
    queueClient = new CloudflareQueueClient(mockConfigService);
    dlqAlertService = new DlqAlertService(mockConfigService);
    dlqOperationsService = new DlqOperationsService(
      mockPrisma,
      mockWebhookProcessor,
      dlqAlertService,
    );
    dlqController = new DlqOperationsController(dlqOperationsService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('Part 1: End-to-end distributed tracing with Correlation ID propagation (EP12-T01)', async () => {
    const correlationId = 'glowup-trace-req-77777';
    const req: any = {
      headers: {
        [CORRELATION_ID_HEADER]: correlationId,
      },
    };
    const res: any = {
      setHeader: jest.fn(),
    };

    // Step 1: Request passes through CorrelationIdMiddleware
    await new Promise<void>((resolve) => {
      correlationMiddleware.use(req, res, async () => {
        expect(res.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, correlationId);
        expect(getCorrelationId()).toBe(correlationId);

        // Step 2: Structured logging inside request context includes correlationId
        const logEntry = loggerService.formatEntry('INFO', 'Processing shipment order', []);
        expect(logEntry.correlationId).toBe(correlationId);

        // Step 3: OutboxWriter writes domain event and attaches correlationId into payload.metadata
        const domainEvent = {
          aggregateType: 'SHIPMENT',
          aggregateId: 'shipment-101',
          eventType: 'SHIPMENT_DISPATCHED',
          payload: {
            shipmentCode: 'SHIP-101',
            carrierCode: 'GHN',
          },
        };

        const outboxRecord = await outboxWriter.record(mockPrisma as any, domainEvent);
        expect((outboxRecord.payload as any).metadata.correlationId).toBe(correlationId);

        // Step 4: Dispatching message to Cloudflare Queue propagates x-correlation-id in HTTP headers
        const queueResult = await queueClient.sendMessage({
          id: outboxRecord.id,
          aggregateType: outboxRecord.aggregateType,
          aggregateId: outboxRecord.aggregateId,
          eventType: outboxRecord.eventType,
          payload: outboxRecord.payload,
        });

        expect(queueResult.success).toBe(true);

        const fetchCalls = (global.fetch as jest.Mock).mock.calls;
        const queueCall = fetchCalls.find((c) => c[0].includes('queue.glowup.vn'));
        expect(queueCall).toBeDefined();
        expect(queueCall[1].headers['x-correlation-id']).toBe(correlationId);

        resolve();
      });
    });
  });

  it('Part 2: Dead Letter Queue (DLQ) event recording, alert notification, and idempotent replay (EP12-T02)', async () => {
    // Step 1: Simulate message falling into DLQ
    const dlqMessage = await dlqOperationsService.recordDlqMessage({
      carrierCode: 'GHN',
      eventId: 'ghn-evt-fail-888',
      trackingCode: 'GHN888',
      errorMessage: 'Max retry attempts exceeded in Cloudflare Queue',
      payload: { carrier: 'GHN', status: 'DELIVERED' },
      queueName: 'glowup-logistics-webhooks-dlq',
    });

    expect(dlqMessage.processedStatus).toBe('DEAD_LETTER');

    // Step 2: Instant alerting fired to Discord and Slack (AC2)
    const alertCalls = (global.fetch as jest.Mock).mock.calls.filter(
      (c) => c[0].includes('discord.com') || c[0].includes('slack.com'),
    );
    expect(alertCalls.length).toBeGreaterThanOrEqual(2);

    // Step 3: DevOps queries DLQ messages via Admin Controller
    const dlqQuery = await dlqController.listDlqMessages({ page: 1, limit: 10 });
    expect(dlqQuery.total).toBe(1);
    expect(dlqQuery.data[0].processedStatus).toBe('DEAD_LETTER');

    // Step 4: DevOps triggers idempotent replay via Admin Controller (AC1)
    const replayResult = await dlqController.replayMessages({
      inboxId: 'inbox-dlq-001',
    });

    expect(replayResult.totalRequested).toBe(1);
    expect(replayResult.successCount).toBe(1);
    expect(replayResult.failedCount).toBe(0);
    expect(mockPrisma.shippingWebhookInbox.update).toHaveBeenCalledWith({
      where: { id: 'inbox-dlq-001' },
      data: {
        processedStatus: 'PENDING',
        errorMessage: null,
      },
    });
    expect(mockWebhookProcessor.processEvent).toHaveBeenCalledWith('inbox-dlq-001');

    // Step 5: DevOps resets stuck outbox events
    const retryOutboxResult = await dlqController.retryStuckOutbox({ thresholdRetries: 3 });
    expect(retryOutboxResult.resetCount).toBe(1);
    expect(mockPrisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['stuck-outbox-1'] } },
      data: {
        status: 'PENDING',
        retryCount: 0,
        lastError: null,
      },
    });
  });
});
