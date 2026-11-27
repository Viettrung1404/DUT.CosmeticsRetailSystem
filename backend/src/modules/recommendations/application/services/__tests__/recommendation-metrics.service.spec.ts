import { BehaviorEventType, RecommendationPlacement } from '@prisma/client';
import { randomUUID } from 'crypto';
import { RecommendationMetricsService } from '../recommendation-metrics.service';
import { IngestBehaviorBatchUseCase } from '../../use-cases/ingest-behavior-batch.use-case';
import { createTrackingFixture } from '../../../../../../test/support/recommendation-tracking.fixture';
import { OrderPurchaseEventListener } from '../../listeners/order-purchase-event.listener';

describe('RecommendationMetricsService & Attribution E2E Flow', () => {
  it('does NOT query DB when RAM buffer is empty (preserves Neon auto-suspend)', async () => {
    const repo = {
      flushDailyMetricsCounters: jest.fn(),
      queryAdminDailyMetrics: jest.fn().mockResolvedValue([]),
    };
    const service = new RecommendationMetricsService(repo as any);

    const res = await service.flushBuffer();
    expect(res).toEqual({ flushed: false, placementsUpdated: 0 });
    expect(repo.flushDailyMetricsCounters).not.toHaveBeenCalled();

    await service.onModuleDestroy();
    expect(repo.flushDailyMetricsCounters).not.toHaveBeenCalled();
  });

  it('buffers impressions/clicks/addToCarts and flushes them on onModuleDestroy()', async () => {
    const repo = {
      flushDailyMetricsCounters: jest.fn().mockResolvedValue(2),
      queryAdminDailyMetrics: jest.fn().mockResolvedValue([]),
    };
    const service = new RecommendationMetricsService(repo as any);

    service.recordImpressions([
      { placement: RecommendationPlacement.HOME, count: 10 },
      { placement: RecommendationPlacement.PRODUCT_SIMILAR, count: 5 },
    ]);
    service.recordClicksFromEvents([
      { source: 'rec_home' },
      { source: 'rec_home' },
      { source: 'rec_similar' },
      { source: 'organic_search' }, // ignored
    ]);
    service.recordAddToCart('rec_similar');

    await service.onModuleDestroy();

    expect(repo.flushDailyMetricsCounters).toHaveBeenCalledTimes(1);
    expect(repo.flushDailyMetricsCounters).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          placement: RecommendationPlacement.HOME,
          impressions: 10,
          clicks: 2,
          addToCarts: 0,
        },
        {
          placement: RecommendationPlacement.PRODUCT_SIMILAR,
          impressions: 5,
          clicks: 1,
          addToCarts: 1,
        },
      ]),
    );
    expect(service.isBufferEmpty()).toBe(true);
  });

  it('tracks end-to-end Attribution funnel (Impression + Click -> AddToCart -> Order Conversion -> CTR/CVR/Revenue)', async () => {
    const fixture = createTrackingFixture();
    const repo: any = fixture.repository;
    Object.assign(repo, {
      findVariantContext: jest.fn().mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        product: { categoryId: 'cat-1', brandId: 'brand-1' },
      }),
      findOrderForBehaviorTracking: jest.fn().mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
        customerId: 'cust-1',
        orderType: 'ONLINE',
        items: [
          {
            id: 'oi-1',
            productVariantId: 'var-1',
            quantity: 1,
            totalPrice: 450000,
            attributionSource: 'rec_similar',
            variant: {
              productId: 'prod-1',
              product: { categoryId: 'cat-1', brandId: 'brand-1' },
            },
          },
        ],
      }),
      queryAdminDailyMetrics: jest.fn(async () =>
        Array.from(fixture.state.metrics.values()),
      ),
    });

    const metricsService = new RecommendationMetricsService(repo);
    const ingestUseCase = new IngestBehaviorBatchUseCase(repo);
    const orderListener = new OrderPurchaseEventListener(repo);

    // 1. Client views placement (10 impressions) and clicks 2 recommended items
    await ingestUseCase.executeClientBatch(
      {
        anonymousId: randomUUID(),
        impressions: [
          { placement: RecommendationPlacement.PRODUCT_SIMILAR, count: 10 },
        ],
        events: [
          {
            id: randomUUID(),
            eventType: BehaviorEventType.SEARCH_CLICK,
            productId: randomUUID(),
            source: 'rec_similar',
          },
          {
            id: randomUUID(),
            eventType: BehaviorEventType.SEARCH_CLICK,
            productId: randomUUID(),
            source: 'rec_similar',
          },
        ],
      },
      'cust-1',
    );

    // 2. Customer adds product to cart with attributionSource
    await orderListener.handleCartItemAdded({
      productVariantId: 'var-1',
      customerId: 'cust-1',
      sessionId: null,
      quantity: 1,
      price: 450000,
      attributionSource: 'rec_similar',
    });

    // 3. Flush buffer (periodic / cron / shutdown)
    await metricsService.flushBuffer();

    // 4. Customer completes order -> PURCHASE conversion + revenue
    await orderListener.handleOrderPurchased({
      orderId: 'order-1',
      trigger: 'PAYMENT_RECEIVED',
    });

    // 5. Admin queries analytics report
    const report = await metricsService.getMetricsReport();
    const similarMetrics = report.byPlacement.find(
      (p) => p.placement === RecommendationPlacement.PRODUCT_SIMILAR,
    )!;

    expect(similarMetrics).toEqual({
      placement: RecommendationPlacement.PRODUCT_SIMILAR,
      impressions: 10,
      clicks: 2,
      addToCarts: 1,
      conversions: 1,
      revenue: 450000,
      ctr: 0.2, // 2 / 10
      cvr: 0.5, // 1 / 2
    });
    expect(report.totals).toEqual({
      impressions: 10,
      clicks: 2,
      addToCarts: 1,
      conversions: 1,
      revenue: 450000,
      ctr: 0.2,
      cvr: 0.5,
    });
  });
});
