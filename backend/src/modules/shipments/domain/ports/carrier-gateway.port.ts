export const CARRIER_GATEWAYS = Symbol('CARRIER_GATEWAYS');

export interface CarrierCreateRequest {
  shipmentCode: string;
  orderNumber: string;
  codAmount: number;
  shippingFee: number;
  weightGrams: number | null;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
}

export interface CarrierCreateResult {
  trackingCode: string;
  serviceCode?: string;
  labelUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CarrierEvent {
  eventId: string;
  trackingCode: string;
  status: string;
  occurredAt: Date;
}

export interface SignedWebhook {
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

export interface CarrierGateway {
  readonly carrierCode: string;
  createShipment(request: CarrierCreateRequest): Promise<CarrierCreateResult>;
  cancelShipment(trackingCode: string): Promise<void>;
  // Ném UnauthorizedException khi chữ ký sai; trả sự kiện đã quy về trạng thái vận đơn của hệ thống
  parseWebhook(body: Record<string, unknown>, headers: Record<string, string | undefined>): CarrierEvent;
  // Chỉ hãng giả cài: dựng webhook có chữ ký để demo
  buildSignedWebhook?(event: CarrierEvent): SignedWebhook;
}
