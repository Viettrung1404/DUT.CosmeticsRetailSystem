import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { createHash } from 'crypto';
import { Prisma, ShippingWebhookInbox } from '@prisma/client';

export interface RecordWebhookResult {
  isDuplicate: boolean;
  status: 'RECORDED' | 'ALREADY_PROCESSED';
  inbox: ShippingWebhookInbox;
}

@Injectable()
export class WebhookInboxService {
  private readonly logger = new Logger(WebhookInboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tiếp nhận và lưu trữ Webhook vào shipping_webhook_inbox với kiểm tra trùng lặp tuyệt đối.
   * Tự động sinh mã băm Fingerprint xác định nếu payload không cung cấp eventId.
   */
  async recordWebhook(
    carrierCode: string,
    payload: Record<string, any>,
    headers?: Record<string, any>,
  ): Promise<RecordWebhookResult> {
    const normalizedCarrier = carrierCode.toUpperCase();
    const trackingCode = this.extractTrackingCode(normalizedCarrier, payload);
    const eventType = this.extractEventType(normalizedCarrier, payload);
    const eventId = this.resolveEventId(normalizedCarrier, payload, trackingCode);

    try {
      // 1. Thử ghi mới bản ghi vào inbox
      const inbox = await this.prisma.shippingWebhookInbox.create({
        data: {
          carrierCode: normalizedCarrier,
          eventId,
          eventType,
          trackingCode: trackingCode || null,
          payload: payload as Prisma.InputJsonValue,
          processedStatus: 'PENDING',
        },
      });

      this.logger.log(
        `Webhook recorded successfully: carrier=${normalizedCarrier}, eventId=${eventId}, trackingCode=${trackingCode}`,
      );

      return {
        isDuplicate: false,
        status: 'RECORDED',
        inbox,
      };
    } catch (error: any) {
      // Mã lỗi P2002 trong Prisma: Ràng buộc unique bị vi phạm (carrier_code, event_id)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Duplicate webhook event detected and ignored: carrier=${normalizedCarrier}, eventId=${eventId}`,
        );

        const existing = await this.prisma.shippingWebhookInbox.findUnique({
          where: {
            carrierCode_eventId: {
              carrierCode: normalizedCarrier,
              eventId,
            },
          },
        });

        return {
          isDuplicate: true,
          status: 'ALREADY_PROCESSED',
          inbox: existing!,
        };
      }

      this.logger.error(
        `Failed to record webhook: carrier=${normalizedCarrier}, eventId=${eventId}, error=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Tìm và giải quyết eventId từ payload hoặc sinh SHA256 Fingerprint xác định
   */
  resolveEventId(
    carrierCode: string,
    payload: Record<string, any>,
    trackingCode?: string,
  ): string {
    // 1. Nếu payload đã có eventId tường minh
    const directEventId =
      payload.eventId ||
      payload.event_id ||
      payload.EventId ||
      payload.data?.eventId ||
      payload.data?.event_id ||
      payload.data?.EventId;

    if (directEventId && typeof directEventId === 'string' && directEventId.trim()) {
      return directEventId.trim();
    }


    // 2. Trích xuất các trường đặc trưng để sinh Fingerprint xác định
    // SHA256(carrierCode + ':' + trackingCode + ':' + carrierStatus + ':' + occurredTimestamp)
    const status = this.extractStatus(carrierCode, payload);
    const occurredAt = this.extractOccurredAt(carrierCode, payload);
    const resolvedTracking =
      trackingCode || this.extractTrackingCode(carrierCode, payload) || 'UNKNOWN_TRACKING';

    return createHash('sha256')
      .update(`${carrierCode}:${resolvedTracking}:${status}:${occurredAt.toISOString()}`)
      .digest('hex');
  }

  extractTrackingCode(carrierCode: string, payload: Record<string, any>): string {
    if (carrierCode === 'GHN') {
      return String(
        payload.OrderCode ||
          payload.order_code ||
          payload.data?.OrderCode ||
          payload.data?.order_code ||
          '',
      ).trim();
    }

    if (carrierCode === 'AHAMOVE') {
      return String(
        payload._id ||
          payload.order_id ||
          payload.data?._id ||
          payload.data?.order_id ||
          '',
      ).trim();
    }

    return String(
      payload.trackingCode ||
        payload.tracking_code ||
        payload.OrderCode ||
        payload.order_code ||
        payload._id ||
        '',
    ).trim();
  }

  extractStatus(carrierCode: string, payload: Record<string, any>): string {
    if (carrierCode === 'GHN') {
      return String(
        payload.Status ||
          payload.status ||
          payload.data?.Status ||
          payload.data?.status ||
          '',
      ).trim();
    }

    if (carrierCode === 'AHAMOVE') {
      const orderStatus = String(payload.status || payload.order_status || '').trim();
      const dropoffStatus = String(
        payload.dropoff_status || payload.path?.[1]?.status || '',
      ).trim();
      return dropoffStatus ? `${orderStatus}:${dropoffStatus}` : orderStatus;
    }

    return String(payload.status || payload.Status || '').trim();
  }

  extractOccurredAt(carrierCode: string, payload: Record<string, any>): Date {
    const rawTime =
      payload.Time ||
      payload.time ||
      payload.data?.Time ||
      payload.data?.time ||
      payload.timestamp ||
      payload.updated_at ||
      payload.occurredAt ||
      payload.occurred_at;

    if (rawTime) {
      const date = new Date(rawTime);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return new Date();
  }

  extractEventType(carrierCode: string, payload: Record<string, any>): string {
    return String(
      payload.eventType ||
        payload.event_type ||
        payload.Type ||
        payload.type ||
        'SHIPMENT_STATUS_UPDATE',
    );
  }

  async markProcessed(
    inboxId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ShippingWebhookInbox> {
    const client = tx || this.prisma;
    return client.shippingWebhookInbox.update({
      where: { id: inboxId },
      data: {
        processedStatus: 'PROCESSED',
        processedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async markFailed(
    inboxId: string,
    errorMessage: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ShippingWebhookInbox> {
    const client = tx || this.prisma;
    return client.shippingWebhookInbox.update({
      where: { id: inboxId },
      data: {
        processedStatus: 'FAILED',
        errorMessage,
      },
    });
  }

  async markIgnored(
    inboxId: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ShippingWebhookInbox> {
    const client = tx || this.prisma;
    return client.shippingWebhookInbox.update({
      where: { id: inboxId },
      data: {
        processedStatus: 'IGNORED',
        errorMessage: reason,
        processedAt: new Date(),
      },
    });
  }
}
