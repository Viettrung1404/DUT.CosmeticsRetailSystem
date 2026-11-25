import { BehaviorEventType, RecommendationPlacement } from '@prisma/client';
import { randomUUID } from 'crypto';
import { OrderPurchaseEventListener } from '../order-purchase-event.listener';

describe('OrderPurchaseEventListener', () => {
  let mockRepository: {
    findOrderForBehaviorTracking: jest.Mock;
    findVariantContext: jest.Mock;
    createBehaviorEventsBatch: jest.Mock;
    incrementDailyAttributionMetrics: jest.Mock;
  };
  let listener: OrderPurchaseEventListener;

  beforeEach(() => {
    mockRepository = {
      findOrderForBehaviorTracking: jest.fn(),
      findVariantContext: jest.fn(),
      createBehaviorEventsBatch: jest.fn().mockResolvedValue({ count: 1 }),
      incrementDailyAttributionMetrics: jest.fn().mockResolvedValue(undefined),
    };
    listener = new OrderPurchaseEventListener(mockRepository as any);
  });

  it('records PURCHASE normalized to parent productId while keeping variantId and updates attribution metrics', async () => {
    const orderId = randomUUID();
    const customerId = randomUUID();
    const itemId1 = randomUUID();
    const variantId1 = randomUUID();
    const productId1 = randomUUID();
    const categoryId1 = randomUUID();
    const brandId1 = randomUUID();

    mockRepository.findOrderForBehaviorTracking.mockResolvedValueOnce({
      id: orderId,
      orderNumber: 'ORD-20261125-001',
      customerId,
      orderType: 'ONLINE',
      items: [
        {
          id: itemId1,
          productVariantId: variantId1,
          quantity: 2,
          totalPrice: 350000,
          attributionSource: 'rec_similar',
          variant: {
            productId: productId1,
            product: {
              categoryId: categoryId1,
              brandId: brandId1,
            },
          },
        },
      ],
    });

    await listener.handleOrderPurchased({ orderId, trigger: 'PAYMENT_RECEIVED' });

    expect(mockRepository.createBehaviorEventsBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        customerId,
        anonymousId: `customer:${customerId}`,
        eventType: BehaviorEventType.PURCHASE,
        productId: productId1,
        variantId: variantId1,
        categoryId: categoryId1,
        brandId: brandId1,
        weight: 10.0,
        source: 'rec_similar',
        metadata: expect.objectContaining({
          orderId,
          orderItemId: itemId1,
          quantity: 2,
          totalPrice: 350000,
        }),
      }),
    ]);

    // Deterministic UUID allows safe deduplication on duplicate order/payment events
    const createdRow = mockRepository.createBehaviorEventsBatch.mock.calls[0][0][0];
    expect(createdRow.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    expect(mockRepository.incrementDailyAttributionMetrics).toHaveBeenCalledWith([
      {
        placement: RecommendationPlacement.PRODUCT_SIMILAR,
        conversions: 1,
        revenue: 350000,
      },
    ]);
  });

  it('records ADD_TO_CART server-side normalized to parent productId', async () => {
    const customerId = randomUUID();
    const variantId = randomUUID();
    const productId = randomUUID();
    const categoryId = randomUUID();
    const brandId = randomUUID();

    mockRepository.findVariantContext.mockResolvedValueOnce({
      id: variantId,
      productId,
      product: { categoryId, brandId },
    });

    await listener.handleCartItemAdded({
      customerId,
      sessionId: null,
      productVariantId: variantId,
      quantity: 1,
      price: 290000,
      attributionSource: 'rec_home',
    });

    expect(mockRepository.createBehaviorEventsBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        customerId,
        anonymousId: `customer:${customerId}`,
        eventType: BehaviorEventType.ADD_TO_CART,
        productId,
        variantId,
        categoryId,
        brandId,
        weight: 5.0,
        source: 'rec_home',
      }),
    ]);
  });
});
