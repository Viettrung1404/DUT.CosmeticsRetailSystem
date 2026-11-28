import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { WebhookInboxService } from './webhook-inbox.service';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';
import { IOutboxWriter, OUTBOX_WRITER } from '../outbox/outbox-writer.interface';
import { mapGHNStatus } from '@modules/shipping/infrastructure/adapters/ghn/ghn-status.mapper';
import { mapAhamoveStatus } from '@modules/shipping/infrastructure/adapters/ahamove/ahamove-status.mapper';

export interface ProcessWebhookResult {
  status: 'PROCESSED' | 'ALREADY_PROCESSED' | 'IGNORED' | 'FAILED';
  inboxId: string;
  shipmentId: string | null;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
}

export const PROGRESSION_RANKS: Record<string, number> = {
  PENDING_CREATION: 10,
  CREATION_UNKNOWN: 15,
  CREATED: 20,
  DRIVER_ASSIGNED: 30,
  PICKED_UP: 40,
  IN_TRANSIT: 50,
  OUT_FOR_DELIVERY: 60,
  DELIVERED: 100, // Terminal success
  DELIVERY_FAILED: 65,
  RETURNING: 70,
  RETURNED: 100, // Terminal return
  CANCELLED: 100, // Terminal cancelled
  DISPATCH_FAILED: 100,
  EXCEPTION: 90,
};

export const TERMINAL_STATUSES = new Set(['DELIVERED', 'RETURNED', 'CANCELLED']);

/**
 * State Transition Guard: Kiểm tra tính hợp lệ của việc chuyển đổi trạng thái Shipment
 * Tuyệt đối không cho phép lùi trạng thái khi đã hoàn tất (ví dụ: đã DELIVERED thì bỏ qua sự kiện IN_TRANSIT trễ).
 */
export function isValidShipmentTransition(
  currentStatus: string,
  targetStatus: string,
): { isValid: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { isValid: false, reason: `Shipment is already in status ${currentStatus}` };
  }

  // 1. Chặn mọi thay đổi khi đã ở trạng thái kết thúc (Terminal states)
  if (TERMINAL_STATUSES.has(currentStatus)) {
    return {
      isValid: false,
      reason: `Cannot transition from terminal status ${currentStatus} to ${targetStatus}`,
    };
  }

  // 2. Ngoại lệ hợp lệ: Cho phép từ DELIVERY_FAILED chuyển sang OUT_FOR_DELIVERY / IN_TRANSIT (giao lại) hoặc RETURNING (chuyển hoàn)
  if (
    currentStatus === 'DELIVERY_FAILED' &&
    ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'RETURNING', 'CANCELLED'].includes(targetStatus)
  ) {
    return { isValid: true };
  }

  // 3. Trạng thái EXCEPTION luôn được ghi nhận để kiểm tra thủ công
  if (targetStatus === 'EXCEPTION') {
    return { isValid: true };
  }

  // 4. Kiểm tra thứ bậc tiến trình (Rank-based Guard chống nhận sự kiện muộn/lộn xộn)
  const currentRank = PROGRESSION_RANKS[currentStatus] || 0;
  const targetRank = PROGRESSION_RANKS[targetStatus] || 0;

  if (targetRank < currentRank) {
    return {
      isValid: false,
      reason: `Outdated event rejected: cannot transition backwards from ${currentStatus} (rank ${currentRank}) to ${targetStatus} (rank ${targetRank})`,
    };
  }

  return { isValid: true };
}

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookInboxService: WebhookInboxService,
    @Optional()
    private readonly orderStateAggregator?: OrderStateAggregator,
    @Optional()
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter?: IOutboxWriter,
  ) {}


  /**
   * Xử lý một sự kiện Webhook từ Inbox theo ID
   */
  async processEvent(inboxId: string): Promise<ProcessWebhookResult> {
    const inbox = await this.prisma.shippingWebhookInbox.findUnique({
      where: { id: inboxId },
    });

    if (!inbox) {
      throw new NotFoundException(`Không tìm thấy bản ghi webhook inbox: ${inboxId}`);
    }

    if (inbox.processedStatus === 'PROCESSED') {
      return { status: 'ALREADY_PROCESSED', inboxId, shipmentId: null };
    }

    if (inbox.processedStatus === 'IGNORED') {
      return { status: 'IGNORED', inboxId, shipmentId: null, reason: inbox.errorMessage || undefined };
    }

    const payload = (inbox.payload as Record<string, any>) || {};
    const carrierCode = inbox.carrierCode.toUpperCase();
    const trackingCode =
      inbox.trackingCode || this.webhookInboxService.extractTrackingCode(carrierCode, payload);

    if (!trackingCode) {
      await this.webhookInboxService.markIgnored(
        inbox.id,
        'Không tìm thấy trackingCode trong webhook payload',
      );
      return { status: 'IGNORED', inboxId, shipmentId: null, reason: 'NO_TRACKING_CODE' };
    }

    // Thực thi xử lý trong PostgreSQL transaction để đảm bảo tính nhất quán
    return this.prisma.$transaction(async (tx) => {
      // 1. Tìm Shipment liên kết
      const shipment = await tx.shipment.findFirst({
        where: {
          OR: [
            { trackingCode: trackingCode },
            { carrierReferenceId: trackingCode },
            { shipmentCode: trackingCode },
          ],
        },
      });

      if (!shipment) {
        this.logger.warn(
          `Shipment not found for trackingCode=${trackingCode}, carrier=${carrierCode}`,
        );
        await this.webhookInboxService.markFailed(
          inbox.id,
          `Shipment not found for tracking code: ${trackingCode}`,
          tx,
        );
        return { status: 'FAILED', inboxId, shipmentId: null, reason: 'SHIPMENT_NOT_FOUND' };
      }

      // 2. Ánh xạ trạng thái của nhà vận chuyển sang ShipmentStatus nội bộ
      const targetStatus = this.resolveTargetStatus(carrierCode, payload);

      // 3. State Transition Guard: Chống lùi trạng thái
      const transitionCheck = isValidShipmentTransition(shipment.status, targetStatus);
      if (!transitionCheck.isValid) {
        this.logger.warn(
          `Transition skipped for shipment ${shipment.id} (${shipment.trackingCode}): ${transitionCheck.reason}`,
        );
        await this.webhookInboxService.markIgnored(
          inbox.id,
          transitionCheck.reason || 'Invalid transition',
          tx,
        );
        return {
          status: 'IGNORED',
          inboxId,
          shipmentId: shipment.id,
          previousStatus: shipment.status,
          newStatus: targetStatus,
          reason: transitionCheck.reason,
        };
      }

      // 4. Cập nhật Shipment
      const occurredAt = this.webhookInboxService.extractOccurredAt(carrierCode, payload);
      const updateData: Prisma.ShipmentUpdateInput = {
        status: targetStatus,
      };

      if (targetStatus === 'DELIVERED') {
        updateData.deliveredAt = occurredAt;
        updateData.codStatus = 'COD_COLLECTED';
      } else if (targetStatus === 'DELIVERY_FAILED') {
        updateData.failedAttempts = { increment: 1 };
      }

      await tx.shipment.update({
        where: { id: shipment.id },
        data: updateData,
      });

      // 5. Ghi nhật ký vào ShipmentEvent
      try {
        await tx.shipmentEvent.create({
          data: {
            shipmentId: shipment.id,
            carrierCode,
            eventId: inbox.eventId,
            status: targetStatus,
            occurredAt,
          },
        });
      } catch (evtErr: any) {
        this.logger.warn(
          `ShipmentEvent already exists for eventId=${inbox.eventId}: ${evtErr.message}`,
        );
      }

      // 6. Ghi Outbox Event
      if (this.outboxWriter) {
        await this.outboxWriter.record(tx, {
          aggregateType: 'SHIPMENT',
          aggregateId: shipment.id,
          eventType: 'SHIPMENT_STATUS_UPDATED',
          occurredAt,
          payload: {
            shipmentId: shipment.id,
            orderId: shipment.orderId,
            trackingCode: shipment.trackingCode,
            carrierCode,
            previousStatus: shipment.status,
            newStatus: targetStatus,
            occurredAt,
          },
        });

        // Nếu giao thành công và có số tiền COD phát sinh -> Ghi nhận sự kiện COD_COLLECTED_CONFIRMED
        if (targetStatus === 'DELIVERED' && Number(shipment.codAmount || 0) > 0) {
          await this.outboxWriter.record(tx, {
            aggregateType: 'SHIPMENT',
            aggregateId: shipment.id,
            eventType: 'COD_COLLECTED_CONFIRMED',
            occurredAt,
            payload: {
              shipmentId: shipment.id,
              orderId: shipment.orderId,
              fulfillmentOrderId: shipment.fulfillmentOrderId,
              trackingCode: shipment.trackingCode,
              carrierCode,
              codAmount: Number(shipment.codAmount),
              collectedAt: occurredAt,
            },
          });
        }
      }

      // 7. Gọi OrderStateAggregator để cập nhật trạng thái đơn hàng cha
      if (this.orderStateAggregator && shipment.orderId) {
        await this.orderStateAggregator.computeOrderStatus(shipment.orderId, tx);
      }

      // 8. Đánh dấu Webhook Inbox là PROCESSED
      await this.webhookInboxService.markProcessed(inbox.id, tx);

      this.logger.log(
        `Webhook processed successfully: shipment=${shipment.id}, ${shipment.status} -> ${targetStatus}`,
      );

      return {
        status: 'PROCESSED',
        inboxId,
        shipmentId: shipment.id,
        previousStatus: shipment.status,
        newStatus: targetStatus,
      };
    });
  }

  /**
   * Pipeline tiếp nhận và xử lý ngay lập tức (Sync Ingress Pipeline)
   */
  async processWebhook(
    carrierCode: string,
    payload: Record<string, any>,
    headers?: Record<string, any>,
  ): Promise<ProcessWebhookResult> {
    const recordResult = await this.webhookInboxService.recordWebhook(carrierCode, payload, headers);

    if (recordResult.isDuplicate) {
      return {
        status: 'ALREADY_PROCESSED',
        inboxId: recordResult.inbox.id,
        shipmentId: null,
        reason: 'DUPLICATE_WEBHOOK',
      };
    }

    return this.processEvent(recordResult.inbox.id);
  }

  /**
   * Ánh xạ mã trạng thái đối tác sang ShipmentStatus
   */
  resolveTargetStatus(carrierCode: string, payload: Record<string, any>): string {
    const norm = carrierCode.toUpperCase();
    if (norm === 'GHN') {
      const rawStatus = String(
        payload.Status || payload.status || payload.data?.Status || payload.data?.status || '',
      );
      return mapGHNStatus(rawStatus);
    }

    if (norm === 'AHAMOVE') {
      const rawOrderStatus = String(payload.status || payload.order_status || '');
      const rawDropoffStatus = payload.dropoff_status || payload.path?.[1]?.status;
      return mapAhamoveStatus(rawOrderStatus, rawDropoffStatus);
    }

    // Mock / Generic
    const raw = String(payload.status || payload.Status || '').toUpperCase();
    if (['DELIVERED', 'COMPLETED', 'SUCCESS'].includes(raw)) return 'DELIVERED';
    if (['DELIVERY_FAILED', 'FAILED'].includes(raw)) return 'DELIVERY_FAILED';
    if (['OUT_FOR_DELIVERY', 'DELIVERING'].includes(raw)) return 'OUT_FOR_DELIVERY';
    if (['IN_TRANSIT', 'PICKED_UP', 'PICKED'].includes(raw)) return 'IN_TRANSIT';
    if (['RETURNING'].includes(raw)) return 'RETURNING';
    if (['RETURNED'].includes(raw)) return 'RETURNED';
    if (['CANCELLED', 'CANCELED'].includes(raw)) return 'CANCELLED';
    return raw || 'IN_TRANSIT';
  }
}
