import { Injectable, Logger, Inject, OnModuleDestroy } from '@nestjs/common';
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
export class OutboxRelayScheduler implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayScheduler.name);
  private backoffUntil: Date | null = null;
  private isRunning = false;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CLOUDFLARE_QUEUE_CLIENT)
    private readonly queueClient: ICloudflareQueueClient,
  ) {}

  onModuleDestroy() {
    this.stopped = true;
    this.logger.log('OutboxRelayScheduler stopped gracefully.');
  }

  /**
   * Cronjob chạy định kỳ quét outbox_events mỗi 3 giây
   */
  @Cron('*/3 * * * * *')
  async handleCron(): Promise<void> {
    if (this.stopped) {
      return;
    }

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
   * Quét và xử lý một lô sự kiện PENDING sử dụng Two-Phase Outbox Relay:
   * - Phase 1: Truy vấn và khóa hàng trong transaction CSDL siêu ngắn (<5ms).
   * - Phase 2: Gửi HTTP tới Cloudflare Queue HOÀN TOÀN BÊN NGOÀI Transaction, giải phóng DB connection.
   * - Phase 3: Transaction CSDL ngắn thứ hai cập nhật trạng thái PUBLISHED / FAILED.
   * Bảo đảm concurrency (FOR UPDATE SKIP LOCKED) và Zero Connection Exhaustion.
   */
  async relayBatch(batchSize = 50): Promise<OutboxRelayStats> {
    const stats: OutboxRelayStats = { processed: 0, succeeded: 0, failed: 0 };
    if (this.stopped) {
      return stats;
    }

    // Phase 1: Quét tối đa batchSize events chưa publish với khóa SKIP LOCKED trong transaction ngắn
    const rows = await this.prisma.$transaction(
      async (tx) => {
        return tx.$queryRaw<OutboxEventRow[]>`
          SELECT id, aggregate_type, aggregate_id, event_type, payload, retry_count
          FROM outbox_events
          WHERE status = 'PENDING'
          ORDER BY created_at ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED;
        `;
      },
      { timeout: 5000 },
    );

    if (!rows || rows.length === 0) {
      return stats;
    }

    stats.processed = rows.length;

    // Phase 2: Gửi qua Cloudflare Queue bên ngoài Transaction (không giữ kết nối CSDL khi gọi mạng)
    type DispatchResult = {
      row: OutboxEventRow;
      success: boolean;
      statusCode?: number;
      error?: string;
    };
    const dispatchResults: DispatchResult[] = [];

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
        dispatchResults.push({
          row,
          success: sendResult.success,
          statusCode: sendResult.statusCode,
          error: sendResult.error || `HTTP_${sendResult.statusCode}`,
        });
      } catch (err: any) {
        dispatchResults.push({
          row,
          success: false,
          error: `EXCEPTION: ${err.message}`,
        });
      }
    }

    // Phase 3: Cập nhật trạng thái sự kiện trong transaction thứ hai ngắn gọn
    await this.prisma.$transaction(
      async (tx) => {
        for (const res of dispatchResults) {
          if (res.success) {
            await tx.$executeRaw`
              UPDATE outbox_events
              SET status = 'PUBLISHED',
                  published_at = NOW(),
                  last_error = NULL
              WHERE id = ${res.row.id}::uuid;
            `;
            stats.succeeded++;
          } else {
            await tx.$executeRaw`
              UPDATE outbox_events
              SET retry_count = retry_count + 1,
                  last_error = ${res.error}
              WHERE id = ${res.row.id}::uuid;
            `;
            stats.failed++;

            // Kích hoạt Backoff nếu lỗi 429, 5xx hoặc exception mạng
            if (
              res.statusCode === 429 ||
              (res.statusCode && res.statusCode >= 500) ||
              res.error?.startsWith('EXCEPTION:')
            ) {
              this.triggerBackoff(10000); // 10 giây
            }
          }
        }
      },
      { timeout: 5000 },
    );

    return stats;
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
