import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CarrierCreateRequest,
  CarrierCreateResult,
  CarrierEvent,
  CarrierGateway,
  SignedWebhook,
} from '../../domain/ports/carrier-gateway.port';
import { isShipmentStatus } from '../../domain/shipment-status';

export const MOCK_CARRIER_CODE = 'MOCK';
export const MOCK_SIGNATURE_HEADER = 'x-carrier-signature';

@Injectable()
export class MockCarrierAdapter implements CarrierGateway {
  readonly carrierCode = MOCK_CARRIER_CODE;

  constructor(private readonly config: ConfigService) {}

  async createShipment(request: CarrierCreateRequest): Promise<CarrierCreateResult> {
    const trackingCode = `MOCK${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString('hex').toUpperCase()}`;
    return {
      trackingCode,
      serviceCode: 'MOCK_STANDARD',
      labelUrl: `https://mock-carrier.invalid/labels/${trackingCode}`,
      metadata: { orderNumber: request.orderNumber, mock: true },
    };
  }

  async cancelShipment(): Promise<void> {
    // Hãng giả luôn nhận hủy
  }

  parseWebhook(body: Record<string, unknown>, headers: Record<string, string | undefined>): CarrierEvent {
    const eventId = String(body.eventId ?? '');
    const trackingCode = String(body.trackingCode ?? '');
    const status = String(body.status ?? '');
    const occurredRaw = String(body.occurredAt ?? '');
    const signature = headers[MOCK_SIGNATURE_HEADER];
    if (!signature || !this.verify(this.canonical(eventId, trackingCode, status, occurredRaw), signature)) {
      throw new UnauthorizedException('Chữ ký sự kiện vận chuyển không hợp lệ');
    }
    const occurredAt = new Date(occurredRaw);
    if (!eventId || !trackingCode || !isShipmentStatus(status) || Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Sự kiện vận chuyển thiếu hoặc sai thông tin');
    }
    return { eventId, trackingCode, status, occurredAt };
  }

  buildSignedWebhook(event: CarrierEvent): SignedWebhook {
    const occurredAt = event.occurredAt.toISOString();
    const body = { eventId: event.eventId, trackingCode: event.trackingCode, status: event.status, occurredAt };
    const signature = this.sign(this.canonical(event.eventId, event.trackingCode, event.status, occurredAt));
    return { body, headers: { [MOCK_SIGNATURE_HEADER]: signature } };
  }

  private canonical(eventId: string, trackingCode: string, status: string, occurredAt: string): string {
    return [eventId, trackingCode, status, occurredAt].join('|');
  }

  private secret(): string {
    const secret = this.config.get<string>('SHIPPING_MOCK_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException('Chưa cấu hình khóa xác thực cho hãng vận chuyển giả lập');
    return secret;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret()).update(payload).digest('hex');
  }

  private verify(payload: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(payload), 'hex');
    const given = Buffer.from(signature, 'hex');
    return given.length === expected.length && timingSafeEqual(given, expected);
  }
}
