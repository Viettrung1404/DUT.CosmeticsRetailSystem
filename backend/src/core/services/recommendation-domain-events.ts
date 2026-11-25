import { EventEmitter } from 'events';

export const RECOMMENDATION_EVENTS = {
  ORDER_PURCHASED: 'recommendation.order_purchased',
  CART_ITEM_ADDED: 'recommendation.cart_item_added',
} as const;

export interface OrderPurchasedEventPayload {
  orderId: string;
  trigger:
    | 'ORDER_CREATED_COD'
    | 'PAYMENT_RECEIVED'
    | 'CONFIRMED'
    | 'POS_COMPLETED';
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
  recommendationDomainEvents.emit(RECOMMENDATION_EVENTS.ORDER_PURCHASED, payload);
}

export function emitCartItemAdded(payload: CartItemAddedEventPayload): void {
  recommendationDomainEvents.emit(RECOMMENDATION_EVENTS.CART_ITEM_ADDED, payload);
}
