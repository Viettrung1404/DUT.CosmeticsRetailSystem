import { createHmac, randomUUID } from 'crypto';
import workerHandler from '../../../../../cloudflare-workers/src/index';
import { handleQueueBatch } from '../../../../../cloudflare-workers/src/consumer';
import {
  Env,
  LogisticsWebhookMessage,
  Message,
  MessageBatch,
  RecommendationEventsQueueMessage,
} from '../../../../../cloudflare-workers/src/types';

function signHs256Jwt(payload: Record<string, unknown>, secret: string): string {
  const b64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(payload);
  const sig = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

describe('EP09-T02 & EP09-T03: Cloudflare Worker Ingress & Queue Consumer', () => {
  let mockEnv: Env;
  let sentMessages: any[];
  let sentRecommendationMessages: RecommendationEventsQueueMessage[];

  beforeEach(() => {
    sentMessages = [];
    sentRecommendationMessages = [];
    mockEnv = {
      ENVIRONMENT: 'test',
      GHN_WEBHOOK_SECRET: 'ghn-secret-test-key',
      AHAMOVE_WEBHOOK_SECRET: 'ahamove-secret-test-key',
      NESTJS_INTERNAL_URL: 'http://127.0.0.1:3000',
      INTERNAL_DISPATCH_SECRET: 'internal-secret-token-xyz',
      JWT_SECRET: 'worker-edge-jwt-secret-key-2026',
      LOGISTICS_WEBHOOK_QUEUE: {
        send: jest.fn(async (msg: any) => {
          sentMessages.push(msg);
        }),
        sendBatch: jest.fn(),
      },
      RECOMMENDATION_EVENTS_QUEUE: {
        send: jest.fn(async (msg: RecommendationEventsQueueMessage) => {
          sentRecommendationMessages.push(msg);
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

  describe('Recommendation Events Edge Ingress, Consumer & Cron Triggers', () => {
    const browserUa =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36';

    it('returns 204 with Access-Control-Max-Age: 86400 on OPTIONS preflight', async () => {
      const req = new Request('https://edge.glowup.vn/events/batch', {
        method: 'OPTIONS',
        headers: { Origin: 'https://glowup.vn' },
      });

      const res = await workerHandler.fetch(req, mockEnv);

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://glowup.vn');
    });

    it('filters bots/crawlers early by User-Agent and returns 202 without enqueueing', async () => {
      for (const ua of [
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'curl/8.4.0',
        '',
      ]) {
        const req = new Request('https://edge.glowup.vn/events/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ua ? { 'User-Agent': ua } : {}),
          },
          body: JSON.stringify({
            anonymousId: randomUUID(),
            events: [{ id: randomUUID(), eventType: 'VIEW_PRODUCT' }],
          }),
        });

        const res = await workerHandler.fetch(req, mockEnv);
        expect(res.status).toBe(202);
        const body = await res.json();
        expect(body.skipped).toBe('bot');
      }

      expect(mockEnv.RECOMMENDATION_EVENTS_QUEUE?.send).not.toHaveBeenCalled();
    });

    it('rejects payloads >= 32 KB with 413 Payload Too Large', async () => {
      const hugePayload = JSON.stringify({
        anonymousId: randomUUID(),
        events: [
          {
            id: randomUUID(),
            eventType: 'SEARCH_QUERY',
            metadata: { pad: 'x'.repeat(33 * 1024) },
          },
        ],
      });

      const req = new Request('https://edge.glowup.vn/events/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': browserUa,
        },
        body: hugePayload,
      });

      const res = await workerHandler.fetch(req, mockEnv);
      expect(res.status).toBe(413);
      expect(mockEnv.RECOMMENDATION_EVENTS_QUEUE?.send).not.toHaveBeenCalled();
    });

    it('verifies JWT at Edge, extracts customerId, strips Authorization header, and ignores body customerId', async () => {
      const verifiedCustomerId = randomUUID();
      const spoofedCustomerId = randomUUID();
      const anonId = randomUUID();
      const jwtToken = signHs256Jwt(
        {
          userId: verifiedCustomerId,
          sessionId: randomUUID(),
          exp: Math.floor(Date.now() / 1000) + 600,
        },
        mockEnv.JWT_SECRET!,
      );

      const req = new Request('https://edge.glowup.vn/events/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': browserUa,
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          anonymousId: anonId,
          customerId: spoofedCustomerId,
          events: [{ id: randomUUID(), eventType: 'VIEW_PRODUCT', productId: randomUUID() }],
        }),
      });

      const res = await workerHandler.fetch(req, mockEnv);
      expect(res.status).toBe(202);
      expect(sentRecommendationMessages).toHaveLength(1);

      const queued = sentRecommendationMessages[0];
      expect(queued.customerId).toBe(verifiedCustomerId);
      expect(queued.customerId).not.toBe(spoofedCustomerId);
      expect(JSON.stringify(queued)).not.toContain(jwtToken);
      expect(JSON.stringify(queued).toLowerCase()).not.toContain('authorization');
    });

    it('sets customerId=null without dropping events when JWT is missing or expired', async () => {
      const expiredToken = signHs256Jwt(
        {
          userId: randomUUID(),
          exp: Math.floor(Date.now() / 1000) - 60,
        },
        mockEnv.JWT_SECRET!,
      );

      const req = new Request('https://edge.glowup.vn/events/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': browserUa,
          Authorization: `Bearer ${expiredToken}`,
        },
        body: JSON.stringify({
          anonymousId: randomUUID(),
          events: [{ id: randomUUID(), eventType: 'VIEW_PRODUCT' }],
        }),
      });

      const res = await workerHandler.fetch(req, mockEnv);
      expect(res.status).toBe(202);
      expect(sentRecommendationMessages).toHaveLength(1);
      expect(sentRecommendationMessages[0].customerId).toBeNull();
    });

    it('gracefully degrades and still returns 202 Accepted when Queue send fails or hits quota', async () => {
      mockEnv.RECOMMENDATION_EVENTS_QUEUE!.send = jest
        .fn()
        .mockRejectedValue(new Error('QUEUE_DAILY_CAP_EXCEEDED'));

      const req = new Request('https://edge.glowup.vn/events/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': browserUa,
        },
        body: JSON.stringify({
          anonymousId: randomUUID(),
          events: [{ id: randomUUID(), eventType: 'VIEW_PRODUCT' }],
        }),
      });

      const res = await workerHandler.fetch(req, mockEnv);
      expect(res.status).toBe(202);
      const data = await res.json();
      expect(data.accepted).toBe(true);
      expect(data.degraded).toBe(true);
    });

    it('batches recommendation queue messages into 1 POST to NestJS internal endpoint', async () => {
      const msg1: Message<RecommendationEventsQueueMessage> = {
        id: 'rec-msg-1',
        timestamp: new Date(),
        body: {
          id: 'rec-msg-1',
          anonymousId: randomUUID(),
          customerId: randomUUID(),
          receivedAt: new Date().toISOString(),
          events: [{ id: randomUUID(), eventType: 'VIEW_PRODUCT' }],
          impressions: [{ placement: 'HOME', count: 3 }],
        },
        ack: jest.fn(),
        retry: jest.fn(),
      };
      const msg2: Message<RecommendationEventsQueueMessage> = {
        id: 'rec-msg-2',
        timestamp: new Date(),
        body: {
          id: 'rec-msg-2',
          anonymousId: randomUUID(),
          customerId: null,
          receivedAt: new Date().toISOString(),
          events: [{ id: randomUUID(), eventType: 'SEARCH_CLICK' }],
        },
        ack: jest.fn(),
        retry: jest.fn(),
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: async () => ({ accepted: true }),
      } as any);

      await workerHandler.queue(
        {
          queue: 'glowup-recommendation-events',
          messages: [msg1, msg2],
          ackAll: jest.fn(),
          retryAll: jest.fn(),
        },
        mockEnv,
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:3000/api/v1/internal/recommendations/events/batch',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Internal-Token': 'internal-secret-token-xyz',
          }),
        }),
      );
      expect(msg1.ack).toHaveBeenCalled();
      expect(msg2.ack).toHaveBeenCalled();
    });

    it('executes the 3 free-tier cron triggers calling individual NestJS job endpoints', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 202,
      } as any);
      global.fetch = fetchMock;

      await workerHandler.scheduled({ cron: '0 */2 * * *', scheduledTime: Date.now() }, mockEnv);
      await workerHandler.scheduled({ cron: '15 */6 * * *', scheduledTime: Date.now() }, mockEnv);
      await workerHandler.scheduled({ cron: '0 19 * * *', scheduledTime: Date.now() }, mockEnv);

      const calledUrls = fetchMock.mock.calls.map((c) => c[0]);
      expect(calledUrls).toEqual([
        'http://127.0.0.1:3000/api/v1/internal/recommendations/jobs/trending',
        'http://127.0.0.1:3000/api/v1/internal/recommendations/jobs/affinities',
        'http://127.0.0.1:3000/api/v1/internal/recommendations/jobs/flush-metrics',
        'http://127.0.0.1:3000/api/v1/internal/recommendations/jobs/sync-embeddings',
        'http://127.0.0.1:3000/api/v1/internal/recommendations/jobs/similar',
        'http://127.0.0.1:3000/api/v1/internal/recommendations/jobs/bought-together',
        'http://127.0.0.1:3000/api/v1/internal/recommendations/jobs/cleanup',
      ]);
    });
  });
});
