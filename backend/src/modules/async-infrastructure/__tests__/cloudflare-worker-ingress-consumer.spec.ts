import workerHandler from '../../../../../cloudflare-workers/src/index';
import { handleQueueBatch } from '../../../../../cloudflare-workers/src/consumer';
import { Env, LogisticsWebhookMessage, Message, MessageBatch } from '../../../../../cloudflare-workers/src/types';

describe('EP09-T02 & EP09-T03: Cloudflare Worker Ingress & Queue Consumer', () => {
  let mockEnv: Env;
  let sentMessages: any[];

  beforeEach(() => {
    sentMessages = [];
    mockEnv = {
      ENVIRONMENT: 'test',
      GHN_WEBHOOK_SECRET: 'ghn-secret-test-key',
      AHAMOVE_WEBHOOK_SECRET: 'ahamove-secret-test-key',
      NESTJS_INTERNAL_URL: 'http://127.0.0.1:3000',
      INTERNAL_DISPATCH_SECRET: 'internal-secret-token-xyz',
      LOGISTICS_WEBHOOK_QUEUE: {
        send: jest.fn(async (msg: any) => {
          sentMessages.push(msg);
        }),
        sendBatch: jest.fn(),
      },
    };
    jest.restoreAllMocks();
  });

  describe('EP09-T02: Webhook Ingress at Edge', () => {
    it('GET /health returns 200 OK', async () => {
      const request = new Request('https://edge.glowup.vn/health', {
        method: 'GET',
      });
      const response = await workerHandler.fetch(request, mockEnv);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
    });

    it('AC2 Verification: GHN Webhook with invalid token returns 401 Unauthorized', async () => {
      const request = new Request('https://edge.glowup.vn/webhooks/ghn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: 'invalid-token-123',
        },
        body: JSON.stringify({ OrderCode: 'GHN-999', Status: 'delivered' }),
      });

      const response = await workerHandler.fetch(request, mockEnv);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('UNAUTHORIZED');
      expect(mockEnv.LOGISTICS_WEBHOOK_QUEUE.send).not.toHaveBeenCalled();
    });

    it('AC3 Verification: GHN Webhook with valid token enqueues message and returns 200 OK', async () => {
      const payload = {
        OrderCode: 'GHN-88888',
        Status: 'delivered',
        Time: '2026-11-16T17:00:00Z',
      };

      const request = new Request('https://edge.glowup.vn/webhooks/ghn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: 'ghn-secret-test-key',
        },
        body: JSON.stringify(payload),
      });

      const response = await workerHandler.fetch(request, mockEnv);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Enqueued successfully');
      expect(data.messageId).toBeDefined();

      expect(mockEnv.LOGISTICS_WEBHOOK_QUEUE.send).toHaveBeenCalledTimes(1);
      expect(sentMessages[0].carrierCode).toBe('GHN');
      expect(sentMessages[0].payload).toEqual(payload);
    });

    it('Ahamove Webhook with valid token enqueues message and returns 200 OK', async () => {
      const payload = {
        _id: '22VMV99999',
        status: 'COMPLETED',
        dropoff_status: 'SUCCESS',
      };

      const request = new Request('https://edge.glowup.vn/webhooks/ahamove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ahamove-Token': 'ahamove-secret-test-key',
        },
        body: JSON.stringify(payload),
      });

      const response = await workerHandler.fetch(request, mockEnv);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(sentMessages[0].carrierCode).toBe('AHAMOVE');
      expect(sentMessages[0].payload).toEqual(payload);
    });

    it('returns 500 when Cloudflare Queue fails to enqueue to trigger 3PL retry', async () => {
      mockEnv.LOGISTICS_WEBHOOK_QUEUE.send = jest
        .fn()
        .mockRejectedValue(new Error('Cloudflare Queue Storage Timeout'));

      const request = new Request('https://edge.glowup.vn/webhooks/ghn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: 'ghn-secret-test-key',
        },
        body: JSON.stringify({ OrderCode: 'GHN-FAIL' }),
      });

      const response = await workerHandler.fetch(request, mockEnv);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('QUEUE_ENQUEUE_FAILED');
    });
  });

  describe('EP09-T03: Cloudflare Queue Consumer & Internal Dispatcher', () => {
    const createMockMessage = (
      id: string,
      carrierCode: 'GHN' | 'AHAMOVE',
      payload: any,
    ): Message<LogisticsWebhookMessage> => {
      return {
        id,
        timestamp: new Date(),
        body: {
          id,
          carrierCode,
          receivedAt: new Date().toISOString(),
          headers: {},
          payload,
        },
        ack: jest.fn(),
        retry: jest.fn(),
      };
    };

    it('AC1 Verification: successfully calls NestJS internal endpoint and acks messages in batch of 10', async () => {
      const messages = Array.from({ length: 10 }, (_, i) =>
        createMockMessage(`msg-${i + 1}`, 'GHN', { OrderCode: `GHN-${i + 1}` }),
      );

      const batch: MessageBatch<LogisticsWebhookMessage> = {
        queue: 'glowup-logistics-webhooks',
        messages,
        ackAll: jest.fn(),
        retryAll: jest.fn(),
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, status: 'PROCESSED' }),
      } as any);

      await handleQueueBatch(batch, mockEnv);

      // Mọi message trong lô 10 đều được gửi kèm X-Internal-Token và ack() thành công
      expect(global.fetch).toHaveBeenCalledTimes(10);
      messages.forEach((msg) => {
        expect(msg.ack).toHaveBeenCalled();
        expect(msg.retry).not.toHaveBeenCalled();
      });

      // Kiểm tra request đầu tiên có đúng header và payload
      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:3000/api/v1/internal/webhooks/consume',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Internal-Token': 'internal-secret-token-xyz',
            'X-Carrier-Code': 'GHN',
          }),
        }),
      );
    });

    it('AC2 Verification: retries message when NestJS returns 500 or Network Timeout', async () => {
      const msg1 = createMockMessage('msg-err-1', 'GHN', { OrderCode: 'GHN-ERR-1' });
      const msg2 = createMockMessage('msg-err-2', 'AHAMOVE', { _id: '22VMV-ERR-2' });

      const batch: MessageBatch<LogisticsWebhookMessage> = {
        queue: 'glowup-logistics-webhooks',
        messages: [msg1, msg2],
        ackAll: jest.fn(),
        retryAll: jest.fn(),
      };

      // Message 1 trả 500
      // Message 2 bị reject network error
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as any)
        .mockRejectedValueOnce(new Error('Connection reset by peer'));

      await handleQueueBatch(batch, mockEnv);

      expect(msg1.retry).toHaveBeenCalled();
      expect(msg1.ack).not.toHaveBeenCalled();

      expect(msg2.retry).toHaveBeenCalled();
      expect(msg2.ack).not.toHaveBeenCalled();
    });

    it('acks unprocessable 4xx messages to prevent infinite retries without blocking batch', async () => {
      const msg = createMockMessage('msg-bad-req', 'GHN', { Invalid: true });
      const batch: MessageBatch<LogisticsWebhookMessage> = {
        queue: 'glowup-logistics-webhooks',
        messages: [msg],
        ackAll: jest.fn(),
        retryAll: jest.fn(),
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as any);

      await handleQueueBatch(batch, mockEnv);

      expect(msg.ack).toHaveBeenCalled();
      expect(msg.retry).not.toHaveBeenCalled();
    });
  });
});
