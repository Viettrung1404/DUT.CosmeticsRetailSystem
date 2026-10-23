export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface OrderCustomerSummary {
  id: string
  fullName: string | null
  phone: string | null
  email: string | null
}

export interface OrderStoreSummary {
  id: string
  name: string
  code: string
}

export interface AdminOrderListItem {
  id: string
  orderNumber: string
  orderType: 'ONLINE' | 'POS' | string
  status: OrderStatus | string
  totalAmount: number
  itemCount: number
  paymentMethod: string | null
  paymentStatus: string | null
  customer: OrderCustomerSummary | null
  store: OrderStoreSummary
  createdAt: string
}

export interface AdminOrderItem {
  id: string
  productVariantId: string
  sku: string
  productName: string
  variantName: string
  imageUrl: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  totalPrice: number
}

export interface AdminOrderPayment {
  id: string
  paymentMethod: string
  amount: number
  status: string
  transactionId: string | null
  paidAt: string | null
  createdAt: string
}

export interface AdminOrderRefund {
  id: string
  paymentId: string | null
  amount: number
  reason: string
  status: string
  processedAt: string | null
  createdAt: string
}

export interface AdminOrderShipment {
  id: string
  shipmentCode: string
  carrierCode: string
  trackingCode: string | null
  status: string
  createdAt: string
}

export interface AdminOrderStatusHistory {
  id: string
  status: string
  note: string | null
  changedBy: { id: string; fullName: string } | null
  createdAt: string
}

export interface AdminOrderDetail {
  id: string
  orderNumber: string
  orderType: string
  status: OrderStatus | string
  subtotal: number
  discountAmount: number
  shippingFee: number
  taxAmount: number
  totalAmount: number
  loyaltyPointsUsed: number
  shippingAddress: Record<string, unknown> | null
  note: string | null
  couponCode: string | null
  salesStaff: { id: string; employeeCode: string; fullName: string } | null
  customer: OrderCustomerSummary | null
  store: OrderStoreSummary
  items: AdminOrderItem[]
  payments: AdminOrderPayment[]
  refunds: AdminOrderRefund[]
  shipments: AdminOrderShipment[]
  statusHistory: AdminOrderStatusHistory[]
  actions: {
    canConfirm: boolean
    nextStatuses: OrderStatus[]
    canCancel: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface AdminOrderQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  orderType?: string
  storeId?: string
  customerId?: string
  fromDate?: string
  toDate?: string
  sortBy?: 'createdAt' | 'totalAmount'
  order?: 'ASC' | 'DESC'
}

export interface PageMeta {
  page?: number
  limit?: number
  itemCount?: number
  pageCount?: number
  hasPreviousPage?: boolean
  hasNextPage?: boolean
  [key: string]: unknown
}

export interface PageResult<T> {
  data: T[]
  meta: PageMeta
}

export interface AdminCustomerListItem {
  id: string
  fullName: string | null
  phone: string | null
  email: string | null
  hasAccount: boolean
  loyaltyTier: { id: string; name: string } | null
  totalPoints: number
  totalSpent: number
  totalOrders: number
  createdAt: string
}

export interface AdminCustomerQuery {
  page?: number
  limit?: number
  search?: string
  loyaltyTierId?: string
  storeId?: string
  sortBy?: 'createdAt' | 'totalSpent' | 'totalPoints'
  order?: 'ASC' | 'DESC'
}
