/**
 * DTOs cho Hệ thống tích hợp Giao vận (Shipping Provider Abstraction)
 * Tuân thủ chuẩn quốc tế:
 * - Trọng lượng: grams (g)
 * - Kích thước: cm (chiều dài, rộng, cao)
 * - Tiền tệ: VND
 */

export type ShipmentType = 'OUTBOUND' | 'RETURN_PICKUP' | 'INTER_STORE_TRANSFER';

export interface ShippingAddressDto {
  addressLine: string;
  ward?: string;
  district: string;
  province: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface ShippingContactDto extends ShippingAddressDto {
  name: string;
  phone: string;
  email?: string;
}

export interface ParcelDimensionsDto {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ShipmentItemDto {
  productVariantId?: string;
  sku?: string;
  name: string;
  quantity: number;
  weightGrams: number;
  priceVnd?: number;
}

export interface QuoteRequestDto {
  carrierCode?: string;
  serviceCode?: string;
  senderAddress: ShippingAddressDto;
  recipientAddress: ShippingAddressDto;
  parcel: ParcelDimensionsDto;
  codAmountVnd?: number;
  insuranceValueVnd?: number;
}

export interface QuoteResponseDto {
  carrierCode: string;
  serviceCode: string;
  feeAmountVnd: number;
  estimatedDeliveryDays?: number;
  estimatedDeliveryAt?: Date;
}

export interface CreateShipmentDto {
  shipmentCode: string;
  clientOrderCode?: string;
  orderNumber?: string;
  shipmentType: ShipmentType;
  carrierCode?: string;
  serviceCode?: string;
  sender: ShippingContactDto;
  recipient: ShippingContactDto;
  parcel: ParcelDimensionsDto;
  items: ShipmentItemDto[];
  codAmountVnd: number;
  insuranceValueVnd?: number;
  note?: string;
  requiresInspection?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ShipmentResultDto {
  trackingCode: string;
  carrierReferenceId?: string;
  carrierServiceCode?: string;
  shippingLabelUrl?: string;
  trackingUrl?: string;
  estimatedDeliveryAt?: Date;
  actualFeeVnd?: number;
  rawResponse?: Record<string, unknown>;
}

export interface ParsedWebhookDto {
  carrierCode: string;
  eventId: string;
  eventType?: string;
  trackingCode: string;
  status: string;
  reasonCode?: string;
  reasonDetail?: string;
  occurredAt: Date;
  rawPayload: Record<string, unknown>;
}
