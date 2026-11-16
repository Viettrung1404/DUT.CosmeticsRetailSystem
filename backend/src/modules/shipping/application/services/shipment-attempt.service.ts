import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma, ShipmentAttempt } from '@prisma/client';
import {
  RecordFailedAttemptDto,
  ShipmentAttemptResponseDto,
} from '../../presentation/dtos/shipment-attempt.dto';
import { IOutboxWriter, OUTBOX_WRITER } from '@modules/async-infrastructure';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';

export interface RecordFailedAttemptResult {
  shipmentId: string;
  attemptNumber: number;
  status: string;
  isRtoSuggested: boolean;
  attempt: ShipmentAttempt;
}

@Injectable()
export class ShipmentAttemptService {
  private readonly logger = new Logger(ShipmentAttemptService.name);
  public static readonly MAX_DELIVERY_ATTEMPTS = 3;

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter?: IOutboxWriter,
    @Optional()
    private readonly orderStateAggregator?: OrderStateAggregator,
  ) {}

  /**
   * Ghi nhận một lần giao hàng thất bại (Delivery Attempt Failed)
   * 
   * Acceptance Criteria:
   * 1. Giao thất bại lần 1, 2 không làm hủy đơn hàng (Order vẫn duy trì trạng thái hợp lệ).
   * 2. Khi đạt số lần thất bại tối đa (3 lần), hệ thống đề xuất hoặc kích hoạt chuyển sang RETURNING.
   */
  async recordFailedAttempt(
    shipmentIdOrTracking: string,
    dto: RecordFailedAttemptDto,
    tx?: Prisma.TransactionClient,
  ): Promise<RecordFailedAttemptResult> {
    const client = tx || this.prisma;

    // 1. Tìm kiếm Shipment
    const shipment = await client.shipment.findFirst({
      where: {
        OR: [
          { id: shipmentIdOrTracking },
          { trackingCode: shipmentIdOrTracking },
          { shipmentCode: shipmentIdOrTracking },
        ],
      },
    });

    if (!shipment) {
      throw new NotFoundException(
        `Không tìm thấy vận đơn với định danh: ${shipmentIdOrTracking}`,
      );
    }

    const nextAttemptNumber = (shipment.failedAttempts || 0) + 1;
    const attemptedAt = dto.attemptedAt ? new Date(dto.attemptedAt) : new Date();
    const isRtoSuggested = nextAttemptNumber >= ShipmentAttemptService.MAX_DELIVERY_ATTEMPTS;

    // 2. Tạo bản ghi shipment_attempts
    const attempt = await client.shipmentAttempt.create({
      data: {
        shipmentId: shipment.id,
        attemptNumber: nextAttemptNumber,
        attemptedAt,
        failureReasonCode: dto.failureReasonCode || 'CUSTOMER_UNREACHABLE',
        failureReasonDetail: dto.failureReasonDetail || null,
        carrierRawStatus: dto.carrierRawStatus || null,
      },
    });

    // 3. Cập nhật Shipment
    // Lần 1 và 2: DELIVERY_FAILED. Lần 3+: RETURNING nếu đạt giới hạn quy định.
    const newStatus = isRtoSuggested ? 'RETURNING' : 'DELIVERY_FAILED';

    await client.shipment.update({
      where: { id: shipment.id },
      data: {
        failedAttempts: nextAttemptNumber,
        status: newStatus,
      },
    });

    // 4. Ghi Outbox Event
    if (this.outboxWriter) {
      await this.outboxWriter.record(client, {
        aggregateType: 'SHIPMENT',
        aggregateId: shipment.id,
        eventType: isRtoSuggested
          ? 'SHIPMENT_RETURNING_TRIGGERED'
          : 'DELIVERY_ATTEMPT_FAILED',
        occurredAt: attemptedAt,
        payload: {
          shipmentId: shipment.id,
          orderId: shipment.orderId,
          trackingCode: shipment.trackingCode,
          attemptNumber: nextAttemptNumber,
          failureReasonCode: dto.failureReasonCode,
          isRtoSuggested,
          newStatus,
          occurredAt: attemptedAt,
        },

      });
    }

    // 5. Đồng bộ trạng thái đơn hàng cha qua OrderStateAggregator
    // AC1: Giao thất bại lần 1, 2 không làm hủy đơn hàng cha
    if (this.orderStateAggregator && shipment.orderId) {
      await this.orderStateAggregator.computeOrderStatus(shipment.orderId, client);
    }

    this.logger.warn(
      `Delivery attempt #${nextAttemptNumber} recorded for shipment ${shipment.id} (${shipment.trackingCode}): reason=${dto.failureReasonCode}, newStatus=${newStatus}`,
    );

    return {
      shipmentId: shipment.id,
      attemptNumber: nextAttemptNumber,
      status: newStatus,
      isRtoSuggested,
      attempt,
    };
  }

  /**
   * Lấy danh sách toàn bộ các lượt giao của vận đơn
   */
  async getAttempts(shipmentId: string): Promise<ShipmentAttemptResponseDto[]> {
    const attempts = await this.prisma.shipmentAttempt.findMany({
      where: { shipmentId },
      orderBy: { attemptNumber: 'asc' },
    });

    return attempts.map((a) => ({
      id: a.id,
      shipmentId: a.shipmentId,
      attemptNumber: a.attemptNumber,
      attemptedAt: a.attemptedAt,
      failureReasonCode: a.failureReasonCode,
      failureReasonDetail: a.failureReasonDetail,
      carrierRawStatus: a.carrierRawStatus,
    }));
  }
}
