import {
  Injectable,
  Logger,
  Inject,
  Optional,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  ICloudflareQueueClient,
  CLOUDFLARE_QUEUE_CLIENT,
  QueueMessage,
} from './cloudflare-queue.client';

const OUTBOX_FALLBACK_CRON_NAME = 'outbox-relay-fallback-sweep';
const OUTBOX_FALLBACK_INTERVAL_NAME = 'outbox-relay-fallback-sweep-interval';
const DEFAULT_SWEEP_INTERVAL_MINUTES = 30;
const DEFAULT_TRIGGER_DELAY_MS = 150;

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
export class OutboxRelayScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayScheduler.name);
  private backoffUntil: Date | null = null;
  private isRunning = false;
  private rerunRequested = false;
  private stopped = false;
  private pendingTriggerTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CLOUDFLARE_QUEUE_CLIENT)
    private readonly queueClient: ICloudflareQueueClient,
    @Optional()
    private readonly schedulerRegistry?: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    if (!this.isRelayEnabled()) {
      this.logger.log('OutboxRelayScheduler is disabled via OUTBOX_RELAY_ENABLED=false.');
      return;
    }

    this.registerFallbackSweep();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.pendingTriggerTimer) {
      clearTimeout(this.pendingTriggerTimer);
      this.pendingTriggerTimer = null;
    }

    if (this.schedulerRegistry) {
      try {
        if (this.schedulerRegistry.doesExist('cron', OUTBOX_FALLBACK_CRON_NAME)) {
          this.schedulerRegistry.deleteCronJob(OUTBOX_FALLBACK_CRON_NAME);
        }
      } catch {
        // Ignore teardown races
      }
      try {
        if (this.schedulerRegistry.doesExist('interval', OUTBOX_FALLBACK_INTERVAL_NAME)) {
          this.schedulerRegistry.deleteInterval(OUTBOX_FALLBACK_INTERVAL_NAME);
        }
      } catch {
        // Ignore teardown races
      }
    }

    this.logger.log('OutboxRelayScheduler stopped gracefully.');
  }

  private isRelayEnabled(): boolean {
    return (
      this.configService.get<string>('OUTBOX_RELAY_ENABLED', 'true') !== 'false'
    );
  }

  private getSweepIntervalMinutes(): number {
    const raw = this.configService.get<string | number>(
      'OUTBOX_RELAY_SWEEP_INTERVAL_MINUTES',
    );
    if (raw === undefined || raw === null || raw === '') {
      return DEFAULT_SWEEP_INTERVAL_MINUTES;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return DEFAULT_SWEEP_INTERVAL_MINUTES;
    }
    return Math.min(1440, Math.floor(parsed));
  }

  private getTriggerDelayMs(): number {
    const raw = this.configService.get<string | number>(
      'OUTBOX_RELAY_TRIGGER_DELAY_MS',
    );
    if (raw === undefined || raw === null || raw === '') {
      return DEFAULT_TRIGGER_DELAY_MS;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return DEFAULT_TRIGGER_DELAY_MS;
    }
    return Math.min(5000, Math.floor(parsed));
  }

  private registerFallbackSweep(): void {
    if (!this.schedulerRegistry) {
      return;
    }

    const explicitCron = this.configService
      .get<string>('OUTBOX_RELAY_SWEEP_CRON', '')
      ?.trim();

    if (explicitCron) {
      const job = CronJob.from({
        cronTime: explicitCron,
        onTick: () => {
          void this.handleCron();
        },
        start: true,
        unrefTimeout: true,
      });
      this.schedulerRegistry.addCronJob(OUTBOX_FALLBACK_CRON_NAME, job);
      this.logger.log(
        `Registered outbox fallback sweep cron (${explicitCron}).`,
      );
      return;
    }

    const intervalMinutes = this.getSweepIntervalMinutes();
    if (intervalMinutes === 60 || (intervalMinutes < 60 && 60 % intervalMinutes === 0)) {
      const cronExpr =
        intervalMinutes === 60
          ? '0 0 * * * *'
          : `0 */${intervalMinutes} * * * *`;
      const job = CronJob.from({
        cronTime: cronExpr,
        onTick: () => {
          void this.handleCron();
        },
        start: true,
        unrefTimeout: true,
      });
      this.schedulerRegistry.addCronJob(OUTBOX_FALLBACK_CRON_NAME, job);
      this.logger.log(
        `Registered outbox fallback sweep cron (${cronExpr}, every ${intervalMinutes}m).`,
      );
      return;
    }

    const intervalHandle = setInterval(() => {
      void this.handleCron();
    }, intervalMinutes * 60_000);
    if (intervalHandle.unref) {
      intervalHandle.unref();
    }
    this.schedulerRegistry.addInterval(
      OUTBOX_FALLBACK_INTERVAL_NAME,
      intervalHandle,
    );
    this.logger.log(
      `Registered outbox fallback sweep interval (every ${intervalMinutes}m).`,
    );
  }

  /**
   * Event-driven trigger: gọi bất đồng bộ ngay sau khi outbox_events được ghi
   * để tránh polling liên tục đốt Neon Compute, đồng thời gộp burst writes.
   */
  triggerRelayNow(delayMs?: number): void {
    if (this.stopped || !this.isRelayEnabled()) {
      return;
    }

    if (this.isBackoffActive()) {
      this.logger.debug(
        `Outbox relay trigger skipped during backoff until ${this.backoffUntil?.toISOString()}`,
      );
      return;
    }

    if (this.isRunning) {
      this.rerunRequested = true;
      return;
    }

    if (this.pendingTriggerTimer) {
      return;
    }

    const resolvedDelay =
      delayMs !== undefined ? Math.max(0, delayMs) : this.getTriggerDelayMs();

    this.pendingTriggerTimer = setTimeout(() => {
      this.pendingTriggerTimer = null;
      void this.runRelayCycle();
    }, resolvedDelay);

    if (this.pendingTriggerTimer.unref) {
      this.pendingTriggerTimer.unref();
    }
  }

  /**
   * Sweep dự phòng theo chu kỳ cấu hình (mặc định 30 phút) để vét các event
   * bị trễ commit hoặc sau khi hết backoff.
   */
  async handleCron(): Promise<void> {
    await this.runRelayCycle();
  }

  private async runRelayCycle(): Promise<void> {
    if (this.stopped) {
      return;
    }

    if (!this.isRelayEnabled()) {
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
      let stats: OutboxRelayStats;
      do {
        stats = await this.relayBatch(50);
      } while (
        !this.stopped &&
        !this.isBackoffActive() &&
        stats.processed === 50
      );
    } catch (err: any) {
      this.logger.error(`Error in outbox relay cycle: ${err.message}`, err.stack);
    } finally {
      this.isRunning = false;
      if (this.rerunRequested && !this.stopped && !this.isBackoffActive()) {
        this.rerunRequested = false;
        this.triggerRelayNow();
      } else {
        this.rerunRequested = false;
      }
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
