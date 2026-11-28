import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IOutboxWriter, OUTBOX_WRITER } from '@modules/async-infrastructure';
import { Inject } from '@nestjs/common';
import { AhamoveProvider } from '../../infrastructure/adapters/ahamove/ahamove-provider';
import { CreateShipmentDto, ShipmentType } from '../../domain/dtos/shipping-provider.dto';

export interface RedispatchResult {
  success: boolean;
  reallocated: boolean;
  attemptCount: number;
  newTrackingCode?: string;
  trackingUrl?: string;
  status: string;
  message?: string;
}

export const MAX_AHAMOVE_REDISPATCH_ATTEMPTS = 2; // Tối đa 2 lần tìm tài xế tự động

@Injectable()
export class AhamoveRedispatchService {
  private readonly logger = new Logger(AhamoveRedispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ahamoveProvider: AhamoveProvider,
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter: IOutboxWriter,
  ) {}

  /**
   * Xử lý tự động điều phối lại chuyến xe (Re-dispatch) khi tài xế Ahamove bấm hủy chuyến
   * hoặc không có tài xế nhận cuốc.
   *
   * Acceptance Criteria:
   * 1. Tài xế bấm hủy => Tự động tìm tài xế mới trong 30 giây (tối đa 2 lần).
   * 2. Quá 2 lần thất bại => Chuyển sang DISPATCH_FAILED và phát cảnh báo thủ công.
   */
  async handleDriverCancellation(
    trackingCode: string,
    cancelReason?: string,
  ): Promise<RedispatchResult> {
    this.logger.warn({
      event: 'ahamove_driver_cancellation_detected',
      trackingCode,
      reason: cancelReason,
    });

    // 1. Tìm Shipment theo trackingCode
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        trackingCode,
        carrierCode: 'AHAMOVE',
      },
      include: {
        order: true,
        fulfillmentOrder: true,
        packages: {
          include: {
            package: {
              include: {
                items: {
                  include: {
                    variant: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(
        `Không tìm thấy vận đơn Ahamove với tracking_code "${trackingCode}"`,
      );
    }

    // Đã giao thành công hoặc hủy hoàn toàn thì không re-dispatch
    if (shipment.status === 'DELIVERED' || shipment.status === 'RETURNED') {
      return {
        success: false,
        reallocated: false,
        attemptCount: 0,
        status: shipment.status,
        message: `Vận đơn đã ở trạng thái kết thúc (${shipment.status}), không thể tái điều phối.`,
      };
    }

    // 2. Kiểm tra số lần đã thử lại từ metadata
    const metadata = (shipment.carrierMetadata as Record<string, any>) || {};
    const currentAttempts = Number(metadata.redispatchCount || 0);

    // 3. Nếu đã thử 2 lần => Chuyển sang DISPATCH_FAILED & Bắn cảnh báo can thiệp thủ công
    if (currentAttempts >= MAX_AHAMOVE_REDISPATCH_ATTEMPTS) {
      this.logger.error({
        event: 'ahamove_redispatch_exhausted',
        shipmentId: shipment.id,
        shipmentCode: shipment.shipmentCode,
        attempts: currentAttempts,
        maxAttempts: MAX_AHAMOVE_REDISPATCH_ATTEMPTS,
        message: 'Đã thử đặt lại tài xế 2 lần nhưng không thành công. Yêu cầu điều phối viên xử lý thủ công.',
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: 'DISPATCH_FAILED',
            carrierMetadata: {
              ...metadata,
              redispatchExhausted: true,
              lastCancelReason: cancelReason,
            },
          },
        });

        // Ghi Outbox Event cảnh báo cần can thiệp thủ công
        await this.outboxWriter.record(tx, {
          aggregateType: 'SHIPMENT',
          aggregateId: shipment.id,
          eventType: 'AHAMOVE_MANUAL_INTERVENTION_REQUIRED',
          payload: {
            shipmentId: shipment.id,
            shipmentCode: shipment.shipmentCode,
            orderId: shipment.orderId,
            carrierCode: 'AHAMOVE',
            attempts: currentAttempts,
            lastCancelReason: cancelReason,
            timestamp: new Date().toISOString(),
          },
        });
      });

      return {
        success: false,
        reallocated: false,
        attemptCount: currentAttempts,
        status: 'DISPATCH_FAILED',
        message: 'Vượt quá 2 lần tìm tài xế hỏa tốc. Cần can thiệp thủ công.',
      };
    }

    // 4. Chuẩn bị dữ liệu để tự động đặt lại chuyến xe mới
    const newAttemptCount = currentAttempts + 1;

    // Lấy thông tin Showroom (Sender)
    let sender = {
      name: 'Showroom GlowUp',
      phone: '0901234567',
      addressLine: 'Showroom GlowUp',
      district: 'Quận 1',
      province: 'Hồ Chí Minh',
      latitude: undefined as number | undefined,
      longitude: undefined as number | undefined,
    };

    if (shipment.fulfillmentOrder?.sourceLocationId) {
      const store = await this.prisma.store.findUnique({
        where: { id: shipment.fulfillmentOrder.sourceLocationId },
      });
      if (store) {
        sender = {
          name: store.name,
          phone: store.phone || '0901234567',
          addressLine: store.address,
          district: store.district,
          province: store.city,
          latitude: store.latitude ? Number(store.latitude) : undefined,
          longitude: store.longitude ? Number(store.longitude) : undefined,
        };
      }
    }

    // Lấy thông tin Khách hàng (Recipient)
    const rawAddress = (shipment.order?.shippingAddress || {}) as Record<string, any>;
    const recipient = {
      name: rawAddress.fullName || rawAddress.recipientName || 'Khach Hang',
      phone: rawAddress.phone || rawAddress.recipientPhone || '0987654321',
      addressLine: rawAddress.addressLine || rawAddress.street || 'Dia chi giao hang',
      district: rawAddress.district || 'Quan',
      province: rawAddress.city || rawAddress.province || 'Hồ Chí Minh',
      latitude: rawAddress.latitude ? Number(rawAddress.latitude) : undefined,
      longitude: rawAddress.longitude ? Number(rawAddress.longitude) : undefined,
    };

    // Đóng gói CreateShipmentDto
    const createDto: CreateShipmentDto = {
      shipmentCode: shipment.shipmentCode,
      clientOrderCode: shipment.shipmentCode,
      shipmentType: (shipment.shipmentType as ShipmentType) || 'OUTBOUND',
      carrierCode: 'AHAMOVE',
      sender,
      recipient,
      parcel: {
        weightGrams: 500,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 10,
      },
      items: [],
      codAmountVnd: Number(shipment.codAmount || 0),
    };

    // 5. Gọi Ahamove Provider để đặt cuốc xe mới
    try {
      this.logger.log({
        event: 'ahamove_redispatch_attempt_initiated',
        shipmentCode: shipment.shipmentCode,
        attempt: newAttemptCount,
      });

      const newBooking = await this.ahamoveProvider.createShipment(createDto);

      // 6. Cập nhật Shipment với trackingCode mới và Outbox Event
      await this.prisma.$transaction(async (tx) => {
        await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            trackingCode: newBooking.trackingCode,
            carrierReferenceId: newBooking.carrierReferenceId,
            trackingUrl: newBooking.trackingUrl,
            status: 'CREATED',
            carrierMetadata: {
              ...metadata,
              redispatchCount: newAttemptCount,
              lastBookingResponse: newBooking.rawResponse as any,
              reassignedAt: new Date().toISOString(),
            } as any,
          },
        });

        // Ghi Outbox Event tài xế được chỉ định lại
        await this.outboxWriter.record(tx, {
          aggregateType: 'SHIPMENT',
          aggregateId: shipment.id,
          eventType: 'AHAMOVE_DRIVER_REASSIGNED',
          payload: {
            shipmentId: shipment.id,
            shipmentCode: shipment.shipmentCode,
            oldTrackingCode: trackingCode,
            newTrackingCode: newBooking.trackingCode,
            attemptCount: newAttemptCount,
            trackingUrl: newBooking.trackingUrl,
            timestamp: new Date().toISOString(),
          },
        });
      });

      return {
        success: true,
        reallocated: true,
        attemptCount: newAttemptCount,
        newTrackingCode: newBooking.trackingCode,
        trackingUrl: newBooking.trackingUrl,
        status: 'CREATED',
        message: `Đã tự động tìm tài xế mới thành công (Lần thử ${newAttemptCount}/${MAX_AHAMOVE_REDISPATCH_ATTEMPTS})`,
      };
    } catch (err: any) {
      this.logger.error({
        event: 'ahamove_redispatch_booking_failed',
        shipmentCode: shipment.shipmentCode,
        error: err.message,
      });

      // Nếu lần gọi này thất bại và đã hết quota => DISPATCH_FAILED
      const finalStatus = newAttemptCount >= MAX_AHAMOVE_REDISPATCH_ATTEMPTS ? 'DISPATCH_FAILED' : shipment.status;
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: finalStatus,
          carrierMetadata: {
            ...metadata,
            redispatchCount: newAttemptCount,
            lastError: err.message,
          } as any,
        },
      });

      return {
        success: false,
        reallocated: false,
        attemptCount: newAttemptCount,
        status: finalStatus,
        message: `Lỗi đặt lại tài xế: ${err.message}`,
      };
    }
  }
}
