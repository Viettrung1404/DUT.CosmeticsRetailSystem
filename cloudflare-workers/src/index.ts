import { Env, LogisticsWebhookMessage, MessageBatch } from './types';
import { handleQueueBatch } from './consumer';

export default {
  /**
   * HTTP Handler cho Webhook Ingress tại Edge (EP09-T02)
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Health check
    if (request.method === 'GET' && (pathname === '/health' || pathname === '/')) {
      return new Response(JSON.stringify({ status: 'ok', service: 'glowup-logistics-ingress' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Webhook Ingress GHN
    if (
      request.method === 'POST' &&
      (pathname === '/webhooks/ghn' || pathname === '/api/v1/webhooks/ghn')
    ) {
      return handleGhnWebhook(request, env);
    }

    // 3. Webhook Ingress Ahamove
    if (
      request.method === 'POST' &&
      (pathname === '/webhooks/ahamove' || pathname === '/api/v1/webhooks/ahamove')
    ) {
      return handleAhamoveWebhook(request, env);
    }

    // 4. Outbox Events Producer endpoint (tùy chọn nhận sự kiện từ Outbox Relay)
    if (request.method === 'POST' && pathname === '/produce') {
      return handleOutboxProduce(request, env);
    }

    return new Response(JSON.stringify({ error: 'NOT_FOUND', path: pathname }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },

  /**
   * Queue Consumer Handler (EP09-T03)
   */
  async queue(batch: MessageBatch<LogisticsWebhookMessage>, env: Env): Promise<void> {
    return handleQueueBatch(batch, env);
  },
};

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
  } catch (err) {
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
  } catch (err) {
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
