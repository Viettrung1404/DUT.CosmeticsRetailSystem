import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { IShippingProvider } from '../../../domain/ports/shipping-provider.interface';
import {
  QuoteRequestDto,
  QuoteResponseDto,
  CreateShipmentDto,
  ShipmentResultDto,
  ParsedWebhookDto,
} from '../../../domain/dtos/shipping-provider.dto';
import { AhamoveClient, MAX_EXPRESS_RADIUS_KM } from './ahamove-client';
import { mapAhamoveStatus } from './ahamove-status.mapper';

@Injectable()
export class AhamoveProvider implements IShippingProvider {
  readonly carrierCode = 'AHAMOVE';
  private readonly logger = new Logger(AhamoveProvider.name);

  constructor(
    private readonly config: ConfigService,
    private readonly ahamoveClient: AhamoveClient,
  ) {}

  /**
   * Báo giá cước giao hỏa tốc 2H Ahamove
   */
  async calculateFee(req: QuoteRequestDto): Promise<QuoteResponseDto> {
    return this.ahamoveClient.calculateFee(req);
  }

  /**
   * Đặt chuyến xe giao hàng hỏa tốc 2H trên Ahamove (POST /v1/order/create)
   * Trích xuất đường dẫn xem bản đồ trực tiếp (Live Tracking Map Link)
   *
   * Quy tắc nghiệp vụ & Kỹ thuật:
   * - [FACT]: Ahamove không có API in nhãn vận đơn A6. Hệ thống tự in Phiếu giao hàng nội bộ khổ A6.
   * - [DEC-01]: Giới hạn tối đa bán kính 10 km đường bộ.
   * - [IDEMPOTENCY]: tracking_number = shipment.shipmentCode.
   */
  async createShipment(req: CreateShipmentDto): Promise<ShipmentResultDto> {
    this.logger.log({
      event: 'ahamove_create_shipment_initiated',
      shipmentCode: req.shipmentCode,
      sender: req.sender.name,
      recipient: req.recipient.name,
      phone: req.recipient.phone,
    });

    // 1. Phân giải tọa độ điểm lấy (Showroom) và điểm giao (Khách)
    const senderCoords = this.ahamoveClient.resolveCoordinates(
      req.sender.province,
      req.sender.district,
      req.sender.latitude,
      req.sender.longitude,
    );

    const recipientCoords = this.ahamoveClient.resolveCoordinates(
      req.recipient.province,
      req.recipient.district,
      req.recipient.latitude,
      req.recipient.longitude,
    );

    // 2. Kiểm tra bán kính phục vụ tối đa 10km theo DEC-01
    const distanceKm = this.ahamoveClient.calculateHaversineDistanceKm(
      senderCoords,
      recipientCoords,
    );

    if (distanceKm > MAX_EXPRESS_RADIUS_KM) {
      throw new BadRequestException(
        `AHAMOVE_SERVICE_UNAVAILABLE: Khoảng cách giao hàng (${distanceKm} km) vượt quá giới hạn phục vụ tối đa ${MAX_EXPRESS_RADIUS_KM} km của dịch vụ Hỏa tốc 2H.`,
      );
    }

    const serviceId = this.ahamoveClient.resolveServiceId(req.sender.province);

    // 3. Đóng gói payload tạo chuyến xe theo DES-05 (dòng 337-360)
    const payload = {
      order_time: 0, // Đặt giao ngay tức thời
      service_id: serviceId,
      payment_method: 'BALANCE', // Trừ tài khoản trả trước GlowUp
      path: [
        {
          address: req.sender.addressLine,
          name: req.sender.name || 'Kho GlowUp',
          mobile: req.sender.phone || '0901234567',
          lat: senderCoords.latitude,
          lng: senderCoords.longitude,
          remarks: `Lấy kiện hàng mã ${req.shipmentCode} tại quầy điều phối`,
        },
        {
          address: req.recipient.addressLine,
          name: req.recipient.name,
          mobile: req.recipient.phone,
          lat: recipientCoords.latitude,
          lng: recipientCoords.longitude,
          cod_amount: Math.round(req.codAmountVnd || 0),
          tracking_number: req.shipmentCode,
        },
      ],
    };

    // 4. Gọi API tạo booking trên Ahamove
    const ahmData = await this.ahamoveClient.createOrder(payload);
    const trackingCode = ahmData.order_id || ahmData._id;

    if (!trackingCode) {
      throw new Error('AHAMOVE_ORDER_ID_MISSING: Ahamove không trả về mã order_id!');
    }

    // 5. Trích xuất link theo dõi trực tiếp vị trí tài xế trên bản đồ (Live Tracking Map Link)
    let liveTrackingUrl = ahmData.shared_link;
    if (!liveTrackingUrl) {
      liveTrackingUrl = await this.ahamoveClient.getSharedLink(trackingCode);
    }

    // Fallback live tracking URL chuẩn nếu API shared link gián đoạn
    if (!liveTrackingUrl) {
      liveTrackingUrl = `https://ahamove.com/share/${trackingCode}`;
    }

    // Ahamove không hỗ trợ tem nhiệt A6 -> Sinh link Phiếu giao hàng nội bộ khổ A6
    const internalLabelUrl = `/api/v1/admin/shipments/${req.shipmentCode}/print-delivery-note`;

    this.logger.log({
      event: 'ahamove_shipment_created_successfully',
      shipmentCode: req.shipmentCode,
      trackingCode,
      liveTrackingUrl,
    });

    const estimatedDeliveryAt = new Date();
    estimatedDeliveryAt.setHours(estimatedDeliveryAt.getHours() + 2); // 2 giờ hỏa tốc

    return {
      trackingCode,
      carrierReferenceId: trackingCode,
      carrierServiceCode: 'AHAMOVE_EXPRESS_2H',
      trackingUrl: liveTrackingUrl,
      shippingLabelUrl: internalLabelUrl,
      actualFeeVnd: ahmData.total_price || ahmData.fee,
      estimatedDeliveryAt,
      rawResponse: ahmData,
    };
  }

  /**
   * Hủy chuyến giao hàng trên hệ thống Ahamove
   */
  async cancelShipment(trackingCode: string): Promise<boolean> {
    try {
      return await this.ahamoveClient.cancelOrder(trackingCode);
    } catch (err: any) {
      this.logger.error(`Failed to cancel Ahamove shipment ${trackingCode}: ${err.message}`);
      return false;
    }
  }

  /**
   * Phân tích và chuẩn hóa Webhook nhận từ Ahamove
   */
  parseWebhook(
    rawBody: unknown,
    _headers: Record<string, string | string[] | undefined>,
  ): ParsedWebhookDto {
    const body = (rawBody as Record<string, any>) || {};
    const trackingCode = String(
      body._id || body.order_id || body.data?._id || '',
    );
    const rawOrderStatus = String(body.status || body.order_status || '');
    const rawDropoffStatus = body.dropoff_status || body.path?.[1]?.status;

    const mappedStatus = mapAhamoveStatus(rawOrderStatus, rawDropoffStatus);

    const occurredAt = body.timestamp || body.updated_at || body.time
      ? new Date(body.timestamp || body.updated_at || body.time)
      : new Date();

    const eventId = String(
      body.event_id ||
        body._id + '_' + (body.version || Date.now()) ||
        createHash('sha256')
          .update(`AHAMOVE:${trackingCode}:${mappedStatus}:${occurredAt.toISOString()}`)
          .digest('hex'),
    );

    return {
      carrierCode: this.carrierCode,
      eventId,
      eventType: 'SHIPMENT_STATUS_UPDATE',
      trackingCode,
      status: mappedStatus,
      reasonCode: body.cancel_comment || body.description,
      occurredAt,
      rawPayload: body,
    };
  }
}
