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

export interface Env {
  ENVIRONMENT?: string;
  GHN_WEBHOOK_SECRET?: string;
  AHAMOVE_WEBHOOK_SECRET?: string;
  NESTJS_INTERNAL_URL?: string;
  INTERNAL_DISPATCH_SECRET?: string;
  LOGISTICS_WEBHOOK_QUEUE: Queue<any>;
}

export interface LogisticsWebhookMessage {
  id: string;
  carrierCode: 'GHN' | 'AHAMOVE' | 'GENERIC';
  receivedAt: string;
  headers: Record<string, string>;
  payload: any;
}
