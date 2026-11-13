export const SHIPMENT_REPOSITORY = Symbol('IShipmentRepository');

export interface ShipmentAccessInfo {
  id: string;
  orderId: string;
  storeId: string;
  carrierCode: string;
  trackingCode: string | null;
  status: string;
}

export interface OrderForShipment {
  id: string;
  orderNumber: string;
  storeId: string;
  orderType: string;
  status: string;
  shippingFee: number;
  totalAmount: number;
  totalWeightGrams: number | null;
  shippingAddress: {
    recipientName?: string;
    phone?: string;
    addressLine?: string;
    ward?: string;
    district?: string;
    city?: string;
  } | null;
  completedPaid: number;
  exchangeCredit: number;
  hasActiveShipment: boolean;
}

export interface ShipmentEventRecord {
  id: string;
  status: string;
  occurredAt: Date;
  receivedAt: Date;
}

export interface ShipmentListItem {
  id: string;
  shipmentCode: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  carrierCode: string;
  trackingCode: string | null;
  status: string;
  codAmount: number;
  shippingFeePaid: number;
  failedAttempts: number;
  handedOverAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

export interface ShipmentDetail extends ShipmentListItem {
  carrierServiceCode: string | null;
  shippingLabelUrl: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  orderStatus: string;
  events: ShipmentEventRecord[];
}

export interface ShipmentListQuery {
  page: number;
  limit: number;
  storeIds?: string[];
  status?: string;
  carrierCode?: string;
  orderId?: string;
  search?: string;
  from?: Date;
  to?: Date;
}

export interface CreateShipmentRecord {
  orderId: string;
  shipmentCode: string;
  carrierCode: string;
  trackingCode: string;
  serviceCode?: string;
  labelUrl?: string;
  metadata?: Record<string, unknown>;
  codAmount: number;
  shippingFee: number;
  createdBy: string;
}

export interface ApplyCarrierEventInput {
  carrierCode: string;
  eventId: string;
  trackingCode: string;
  status: string;
  occurredAt: Date;
}

export interface ApplyCarrierEventResult {
  shipmentId: string;
  orderId: string;
  status: string;
  duplicate: boolean;
  orderStatus: string;
}

export interface ReceiveReturnedShipmentInput {
  shipmentId: string;
  actorId: string;
  damaged: { productVariantId: string; quantity: number }[];
  note?: string;
}

export interface ReceiveReturnedShipmentResult {
  restocked: { productVariantId: string; batchId: string | null; quantity: number }[];
  // Hỏng khi vận chuyển, hoặc lô đã hết hạn / ngừng dùng thì không nhập lại được
  notRestocked: { productVariantId: string; batchId: string | null; quantity: number; reason: string }[];
  refundAmount: number;
  couponReleased: boolean;
  pointsRefunded: number;
}

export interface IShipmentRepository {
  findAccessInfo(shipmentId: string): Promise<ShipmentAccessInfo | null>;
  findOrderForShipment(orderId: string): Promise<OrderForShipment | null>;
  findDetail(shipmentId: string): Promise<ShipmentDetail | null>;
  findMany(query: ShipmentListQuery): Promise<{ items: ShipmentListItem[]; total: number }>;
  create(record: CreateShipmentRecord): Promise<string>;
  cancel(shipmentId: string, actorId: string): Promise<void>;
  applyCarrierEvent(input: ApplyCarrierEventInput): Promise<ApplyCarrierEventResult>;
  receiveReturned(input: ReceiveReturnedShipmentInput): Promise<ReceiveReturnedShipmentResult>;
}
