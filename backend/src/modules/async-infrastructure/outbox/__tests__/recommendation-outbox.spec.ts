import {
  enqueueRecommendationPurchase,
  recommendationDomainEvents,
  RECOMMENDATION_EVENTS,
  RECOMMENDATION_PURCHASE_OUTBOX_TYPE,
} from '@core/services/recommendation-domain-events';
import { OutboxRelayScheduler } from '../outbox-relay.scheduler';

describe('Durable recommendation purchase delivery', () => {
  it('writes a stable outbox ID into the supplied order transaction', async () => {
    const tx = { outboxEvent: { createMany: jest.fn() } };
    await enqueueRecommendationPurchase(tx as any, {
      orderId: 'order',
      trigger: 'ORDER_CREATED_COD',
    });
    await enqueueRecommendationPurchase(tx as any, {
      orderId: 'order',
      trigger: 'PAYMENT_RECEIVED',
    });
    const [first, second] = tx.outboxEvent.createMany.mock.calls.map(
      ([args]) => args,
    );
    expect(first.data[0].id).toBe(second.data[0].id);
    expect(first).toMatchObject({
      skipDuplicates: true,
      data: [
        { eventType: RECOMMENDATION_PURCHASE_OUTBOX_TYPE, status: 'PENDING' },
      ],
    });
  });

  it('keeps the outbox event pending on tracking failure and publishes only after retry succeeds', async () => {
    const payload = { orderId: 'order', trigger: 'PAYMENT_RECEIVED' };
    const handler = jest
      .fn()
      .mockRejectedValueOnce(new Error('DB_UNAVAILABLE'))
      .mockResolvedValue(undefined);
    recommendationDomainEvents.on(
      RECOMMENDATION_EVENTS.PROCESS_PURCHASE,
      handler,
    );
    const executeRaw = jest.fn();
    const tx = {
      $queryRaw: async () => [
        {
          id: 'event',
          aggregate_type: 'ORDER',
          aggregate_id: 'order',
          event_type: RECOMMENDATION_PURCHASE_OUTBOX_TYPE,
          payload,
          retry_count: 0,
        },
      ],
      $executeRaw: executeRaw,
    };
    const queue = { sendMessage: jest.fn() };
    const relay = new OutboxRelayScheduler(
      { $transaction: async (work: any) => work(tx) } as any,
      { get: () => 'true' } as any,
      queue as any,
    );
    try {
      expect(await relay.relayBatch()).toEqual({
        processed: 1,
        succeeded: 0,
        failed: 1,
      });
      expect(executeRaw.mock.calls[0][0].join(' ')).toContain(
        'retry_count = retry_count + 1',
      );
      expect(await relay.relayBatch()).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
      });
      expect(executeRaw.mock.calls[1][0].join(' ')).toContain(
        "status = 'PUBLISHED'",
      );
      expect(handler).toHaveBeenCalledTimes(2);
      expect(queue.sendMessage).not.toHaveBeenCalled();
    } finally {
      recommendationDomainEvents.off(
        RECOMMENDATION_EVENTS.PROCESS_PURCHASE,
        handler,
      );
    }
  });
});
