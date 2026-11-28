import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';

export const RECOMMENDATION_PURCHASE_OUTBOX_TYPE = 'RECOMMENDATION_PURCHASE';

export const RECOMMENDATION_EVENTS = {
  ORDER_PURCHASED: 'recommendation.order_purchased',
  PROCESS_PURCHASE: 'recommendation.process_purchase',
  CART_ITEM_ADDED: 'recommendation.cart_item_added',
} as const;

export interface OrderPurchasedEventPayload {
  orderId: string;
  trigger:
    'ORDER_CREATED_COD' | 'PAYMENT_RECEIVED' | 'CONFIRMED' | 'POS_COMPLETED';
}

export interface CartItemAddedEventPayload {
  customerId: string | null;
  sessionId: string | null;
  productVariantId: string;
  quantity: number;
  price: number;
  attributionSource?: string | null;
}

class RecommendationDomainEventBus extends EventEmitter {}

export const recommendationDomainEvents = new RecommendationDomainEventBus();
recommendationDomainEvents.setMaxListeners(20);

export function emitOrderPurchased(payload: OrderPurchasedEventPayload): void {
  recommendationDomainEvents.emit(
    RECOMMENDATION_EVENTS.ORDER_PURCHASED,
    payload,
  );
}

/** Must be called inside the transaction that creates/fulfills the order. */
export async function enqueueRecommendationPurchase(
  tx: Prisma.TransactionClient,
  payload: OrderPurchasedEventPayload,
): Promise<void> {
  const bytes = createHash('sha256')
    .update(`recommendation-purchase:${payload.orderId}`)
    .digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString('hex');
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  await tx.outboxEvent.createMany({
    data: [
      {
        id,
        aggregateType: 'ORDER',
        aggregateId: payload.orderId,
        eventType: RECOMMENDATION_PURCHASE_OUTBOX_TYPE,
        payload: { ...payload },
        status: 'PENDING',
      },
    ],
    skipDuplicates: true,
  });
}

export async function processDurableRecommendationPurchase(
  payload: OrderPurchasedEventPayload,
): Promise<void> {
  const handlers = recommendationDomainEvents.listeners(
    RECOMMENDATION_EVENTS.PROCESS_PURCHASE,
  );
  if (!handlers.length)
    throw new Error('RECOMMENDATION_PURCHASE_HANDLER_UNAVAILABLE');
  for (const handler of handlers) await handler(payload);
}

export function emitCartItemAdded(payload: CartItemAddedEventPayload): void {
  recommendationDomainEvents.emit(
    RECOMMENDATION_EVENTS.CART_ITEM_ADDED,
    payload,
  );
}
