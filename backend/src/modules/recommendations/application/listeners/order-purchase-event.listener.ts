import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import {
  BehaviorEventType,
  Prisma,
  RecommendationPlacement,
} from '@prisma/client';
import { createHash } from 'crypto';
import {
  CartItemAddedEventPayload,
  OrderPurchasedEventPayload,
  RECOMMENDATION_EVENTS,
  recommendationDomainEvents,
} from '@core/services/recommendation-domain-events';
import { BehaviorWeightPolicy } from '../../domain/behavior-weight.policy';
import {
  DailyAttributionIncrement,
  RecommendationRepository,
} from '../../infrastructure/recommendation.repository';
import { RecommendationMetricsService } from '../services/recommendation-metrics.service';

const ATTRIBUTION_TO_PLACEMENT: Record<string, RecommendationPlacement> = {
  rec_home: RecommendationPlacement.HOME,
  rec_similar: RecommendationPlacement.PRODUCT_SIMILAR,
  rec_bought_together: RecommendationPlacement.PRODUCT_BOUGHT_TOGETHER,
  rec_cart: RecommendationPlacement.CART_ROUTINE,
};

function deterministicUuid(seed: string): string {
  const bytes = createHash('sha256').update(seed).digest();
  // Format as RFC 4122 UUID v4-compatible identifier for idempotent skipDuplicates
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

@Injectable()
export class OrderPurchaseEventListener
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(OrderPurchaseEventListener.name);

  private readonly onOrderPurchasedHandler = (
    payload: OrderPurchasedEventPayload,
  ) => {
    void this.handleOrderPurchased(payload).catch((err: any) => {
      this.logger.warn(
        `Failed to record PURCHASE behavior for order ${payload.orderId}: ${err?.message ?? 'unknown'}`,
      );
    });
  };

  private readonly onCartItemAddedHandler = (
    payload: CartItemAddedEventPayload,
  ) => {
    void this.handleCartItemAdded(payload).catch((err: any) => {
      this.logger.warn(
        `Failed to record ADD_TO_CART behavior for variant ${payload.productVariantId}: ${err?.message ?? 'unknown'}`,
      );
    });
  };

  constructor(
    private readonly repository: RecommendationRepository,
    @Optional() private readonly metricsService?: RecommendationMetricsService,
  ) {}

  onModuleInit(): void {
    recommendationDomainEvents.on(
      RECOMMENDATION_EVENTS.ORDER_PURCHASED,
      this.onOrderPurchasedHandler,
    );
    recommendationDomainEvents.on(
      RECOMMENDATION_EVENTS.CART_ITEM_ADDED,
      this.onCartItemAddedHandler,
    );
  }

  onModuleDestroy(): void {
    recommendationDomainEvents.off(
      RECOMMENDATION_EVENTS.ORDER_PURCHASED,
      this.onOrderPurchasedHandler,
    );
    recommendationDomainEvents.off(
      RECOMMENDATION_EVENTS.CART_ITEM_ADDED,
      this.onCartItemAddedHandler,
    );
  }

  async handleOrderPurchased(payload: OrderPurchasedEventPayload): Promise<void> {
    const order = await this.repository.findOrderForBehaviorTracking(
      payload.orderId,
    );
    if (!order || !order.items.length) {
      return;
    }

    const anonymousId = order.customerId
      ? `customer:${order.customerId}`
      : `order:${order.id}`;

    const rows: Prisma.UserBehaviorEventCreateManyInput[] = [];
    const attributionMetrics: DailyAttributionIncrement[] = [];

    for (const item of order.items) {
      const productId = item.variant?.productId ?? null;
      if (!productId) continue;

      rows.push({
        id: deterministicUuid(`purchase:${order.id}:${item.id}`),
        customerId: order.customerId ?? null,
        anonymousId,
        eventType: BehaviorEventType.PURCHASE,
        productId,
        variantId: item.productVariantId,
        categoryId: item.variant?.product?.categoryId ?? null,
        brandId: item.variant?.product?.brandId ?? null,
        weight: BehaviorWeightPolicy.getBaseWeight(BehaviorEventType.PURCHASE),
        source: item.attributionSource ?? null,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderItemId: item.id,
          orderType: order.orderType,
          quantity: item.quantity,
          totalPrice: Number(item.totalPrice),
        },
      });

      const placement = item.attributionSource
        ? ATTRIBUTION_TO_PLACEMENT[item.attributionSource]
        : undefined;
      if (placement) {
        attributionMetrics.push({
          placement,
          conversions: 1,
          revenue: Number(item.totalPrice),
        });
      }
    }

    let insertedCount = rows.length;
    if (rows.length > 0) {
      const result = await this.repository.createBehaviorEventsBatch(rows);
      if (typeof result?.count === 'number') {
        insertedCount = result.count;
      }
    }

    if (insertedCount > 0 && attributionMetrics.length > 0) {
      await this.repository.incrementDailyAttributionMetrics(
        attributionMetrics,
      );
    }
  }

  async handleCartItemAdded(payload: CartItemAddedEventPayload): Promise<void> {
    const variant = await this.repository.findVariantContext(
      payload.productVariantId,
    );
    if (!variant?.productId) {
      return;
    }

    const anonymousId = payload.sessionId
      ? payload.sessionId
      : payload.customerId
        ? `customer:${payload.customerId}`
        : `variant:${payload.productVariantId}`;

    await this.repository.createBehaviorEventsBatch([
      {
        customerId: payload.customerId ?? null,
        anonymousId,
        eventType: BehaviorEventType.ADD_TO_CART,
        productId: variant.productId,
        variantId: payload.productVariantId,
        categoryId: variant.product?.categoryId ?? null,
        brandId: variant.product?.brandId ?? null,
        weight: BehaviorWeightPolicy.getBaseWeight(
          BehaviorEventType.ADD_TO_CART,
        ),
        source: payload.attributionSource ?? null,
        metadata: {
          quantity: payload.quantity,
          price: payload.price,
        },
      },
    ]);

    this.metricsService?.recordAddToCart(payload.attributionSource);
  }
}
