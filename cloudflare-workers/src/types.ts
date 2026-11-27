export interface Queue<T = any> {
  send(message: T): Promise<void>;
  sendBatch(messages: { body: T }[]): Promise<void>;
}

export interface Message<T = any> {
  id: string;
  timestamp: Date;
  body: T;
  ack(): void;
  retry(): void;
}

export interface MessageBatch<T = any> {
  queue: string;
  messages: readonly Message<T>[];
  ackAll(): void;
  retryAll(): void;
}

export interface CronController {
  cron: string;
  scheduledTime: number;
  noRetry?: () => void;
}

export interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}

export interface Env {
  ENVIRONMENT?: string;
  GHN_WEBHOOK_SECRET?: string;
  AHAMOVE_WEBHOOK_SECRET?: string;
  NESTJS_INTERNAL_URL?: string;
  INTERNAL_DISPATCH_SECRET?: string;
  JWT_SECRET?: string;
  LOGISTICS_WEBHOOK_QUEUE: Queue<any>;
  RECOMMENDATION_EVENTS_QUEUE?: Queue<RecommendationEventsQueueMessage>;
}

export interface LogisticsWebhookMessage {
  id: string;
  carrierCode: 'GHN' | 'AHAMOVE' | 'GENERIC';
  receivedAt: string;
  headers: Record<string, string>;
  payload: any;
}

export type ClientBehaviorEventType =
  | 'VIEW_PRODUCT'
  | 'SEARCH_QUERY'
  | 'SEARCH_CLICK'
  | 'TRY_ON_COLOR'
  | 'ADD_TO_WISHLIST';

export interface RecommendationBehaviorEvent {
  id: string;
  eventType: ClientBehaviorEventType | string;
  productId?: string;
  variantId?: string;
  categoryId?: string;
  brandId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface RecommendationImpression {
  placement: string;
  count: number;
}

export interface RecommendationEventsQueueMessage {
  batchId?: string;
  id: string;
  anonymousId: string;
  customerId: string | null;
  userId?: string | null;
  receivedAt: string;
  events: RecommendationBehaviorEvent[];
  impressions?: RecommendationImpression[];
}
