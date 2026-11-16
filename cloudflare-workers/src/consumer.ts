import { Env, LogisticsWebhookMessage, MessageBatch } from './types';

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
    } catch (err: any) {
      // Timeout hoặc lỗi kết nối mạng -> retry
      msg.retry();
    }
  }
}
