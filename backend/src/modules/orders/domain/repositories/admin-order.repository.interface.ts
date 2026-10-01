export const ADMIN_ORDER_REPOSITORY = Symbol('IAdminOrderRepository');

export interface AdminOrderScopeFilter {
  storeIds?: string[];
  salesStaffId?: string;
}

export type AdminOrderSortField = 'createdAt' | 'totalAmount';

export interface AdminOrderListQuery {
  scope: AdminOrderScopeFilter;
  page: number;
  limit: number;
  sortBy: AdminOrderSortField;
  order: 'asc' | 'desc';
  status?: string;
  orderType?: string;
  storeId?: string;
  customerId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

export interface OrderCustomerSummary {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
}

export interface OrderStoreSummary {
  id: string;
  name: string;
  code: string;
}

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  customer: OrderCustomerSummary | null;
  store: OrderStoreSummary;
  createdAt: Date;
}

export interface OrderAccessInfo {
  id: string;
  status: string;
  storeId: string;
  salesStaffId: string | null;
}

export interface AdminOrderItemDetail {
  id: string;
  productVariantId: string;
  sku: string;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
}

export interface AdminOrderPayment {
  id: string;
  paymentMethod: string;
  amount: number;
  status: string;
  transactionId: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface AdminOrderRefund {
  id: string;
  paymentId: string | null;
  amount: number;
  reason: string;
  status: string;
  processedAt: Date | null;
  createdAt: Date;
}

export interface AdminOrderShipment {
  id: string;
  shipmentCode: string;
  carrierCode: string;
  trackingCode: string | null;
  status: string;
  createdAt: Date;
}

export interface AdminOrderStatusHistory {
  id: string;
  status: string;
  note: string | null;
  changedBy: { id: string; fullName: string } | null;
  createdAt: Date;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  loyaltyPointsUsed: number;
  shippingAddress: Record<string, unknown> | null;
  note: string | null;
  couponCode: string | null;
  salesStaff: { id: string; employeeCode: string; fullName: string } | null;
  customer: OrderCustomerSummary | null;
  store: OrderStoreSummary;
  items: AdminOrderItemDetail[];
  payments: AdminOrderPayment[];
  refunds: AdminOrderRefund[];
  shipments: AdminOrderShipment[];
  statusHistory: AdminOrderStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfirmOrderInput {
  orderId: string;
  changedBy: string;
  note?: string;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  target: string;
  changedBy: string;
  note?: string;
}

export interface OrderStatusChangeResult {
  stockDeducted: boolean;
  codPaymentsCompleted: number;
  loyalty: { configured: boolean; pointsEarned: number; newTierName: string | null } | null;
  commissionAmount: number | null;
}

export interface IAdminOrderRepository {
  updateStatus(input: UpdateOrderStatusInput): Promise<OrderStatusChangeResult>;
  findMany(query: AdminOrderListQuery): Promise<{ items: AdminOrderListItem[]; total: number }>;
  findAccessInfo(orderId: string): Promise<OrderAccessInfo | null>;
  findDetail(orderId: string): Promise<AdminOrderDetail | null>;
  confirm(input: ConfirmOrderInput): Promise<void>;
}
