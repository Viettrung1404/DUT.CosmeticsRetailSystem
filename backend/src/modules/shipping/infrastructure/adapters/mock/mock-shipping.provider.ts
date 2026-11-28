import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { IShippingProvider } from '../../../domain/ports/shipping-provider.interface';
import {
  QuoteRequestDto,
  QuoteResponseDto,
  CreateShipmentDto,
  ShipmentResultDto,
  ParsedWebhookDto,
} from '../../../domain/dtos/shipping-provider.dto';

export const MOCK_CARRIER_CODE = 'MOCK';

/**
 * Mock Shipping Provider
 * Giả lập đối tác vận chuyển phục vụ Unit/Integration tests mà không phụ thuộc vào internet hay 3PL sandbox.
 */
@Injectable()
export class MockShippingProvider implements IShippingProvider {
  readonly carrierCode = MOCK_CARRIER_CODE;
  private readonly logger = new Logger(MockShippingProvider.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Giả lập tính phí: Trả về 25.000đ cố định theo DES-07
   */
  async calculateFee(req: QuoteRequestDto): Promise<QuoteResponseDto> {
    const feeAmountVnd = 25000;
    const now = new Date();
    const estimatedDeliveryAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    return {
      carrierCode: this.carrierCode,
      serviceCode: req.serviceCode || 'MOCK_STANDARD',
      feeAmountVnd,
      estimatedDeliveryDays: 2,
      estimatedDeliveryAt,
    };
  }

  /**
   * Giả lập tạo vận đơn: Sinh mã tracking ngẫu nhiên dạng MOCK-TRK-XXXXX và link in nhãn giả lập
   */
  async createShipment(req: CreateShipmentDto): Promise<ShipmentResultDto> {
    const randomHex = randomBytes(3).toString('hex').toUpperCase();
    const timestampStr = Date.now().toString().slice(-5);
    const trackingCode = `MOCK-TRK-${timestampStr}${randomHex}`;
    const carrierReferenceId = `MOCK-REF-${Date.now()}`;
    const shippingLabelUrl = `https://mock-carrier.glowup.vn/labels/${trackingCode}`;
    const trackingUrl = `https://mock-carrier.glowup.vn/tracking/${trackingCode}`;
    const estimatedDeliveryAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    this.logger.log(
      `[MockShippingProvider] Đã sinh vận đơn: trackingCode=${trackingCode}, orderNumber=${req.orderNumber || req.clientOrderCode || 'N/A'}`,
    );

    return {
      trackingCode,
      carrierReferenceId,
      carrierServiceCode: req.serviceCode || 'MOCK_STANDARD',
      shippingLabelUrl,
      trackingUrl,
      actualFeeVnd: 25000,
      estimatedDeliveryAt,
      rawResponse: {
        success: true,
        message: 'Mock shipment created successfully',
        mock: true,
      },
    };
  }

  /**
   * Giả lập hủy vận đơn: luôn trả về true
   */
  async cancelShipment(trackingCode: string): Promise<boolean> {
    this.logger.log(`[MockShippingProvider] Hủy vận đơn: trackingCode=${trackingCode}`);
    return true;
  }

  /**
   * Giả lập phân tích webhook từ đối tác
   */
  parseWebhook(
    rawBody: unknown,
    _headers: Record<string, string | string[] | undefined>,
  ): ParsedWebhookDto {
    const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as Record<string, any>;
    const eventId = String(body.eventId || `MOCK-EVT-${Date.now()}`);
    const trackingCode = String(body.trackingCode || '');
    const status = String(body.status || 'IN_TRANSIT');
    const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();

    return {
      carrierCode: this.carrierCode,
      eventId,
      eventType: body.eventType || 'STATUS_UPDATE',
      trackingCode,
      status,
      reasonCode: body.reasonCode,
      reasonDetail: body.reasonDetail,
      occurredAt,
      rawPayload: body,
    };
  }
}
