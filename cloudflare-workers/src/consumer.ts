import {
  Env,
  LogisticsWebhookMessage,
  MessageBatch,
  RecommendationEventsQueueMessage,
} from './types';

/**
 * Cloudflare Queue Consumer Handler (EP09-T03)
 * Rút message theo lô có kiểm soát (max_batch_size = 10) và gọi về NestJS Internal API
 */
export async function handleQueueBatch(
  batch: MessageBatch<LogisticsWebhookMessage>,
  env: Env,
): Promise<void> {
  const internalBaseUrl = env.NESTJS_INTERNAL_URL || 'https://api.glowup.vn';
  const internalUrl = `${internalBaseUrl}/api/v1/internal/webhooks/consume`;
  const internalToken = env.INTERNAL_DISPATCH_SECRET || 'glowup-internal-auth-secret-key';

  for (const msg of batch.messages) {
    try {
      const response = await fetch(internalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': internalToken,
          'X-Carrier-Code': msg.body.carrierCode,
        },
        body: JSON.stringify({
          carrierCode: msg.body.carrierCode,
          payload: msg.body.payload,
          headers: msg.body.headers,
          queueMessageId: msg.id,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        // HTTP 2xx: Xử lý thành công -> ack để xóa khỏi queue
        msg.ack();
      } else if (response.status >= 500 || response.status === 429) {
        // HTTP 5xx hoặc 429: Sự cố tạm thời backend -> retry
        msg.retry();
      } else {
        // HTTP 4xx (Bad request, Invalid payload): Lỗi dữ liệu không thể phục hồi bằng retry -> ack
        msg.ack();
      }
    } catch {
      // Timeout hoặc lỗi kết nối mạng -> retry
      msg.retry();
    }
  }
}

/**
 * Recommendation Events Queue Consumer:
 * Gộp tối đa 15 messages từ nhiều user thành 1 HTTP POST duy nhất tới NestJS Internal Endpoint
 * để giữ CPU Worker < 10ms và tiết kiệm tối đa Cloudflare Queue operations.
 */
export async function handleRecommendationEventsBatch(
  batch: MessageBatch<RecommendationEventsQueueMessage>,
  env: Env,
): Promise<void> {
  if (!batch.messages.length) {
    return;
  }

  const internalBaseUrl = env.NESTJS_INTERNAL_URL || 'https://api.glowup.vn';
  const internalUrl = `${internalBaseUrl}/api/v1/internal/recommendations/events/batch`;
  const internalToken = env.INTERNAL_DISPATCH_SECRET || 'glowup-internal-auth-secret-key';

  const batches = batch.messages.map((msg) => ({
    batchId: msg.body.batchId ?? msg.body.id,
    anonymousId: msg.body.anonymousId,
    customerId: msg.body.customerId ?? null,
    ...(msg.body.userId ? { userId: msg.body.userId } : {}),
    events: Array.isArray(msg.body.events) ? msg.body.events : [],
    ...(Array.isArray(msg.body.impressions) && msg.body.impressions.length > 0
      ? { impressions: msg.body.impressions }
      : {}),
  }));

  try {
    const response = await fetch(internalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': internalToken,
      },
      body: JSON.stringify({ batches }),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      for (const msg of batch.messages) {
        msg.ack();
      }
      return;
    }

    if (response.status >= 500 || response.status === 429) {
      for (const msg of batch.messages) {
        msg.retry();
      }
      return;
    }

    if ([400, 413, 422].includes(response.status)) {
      if (batch.messages.length === 1) {
        batch.messages[0].ack();
        return;
      }
      // Isolate poison messages; valid neighbours must be persisted before ACK.
      const middle = Math.ceil(batch.messages.length / 2);
      await handleRecommendationEventsBatch({ ...batch, messages: batch.messages.slice(0, middle) }, env);
      await handleRecommendationEventsBatch({ ...batch, messages: batch.messages.slice(middle) }, env);
      return;
    }

    // Authentication/routing failures are configuration errors, not poison payloads.
    for (const msg of batch.messages) msg.retry();
  } catch {
    for (const msg of batch.messages) {
      msg.retry();
    }
  }
}
