import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  ICloudflareQueueClient,
  CLOUDFLARE_QUEUE_CLIENT,
  QueueMessage,
} from './cloudflare-queue.client';

export interface OutboxRelayStats {
  processed: number;
  succeeded: number;
  failed: number;
}

interface OutboxEventRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: any;
  retry_count: number;
}

@Injectable()
export class OutboxRelayScheduler {
  private readonly logger = new Logger(OutboxRelayScheduler.name);
  private backoffUntil: Date | null = null;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CLOUDFLARE_QUEUE_CLIENT)
    private readonly queueClient: ICloudflareQueueClient,
  ) {}

  /**
   * Cronjob chạy định kỳ quét outbox_events mỗi 3 giây
   */
  @Cron('*/3 * * * * *')
  async handleCron(): Promise<void> {
    const isEnabled =
      this.configService.get<string>('OUTBOX_RELAY_ENABLED', 'true') !== 'false';
    if (!isEnabled) {
      return;
    }

    if (this.isBackoffActive()) {
      this.logger.debug(
        `Outbox relay is paused due to backoff until ${this.backoffUntil?.toISOString()}`,
      );
      return;
    }

    if (this.isRunning) {
      this.logger.debug('Outbox relay cycle already in progress, skipping.');
      return;
    }

    this.isRunning = true;
    try {
      await this.relayBatch(50);
    } catch (err: any) {
      this.logger.error(`Error in outbox relay cron: ${err.message}`, err.stack);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Quét và xử lý một lô sự kiện PENDING sử dụng FOR UPDATE SKIP LOCKED
   * Bảo đảm concurrency: các worker chạy song song không bao giờ xử lý trùng event.
   */
  async relayBatch(batchSize = 50): Promise<OutboxRelayStats> {
    const stats: OutboxRelayStats = { processed: 0, succeeded: 0, failed: 0 };

    return this.prisma.$transaction(
      async (tx) => {
        // 1. Quét tối đa batchSize events chưa publish với khóa SKIP LOCKED
        const rows = await tx.$queryRaw<OutboxEventRow[]>`
          SELECT id, aggregate_type, aggregate_id, event_type, payload, retry_count
          FROM outbox_events
          WHERE status = 'PENDING'
          ORDER BY created_at ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED;
        `;

        if (!rows || rows.length === 0) {
          return stats;
        }

        stats.processed = rows.length;

        for (const row of rows) {
          const message: QueueMessage = {
            id: row.id,
            aggregateType: row.aggregate_type,
            aggregateId: row.aggregate_id,
            eventType: row.event_type,
            payload: row.payload,
            occurredAt: new Date().toISOString(),
          };

          try {
            const sendResult = await this.queueClient.sendMessage(message);

            if (sendResult.success) {
              // Đánh dấu PUBLISHED
              await tx.$executeRaw`
                UPDATE outbox_events
                SET status = 'PUBLISHED',
                    published_at = NOW(),
                    last_error = NULL
                WHERE id = ${row.id}::uuid;
              `;
              stats.succeeded++;
            } else {
              // Xử lý lỗi trả về từ Queue
              const errorMsg = sendResult.error || `HTTP_${sendResult.statusCode}`;
              await tx.$executeRaw`
                UPDATE outbox_events
                SET retry_count = retry_count + 1,
                    last_error = ${errorMsg}
                WHERE id = ${row.id}::uuid;
              `;
              stats.failed++;

              // Kích hoạt Backoff nếu lỗi 429 hoặc 5xx
              if (
                sendResult.statusCode === 429 ||
                (sendResult.statusCode && sendResult.statusCode >= 500)
              ) {
                this.triggerBackoff(10000); // 10 giây
              }
            }
          } catch (err: any) {
            // Lỗi mạng bất ngờ
            const errorMsg = `EXCEPTION: ${err.message}`;
            await tx.$executeRaw`
              UPDATE outbox_events
              SET retry_count = retry_count + 1,
                  last_error = ${errorMsg}
              WHERE id = ${row.id}::uuid;
            `;
            stats.failed++;
            this.triggerBackoff(10000);
          }
        }

        return stats;
      },
      { timeout: 30000 },
    );
  }

  /**
   * Kích hoạt tạm dừng xử lý (Backoff) trong durationMs
   */
  triggerBackoff(durationMs = 10000): void {
    this.backoffUntil = new Date(Date.now() + durationMs);
    this.logger.warn(
      `Triggered outbox relay backoff for ${durationMs}ms until ${this.backoffUntil.toISOString()}`,
    );
  }

  /**
   * Kiểm tra xem đang trong thời gian backoff hay không
   */
  isBackoffActive(): boolean {
    if (!this.backoffUntil) {
      return false;
    }
    if (Date.now() > this.backoffUntil.getTime()) {
      this.backoffUntil = null;
      return false;
    }
    return true;
  }

  /**
   * Reset backoff thủ công (dùng cho testing)
   */
  clearBackoff(): void {
    this.backoffUntil = null;
  }
}
