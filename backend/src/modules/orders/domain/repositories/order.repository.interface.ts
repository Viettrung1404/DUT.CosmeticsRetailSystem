import { OrderEntity, ShippingAddressVo } from '../entities/order.entity';

export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';

export interface CreateOrderItemInput {
  productVariantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount: number;
  totalPrice: number;
}

export interface CreateOrderTransactionInput {
  orderNumber: string;
  customerId: string;
  storeId: string;
  orderType: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  shippingAddress: ShippingAddressVo;
  note?: string | null;
  couponId?: string | null;
  loyaltyPointsUsed: number;
  paymentMethod: string;
  items: CreateOrderItemInput[];
}

export interface IOrderRepository {
  createOrderWithTransaction(
    data: CreateOrderTransactionInput,
  ): Promise<OrderEntity>;

  findById(id: string): Promise<OrderEntity | null>;

  findByOrderNumber(orderNumber: string): Promise<OrderEntity | null>;

  findCustomerOrders(
    customerId: string,
    options: { page: number; limit: number; status?: string },
  ): Promise<{ orders: OrderEntity[]; total: number }>;

  cancelOrderWithTransaction(
    orderId: string,
    customerId?: string,
    reason?: string,
  ): Promise<OrderEntity>;

  cancelExpiredPendingOrders(cutoffDate: Date): Promise<number>;

  getNextOrderSequence(date: Date): Promise<number>;

  getCustomerCouponUsageCount(
    customerId: string,
    couponId: string,
  ): Promise<number>;

  findCouponByCode(code: string): Promise<any | null>;

  getCustomerPoints(customerId: string): Promise<number>;
}
