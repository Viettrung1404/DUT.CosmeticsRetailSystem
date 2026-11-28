import { OutboxWriterService } from '../outbox-writer.service';
import { runWithCorrelationContext } from '@core/logger/correlation-context';

describe('OutboxWriterService Tracing (EP12-T01)', () => {
  let service: OutboxWriterService;
  let mockTx: any;

  beforeEach(() => {
    service = new OutboxWriterService();
    mockTx = {
      outboxEvent: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: data.id, ...data })),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
  });

  it('should automatically inject correlationId from context into outbox event payload metadata', async () => {
    const correlationId = 'trace-corr-outbox-111';

    await runWithCorrelationContext(correlationId, async () => {
      const event = {
        aggregateType: 'SHIPMENT',
        aggregateId: 'shipment-123',
        eventType: 'SHIPMENT_DISPATCHED',
        payload: {
          shipmentCode: 'SHIP-999',
          carrierCode: 'GHN',
        },
      };

      await service.record(mockTx, event);

      expect(mockTx.outboxEvent.create).toHaveBeenCalled();
      const createdData = mockTx.outboxEvent.create.mock.calls[0][0].data;
      expect(createdData.payload.metadata).toBeDefined();
      expect(createdData.payload.metadata.correlationId).toBe(correlationId);
      expect(createdData.payload.shipmentCode).toBe('SHIP-999');
    });
  });

  it('should inject correlationId for batch recordMany', async () => {
    const correlationId = 'trace-corr-outbox-222';

    await runWithCorrelationContext(correlationId, async () => {
      const events = [
        {
          aggregateType: 'ORDER',
          aggregateId: 'order-1',
          eventType: 'ORDER_SPLIT',
          payload: { orderId: 'order-1' },
        },
        {
          aggregateType: 'ORDER',
          aggregateId: 'order-2',
          eventType: 'ORDER_SPLIT',
          payload: { orderId: 'order-2' },
        },
      ];

      await service.recordMany(mockTx, events);

      expect(mockTx.outboxEvent.createMany).toHaveBeenCalled();
      const createdItems = mockTx.outboxEvent.createMany.mock.calls[0][0].data;
      expect(createdItems).toHaveLength(2);
      expect(createdItems[0].payload.metadata.correlationId).toBe(correlationId);
      expect(createdItems[1].payload.metadata.correlationId).toBe(correlationId);
    });
  });

  it('should generate fallback UUID if recorded outside correlation context and payload has no correlationId', async () => {
    const event = {
      aggregateType: 'INVENTORY',
      aggregateId: 'inv-1',
      eventType: 'STOCK_RESERVED',
      payload: { quantity: 5 },
    };

    await service.record(mockTx, event);

    expect(mockTx.outboxEvent.create).toHaveBeenCalled();
    const createdData = mockTx.outboxEvent.create.mock.calls[0][0].data;
    expect(createdData.payload.metadata.correlationId).toBeDefined();
    expect(createdData.payload.metadata.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should trigger OutboxRelayScheduler asynchronously after recording events', async () => {
    const triggerRelayNow = jest.fn();
    const eventDrivenWriter = new OutboxWriterService({
      triggerRelayNow,
    } as any);

    await eventDrivenWriter.record(mockTx, {
      aggregateType: 'ORDER',
      aggregateId: 'ord-trigger-1',
      eventType: 'ORDER_CREATED',
      payload: { orderId: 'ord-trigger-1' },
    });

    await eventDrivenWriter.recordMany(mockTx, [
      {
        aggregateType: 'ORDER',
        aggregateId: 'ord-trigger-2',
        eventType: 'ORDER_PAID',
        payload: { orderId: 'ord-trigger-2' },
      },
    ]);

    expect(triggerRelayNow).toHaveBeenCalledTimes(2);
  });
});
