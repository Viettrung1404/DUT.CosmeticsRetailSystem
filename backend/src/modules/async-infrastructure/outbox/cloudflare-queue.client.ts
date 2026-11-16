import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getCorrelationId } from '@core/logger/correlation-context';

export const CLOUDFLARE_QUEUE_CLIENT = Symbol('CLOUDFLARE_QUEUE_CLIENT');

export interface QueueMessage {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  occurredAt?: string;
}

export interface QueueSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export interface QueueBatchSendResult {
  success: boolean;
  sentCount: number;
  failedIds?: string[];
  statusCode?: number;
  error?: string;
}

export interface ICloudflareQueueClient {
  sendMessage(message: QueueMessage): Promise<QueueSendResult>;
  sendBatch(messages: QueueMessage[]): Promise<QueueBatchSendResult>;
}

@Injectable()
export class CloudflareQueueClient implements ICloudflareQueueClient {
  private readonly logger = new Logger(CloudflareQueueClient.name);
  private readonly producerUrl: string;
  private readonly apiToken: string;
  private readonly isMockEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.producerUrl = this.configService.get<string>('CLOUDFLARE_QUEUE_PRODUCER_URL') || '';
    this.apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN') || '';
    this.isMockEnabled =
      this.configService.get<string>('CLOUDFLARE_QUEUE_MOCK_ENABLED') === 'true' ||
      !this.producerUrl;
  }

  async sendMessage(message: QueueMessage): Promise<QueueSendResult> {
    if (this.isMockEnabled) {
      this.logger.debug(`[MOCK] Dispatched message to Cloudflare Queue: ${message.eventType} [${message.id}]`);
      return { success: true, messageId: `mock-msg-${message.id}`, statusCode: 200 };
    }

    try {
      const correlationId =
        getCorrelationId() ||
        message.payload?.metadata?.correlationId;

      const response = await fetch(this.producerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
          'X-Event-Type': message.eventType,
          ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.warn(`Cloudflare Queue HTTP ${response.status}: ${errorText}`);
        return {
          success: false,
          statusCode: response.status,
          error: `HTTP_${response.status}: ${errorText || response.statusText}`,
        };
      }

      const resBody = await response.json().catch(() => ({}));
      return {
        success: true,
        messageId: resBody?.messageId || resBody?.id || `cf-${Date.now()}`,
        statusCode: response.status,
      };
    } catch (err: any) {
      this.logger.error(`Cloudflare Queue network error: ${err.message}`, err.stack);
      return {
        success: false,
        statusCode: 503,
        error: `NETWORK_ERROR: ${err.message}`,
      };
    }
  }

  async sendBatch(messages: QueueMessage[]): Promise<QueueBatchSendResult> {
    if (!messages || messages.length === 0) {
      return { success: true, sentCount: 0 };
    }

    if (this.isMockEnabled) {
      this.logger.debug(`[MOCK] Dispatched batch of ${messages.length} messages to Cloudflare Queue`);
      return { success: true, sentCount: messages.length, statusCode: 200 };
    }

    try {
      const correlationId = getCorrelationId();
      const response = await fetch(`${this.producerUrl}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
          ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
        },
        body: JSON.stringify({ messages }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          sentCount: 0,
          statusCode: response.status,
          error: `HTTP_${response.status}: ${errorText || response.statusText}`,
        };
      }

      return {
        success: true,
        sentCount: messages.length,
        statusCode: response.status,
      };
    } catch (err: any) {
      return {
        success: false,
        sentCount: 0,
        statusCode: 503,
        error: `NETWORK_ERROR: ${err.message}`,
      };
    }
  }
}
