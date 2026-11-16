import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { WebhookProcessorService } from '../webhooks/webhook-processor.service';
import { DlqAlertService } from './dlq-alert.service';
import { QueryDlqMessagesDto, ReplayDlqMessagesDto, RetryStuckOutboxDto } from './dtos/dlq-operations.dto';
import { Prisma } from '@prisma/client';

export interface DlqReplayDetail {
  inboxId: string;
  carrierCode: string;
  eventId: string;
  trackingCode: string | null;
  status: 'PROCESSED' | 'ALREADY_PROCESSED' | 'IGNORED' | 'FAILED' | 'ERROR';
  shipmentId?: string | null;
  newStatus?: string;
  reason?: string;
}

export interface DlqReplayResult {
  totalRequested: number;
  successCount: number;
  failedCount: number;
  details: DlqReplayDetail[];
}

@Injectable()
export class DlqOperationsService {
  private readonly logger = new Logger(DlqOperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookProcessorService: WebhookProcessorService,
    private readonly dlqAlertService: DlqAlertService,
  ) {}

  /**
   * Truy vấn danh sách các webhook message bị lỗi hoặc rơi vào Dead Letter Queue (DLQ)
   */
  async listDlqMessages(query: QueryDlqMessagesDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ShippingWebhookInboxWhereInput = {};

    if (query.carrierCode) {
      where.carrierCode = query.carrierCode.toUpperCase();
    }

    if (query.trackingCode) {
      where.trackingCode = query.trackingCode.trim();
    }

    if (!query.status || query.status === 'ALL') {
      where.processedStatus = { in: ['FAILED', 'DEAD_LETTER'] };
    } else {
      where.processedStatus = query.status;
    }

    const [total, data] = await Promise.all([
      this.prisma.shippingWebhookInbox.count({ where }),
      this.prisma.shippingWebhookInbox.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  /**
   * Bắn lại (Replay) các thông điệp lỗi trong DLQ một cách an toàn và Idempotent (AC1)
   */
  async replayMessages(dto: ReplayDlqMessagesDto): Promise<DlqReplayResult> {
    const rawIds = [
      ...(dto.inboxId ? [dto.inboxId] : []),
      ...(dto.inboxIds || []),
    ];
    const uniqueIds = Array.from(new Set(rawIds));

    if (uniqueIds.length === 0) {
      throw new BadRequestException('Vui lòng cung cấp ít nhất một inboxId hoặc inboxIds để replay');
    }

    this.logger.log(`Starting DLQ replay for ${uniqueIds.length} messages...`);

    const details: DlqReplayDetail[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const inboxId of uniqueIds) {
      const inbox = await this.prisma.shippingWebhookInbox.findUnique({
        where: { id: inboxId },
      });

      if (!inbox) {
        failedCount++;
        details.push({
          inboxId,
          carrierCode: 'UNKNOWN',
          eventId: 'UNKNOWN',
          trackingCode: null,
          status: 'ERROR',
          reason: 'Bản ghi webhook inbox không tồn tại',
        });
        continue;
      }

      try {
        // 1. Đặt lại trạng thái về PENDING trước khi xử lý lại
        await this.prisma.shippingWebhookInbox.update({
          where: { id: inboxId },
          data: {
            processedStatus: 'PENDING',
            errorMessage: null,
          },
        });

        // 2. Tái thực thi Pipeline xử lý Webhook qua WebhookProcessorService
        // Đảm bảo tính Idempotent tuyệt đối: không nhân đôi dữ liệu, chống lùi trạng thái
        const processResult = await this.webhookProcessorService.processEvent(inboxId);

        if (processResult.status === 'PROCESSED' || processResult.status === 'ALREADY_PROCESSED') {
          successCount++;
        } else if (processResult.status === 'IGNORED') {
          // Bị bỏ qua do guard (ví dụ: đơn đã giao hàng thành công trước đó) -> tính là xử lý an toàn
          successCount++;
        } else {
          failedCount++;
        }

        details.push({
          inboxId,
          carrierCode: inbox.carrierCode,
          eventId: inbox.eventId,
          trackingCode: inbox.trackingCode,
          status: processResult.status,
          shipmentId: processResult.shipmentId,
          newStatus: processResult.newStatus,
          reason: processResult.reason,
        });
      } catch (err: any) {
        failedCount++;
        this.logger.error(`Error replaying message ${inboxId}: ${err.message}`, err.stack);

        // Đánh dấu lại trạng thái FAILED
        await this.prisma.shippingWebhookInbox.update({
          where: { id: inboxId },
          data: {
            processedStatus: 'FAILED',
            errorMessage: `Replay error: ${err.message}`,
          },
        });

        details.push({
          inboxId,
          carrierCode: inbox.carrierCode,
          eventId: inbox.eventId,
          trackingCode: inbox.trackingCode,
          status: 'ERROR',
          reason: err.message,
        });
      }
    }

    return {
      totalRequested: uniqueIds.length,
      successCount,
      failedCount,
      details,
    };
  }

  /**
   * Quét và kích hoạt gửi lại các Outbox events bị kẹt (status = FAILED hoặc retry_count > threshold)
   */
  async retryStuckOutboxEvents(dto?: RetryStuckOutboxDto) {
    const threshold = dto?.thresholdRetries && dto.thresholdRetries > 0 ? dto.thresholdRetries : 3;

    // Tìm các event bị kẹt
    const stuckEvents = await this.prisma.outboxEvent.findMany({
      where: {
        OR: [
          { status: 'FAILED' },
          {
            status: 'PENDING',
            retryCount: { gte: threshold },
          },
        ],
      },
      select: { id: true },
    });

    if (stuckEvents.length === 0) {
      return {
        resetCount: 0,
        message: 'Không có outbox event nào bị kẹt thỏa mãn điều kiện',
      };
    }

    const stuckIds = stuckEvents.map((e) => e.id);

    // Reset về PENDING để Outbox Relay Scheduler tự động bốc gửi lại
    const updateResult = await this.prisma.outboxEvent.updateMany({
      where: {
        id: { in: stuckIds },
      },
      data: {
        status: 'PENDING',
        retryCount: 0,
        lastError: null,
      },
    });

    this.logger.log(
      `Successfully reset ${updateResult.count} stuck outbox events to PENDING (threshold: ${threshold})`,
    );

    return {
      resetCount: updateResult.count,
      message: `Đã khôi phục thành công ${updateResult.count} outbox events bị kẹt về trạng thái PENDING`,
    };
  }

  /**
   * Mô phỏng hoặc tiếp nhận message rơi vào DLQ từ Cloudflare và phát cảnh báo tức thì (AC2)
   */
  async recordDlqMessage(data: {
    carrierCode: string;
    eventId: string;
    payload: Record<string, any>;
    trackingCode?: string;
    errorMessage: string;
    queueName?: string;
  }) {
    const carrier = data.carrierCode.toUpperCase();
    const eventId = data.eventId;

    // 1. Tạo hoặc cập nhật bản ghi trong shipping_webhook_inbox với trạng thái DEAD_LETTER
    const inbox = await this.prisma.shippingWebhookInbox.upsert({
      where: {
        carrierCode_eventId: {
          carrierCode: carrier,
          eventId,
        },
      },
      create: {
        carrierCode: carrier,
        eventId,
        eventType: data.payload.eventType || 'DLQ_MESSAGE',
        trackingCode: data.trackingCode || null,
        payload: data.payload as any,
        processedStatus: 'DEAD_LETTER',
        errorMessage: data.errorMessage,
      },
      update: {
        processedStatus: 'DEAD_LETTER',
        errorMessage: data.errorMessage,
      },
    });

    // 2. Phát cảnh báo tức thời tới kênh Slack/Discord (AC2)
    await this.dlqAlertService.notifyDlq({
      inboxId: inbox.id,
      carrierCode: carrier,
      eventId,
      trackingCode: data.trackingCode || inbox.trackingCode,
      errorMessage: data.errorMessage,
      queueName: data.queueName,
      occurredAt: new Date(),
    });

    return inbox;
  }
}
