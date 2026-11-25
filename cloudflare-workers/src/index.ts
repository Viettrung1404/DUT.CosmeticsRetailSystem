import {
  CronController,
  Env,
  LogisticsWebhookMessage,
  MessageBatch,
  RecommendationEventsQueueMessage,
  WorkerExecutionContext,
} from './types';
import {
  handleQueueBatch,
  handleRecommendationEventsBatch,
} from './consumer';
import { verifyJwtClaims } from './jwt';

const MAX_EVENTS_PAYLOAD_BYTES = 32 * 1024; // 32 KB
const MAX_EVENTS_PER_REQUEST = 50;

const BOT_USER_AGENT_PATTERN =
  /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|curl|wget|python-requests|go-http-client|headlesschrome|puppeteer|playwright|lighthouse|bytespider|ahrefs|semrush|mj12bot|petalbot|yandex|baiduspider)/i;

export const RECOMMENDATION_CRON_ENDPOINTS: Record<string, readonly string[]> = {
  '0 */2 * * *': [
    '/api/v1/internal/recommendations/jobs/trending',
    '/api/v1/internal/recommendations/jobs/affinities',
    '/api/v1/internal/recommendations/jobs/flush-metrics',
  ],
  '15 */6 * * *': [
    '/api/v1/internal/recommendations/jobs/sync-embeddings',
    '/api/v1/internal/recommendations/jobs/similar',
    '/api/v1/internal/recommendations/jobs/bought-together',
  ],
  '0 19 * * *': [
    '/api/v1/internal/recommendations/jobs/cleanup',
  ],
};

function trackingCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function isBotRequest(request: Request): boolean {
  const ua = request.headers.get('user-agent')?.trim() ?? '';
  if (!ua) return true;
  return BOT_USER_AGENT_PATTERN.test(ua);
}

export async function handleScheduledCron(
  cron: string,
  env: Env,
): Promise<{ cron: string; called: string[]; failed: string[] }> {
  const endpoints = RECOMMENDATION_CRON_ENDPOINTS[cron] ?? [];
  const internalBaseUrl = env.NESTJS_INTERNAL_URL || 'https://api.glowup.vn';
  const internalToken =
    env.INTERNAL_DISPATCH_SECRET || 'glowup-internal-auth-secret-key';

  const called: string[] = [];
  const failed: string[] = [];

  for (const path of endpoints) {
    try {
      const response = await fetch(`${internalBaseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': internalToken,
        },
        body: '{}',
        signal: AbortSignal.timeout(25000),
      });
      called.push(path);
      if (!response.ok) {
        failed.push(`${path}:${response.status}`);
      }
    } catch {
      called.push(path);
      failed.push(`${path}:network`);
    }
  }

  return { cron, called, failed };
}

export default {
  /**
   * HTTP Handler cho Webhook Ingress & Recommendation Tracking Ingress tại Edge
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 0. CORS Preflight cho Tracking Endpoint (cache 24h tránh nghẽn keepalive khi đóng tab)
    if (
      request.method === 'OPTIONS' &&
      (pathname === '/events/batch' ||
        pathname === '/api/v1/recommendations/events/batch')
    ) {
      return new Response(null, {
        status: 204,
        headers: trackingCorsHeaders(request),
      });
    }

    // 1. Health check
    if (request.method === 'GET' && (pathname === '/health' || pathname === '/')) {
      return new Response(
        JSON.stringify({ status: 'ok', service: 'glowup-logistics-ingress' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // 2. Recommendation Behavior Events Ingress
    if (
      request.method === 'POST' &&
      (pathname === '/events/batch' ||
        pathname === '/api/v1/recommendations/events/batch')
    ) {
      return handleEventsBatchIngress(request, env);
    }

    // 3. Webhook Ingress GHN
    if (
      request.method === 'POST' &&
      (pathname === '/webhooks/ghn' || pathname === '/api/v1/webhooks/ghn')
    ) {
      return handleGhnWebhook(request, env);
    }

    // 4. Webhook Ingress Ahamove
    if (
      request.method === 'POST' &&
      (pathname === '/webhooks/ahamove' || pathname === '/api/v1/webhooks/ahamove')
    ) {
      return handleAhamoveWebhook(request, env);
    }

    // 5. Outbox Events Producer endpoint (tùy chọn nhận sự kiện từ Outbox Relay)
    if (request.method === 'POST' && pathname === '/produce') {
      return handleOutboxProduce(request, env);
    }

    return new Response(JSON.stringify({ error: 'NOT_FOUND', path: pathname }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },

  /**
   * Queue Consumer Handler
   */
  async queue(
    batch: MessageBatch<LogisticsWebhookMessage | RecommendationEventsQueueMessage>,
    env: Env,
  ): Promise<void> {
    if (
      batch.queue === 'glowup-recommendation-events' ||
      (batch.messages[0]?.body && 'events' in batch.messages[0].body)
    ) {
      return handleRecommendationEventsBatch(
        batch as MessageBatch<RecommendationEventsQueueMessage>,
        env,
      );
    }

    return handleQueueBatch(batch as MessageBatch<LogisticsWebhookMessage>, env);
  },

  /**
   * Free-Tier Cron Triggers (3/5 slots) cho các batch job Recommendation
   */
  async scheduled(
    controller: CronController,
    env: Env,
    ctx?: WorkerExecutionContext,
  ): Promise<void> {
    const work = handleScheduledCron(controller.cron, env);
    if (ctx?.waitUntil) {
      ctx.waitUntil(work);
      return;
    }
    await work;
  },
};

/**
 * Edge Ingress cho tracking hành vi:
 * - Lọc sớm bot/crawler theo User-Agent
 * - Giới hạn kích thước payload < 32 KB
 * - Verify JWT bằng Web Crypto API (<1ms CPU) -> trích customerId (fallback null)
 * - Xóa sạch Authorization header, tuyệt đối không đẩy raw JWT vào Queue
 * - Graceful degradation: nếu Queue lỗi/chạm trần quota vẫn trả 202 Accepted
 */
async function handleEventsBatchIngress(
  request: Request,
  env: Env,
): Promise<Response> {
  const cors = trackingCorsHeaders(request);
  const jsonHeaders = { 'Content-Type': 'application/json', ...cors };

  if (isBotRequest(request)) {
    return new Response(
      JSON.stringify({ accepted: true, skipped: 'bot' }),
      { status: 202, headers: jsonHeaders },
    );
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader && Number(contentLengthHeader) > MAX_EVENTS_PAYLOAD_BYTES) {
    return new Response(
      JSON.stringify({ accepted: false, error: 'PAYLOAD_TOO_LARGE' }),
      { status: 413, headers: jsonHeaders },
    );
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return new Response(
      JSON.stringify({ accepted: false, error: 'BAD_REQUEST' }),
      { status: 400, headers: jsonHeaders },
    );
  }

  if (new TextEncoder().encode(rawText).byteLength > MAX_EVENTS_PAYLOAD_BYTES) {
    return new Response(
      JSON.stringify({ accepted: false, error: 'PAYLOAD_TOO_LARGE' }),
      { status: 413, headers: jsonHeaders },
    );
  }

  let body: any;
  try {
    body = JSON.parse(rawText);
  } catch {
    return new Response(
      JSON.stringify({ accepted: false, error: 'INVALID_JSON' }),
      { status: 400, headers: jsonHeaders },
    );
  }

  if (
    !body ||
    typeof body.anonymousId !== 'string' ||
    !body.anonymousId.trim() ||
    !Array.isArray(body.events) ||
    body.events.length > MAX_EVENTS_PER_REQUEST
  ) {
    return new Response(
      JSON.stringify({ accepted: false, error: 'INVALID_PAYLOAD' }),
      { status: 400, headers: jsonHeaders },
    );
  }

  // Verify JWT at Edge and discard Authorization header (never push raw JWT or client customerId into Queue)
  const jwtClaims = await verifyJwtClaims(
    request.headers.get('authorization'),
    env.JWT_SECRET,
  );

  const queueMessage: RecommendationEventsQueueMessage = {
    id: crypto.randomUUID(),
    anonymousId: body.anonymousId.trim(),
    customerId: jwtClaims.customerId ?? jwtClaims.userId ?? null,
    ...(jwtClaims.userId ? { userId: jwtClaims.userId } : {}),
    receivedAt: new Date().toISOString(),
    events: body.events,
    ...(Array.isArray(body.impressions) && body.impressions.length > 0
      ? { impressions: body.impressions }
      : {}),
  };

  try {
    if (!env.RECOMMENDATION_EVENTS_QUEUE) {
      throw new Error('RECOMMENDATION_EVENTS_QUEUE_UNBOUND');
    }
    await env.RECOMMENDATION_EVENTS_QUEUE.send(queueMessage);
    return new Response(
      JSON.stringify({
        accepted: true,
        queued: true,
        messageId: queueMessage.id,
      }),
      { status: 202, headers: jsonHeaders },
    );
  } catch {
    // Graceful degradation: quota cap or Queue outage must never break storefront UX
    return new Response(
      JSON.stringify({
        accepted: true,
        degraded: true,
      }),
      { status: 202, headers: jsonHeaders },
    );
  }
}

/**
 * Xử lý tiếp nhận Webhook từ GHN
 */
async function handleGhnWebhook(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Xác thực Secret Token (AC2)
  const token =
    request.headers.get('token') ||
    request.headers.get('x-ghn-token') ||
    url.searchParams.get('token');

  if (env.GHN_WEBHOOK_SECRET && token !== env.GHN_WEBHOOK_SECRET) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'UNAUTHORIZED: Invalid GHN Webhook Token',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'BAD_REQUEST: Invalid JSON payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Enqueue vào Cloudflare Queue (AC3)
  const messageId = crypto.randomUUID();
  const webhookMessage: LogisticsWebhookMessage = {
    id: messageId,
    carrierCode: 'GHN',
    receivedAt: new Date().toISOString(),
    headers: extractHeaders(request.headers),
    payload: body,
  };

  try {
    await env.LOGISTICS_WEBHOOK_QUEUE.send(webhookMessage);

    // Chỉ trả 200 OK khi đã Enqueue thành công
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Enqueued successfully',
        messageId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    // Trả HTTP 500 để GHN tự động retry lại sau nếu Queue gặp sự cố
    return new Response(
      JSON.stringify({
        success: false,
        error: `QUEUE_ENQUEUE_FAILED: ${err.message}`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

/**
 * Xử lý tiếp nhận Webhook từ Ahamove
 */
async function handleAhamoveWebhook(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Xác thực Secret Token (AC2)
  const token =
    request.headers.get('x-ahamove-token') ||
    request.headers.get('token') ||
    url.searchParams.get('token');

  if (env.AHAMOVE_WEBHOOK_SECRET && token !== env.AHAMOVE_WEBHOOK_SECRET) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'UNAUTHORIZED: Invalid Ahamove Webhook Token',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'BAD_REQUEST: Invalid JSON payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Enqueue vào Cloudflare Queue (AC3)
  const messageId = crypto.randomUUID();
  const webhookMessage: LogisticsWebhookMessage = {
    id: messageId,
    carrierCode: 'AHAMOVE',
    receivedAt: new Date().toISOString(),
    headers: extractHeaders(request.headers),
    payload: body,
  };

  try {
    await env.LOGISTICS_WEBHOOK_QUEUE.send(webhookMessage);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Enqueued successfully',
        messageId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `QUEUE_ENQUEUE_FAILED: ${err.message}`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

/**
 * Xử lý tiếp nhận Domain Event từ Outbox Relay (nếu cần publish qua Worker)
 */
async function handleOutboxProduce(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (env.INTERNAL_DISPATCH_SECRET && token !== env.INTERNAL_DISPATCH_SECRET) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    await env.LOGISTICS_WEBHOOK_QUEUE.send(body);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Trích xuất các headers quan trọng loại bỏ các header nhạy cảm
 */
function extractHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    if (
      !key.toLowerCase().includes('cookie') &&
      !key.toLowerCase().includes('authorization')
    ) {
      result[key] = value;
    }
  }
  return result;
}
