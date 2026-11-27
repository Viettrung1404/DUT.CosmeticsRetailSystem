import { BehaviorEventType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createTrackingFixture } from '../../../../../test/support/recommendation-tracking.fixture';

describe('Transactional recommendation tracking', () => {
  const click = () => ({
    id: randomUUID(),
    anonymousId: randomUUID(),
    eventType: BehaviorEventType.SEARCH_CLICK,
    source: 'rec_home',
  });

  it('deduplicates retried events and impressions, including impression-only batches', async () => {
    const { repository, state } = createTrackingFixture();
    const event = click();
    const batch = {
      batchId: randomUUID(),
      anonymousId: event.anonymousId,
      events: [event],
      impressions: [{ placement: 'HOME' as const, count: 1 }],
    };
    await repository.persistTrackedBehaviorBatch([event], [batch]);
    await repository.persistTrackedBehaviorBatch([event], [batch]);
    const onlyImpressions = { ...batch, batchId: randomUUID(), events: [] };
    await repository.persistTrackedBehaviorBatch([], [onlyImpressions]);
    await repository.persistTrackedBehaviorBatch([], [onlyImpressions]);
    expect(state.events.size).toBe(1);
    expect(state.metrics.get('HOME')).toMatchObject({
      clicks: 1,
      impressions: 2,
    });
  });

  it('counts only newly inserted clicks when retry overlaps with a new event', async () => {
    const { repository, state } = createTrackingFixture();
    const first = click();
    await repository.persistTrackedBehaviorBatch([first]);
    await repository.persistTrackedBehaviorBatch([
      first,
      click(),
      { ...click(), eventType: BehaviorEventType.VIEW_PRODUCT },
    ]);
    expect(state.metrics.get('HOME').clicks).toBe(2);
  });

  it('deduplicates legacy event-batch impressions using stable event IDs', async () => {
    const { repository, state } = createTrackingFixture();
    const event = click();
    const batch = {
      anonymousId: event.anonymousId,
      events: [event],
      impressions: [{ placement: 'HOME' as const, count: 1 }],
    };
    await repository.persistTrackedBehaviorBatch([event], [batch]);
    await repository.persistTrackedBehaviorBatch([event], [batch]);
    expect(state.metrics.get('HOME')).toMatchObject({
      impressions: 1,
      clicks: 1,
    });
    await expect(
      repository.persistTrackedBehaviorBatch([], [{ ...batch, events: [] }]),
    ).rejects.toThrow('batchId is required');
  });

  it('rolls back events and batch receipts when metric write fails, so retry recovers all counters', async () => {
    const fixture = createTrackingFixture();
    const event = click();
    const batch = {
      batchId: randomUUID(),
      anonymousId: event.anonymousId,
      events: [event],
      impressions: [{ placement: 'HOME' as const, count: 1 }],
    };
    fixture.failNextMetricWrite();
    await expect(
      fixture.repository.persistTrackedBehaviorBatch([event], [batch]),
    ).rejects.toThrow('METRIC_WRITE_FAILED');
    expect(fixture.state.events.size).toBe(0);
    expect(fixture.state.receipts.size).toBe(0);
    await fixture.repository.persistTrackedBehaviorBatch([event], [batch]);
    expect(fixture.state.metrics.get('HOME')).toMatchObject({
      clicks: 1,
      impressions: 1,
    });
  });

  it('recovers purchase revenue after failure and excludes existing items on partial replay', async () => {
    const fixture = createTrackingFixture();
    const purchase = {
      ...click(),
      eventType: BehaviorEventType.PURCHASE,
      metadata: { totalPrice: 120000 },
    };
    fixture.failNextMetricWrite();
    await expect(
      fixture.repository.persistTrackedBehaviorBatch([purchase]),
    ).rejects.toThrow();
    await fixture.repository.persistTrackedBehaviorBatch([purchase]);
    await fixture.repository.persistTrackedBehaviorBatch([
      purchase,
      { ...purchase, id: randomUUID(), metadata: { totalPrice: 80000 } },
    ]);
    await fixture.repository.persistTrackedBehaviorBatch([purchase]);
    expect(fixture.state.metrics.get('HOME')).toMatchObject({
      conversions: 2,
      revenue: 200000,
      clicks: 0,
    });
  });
});
