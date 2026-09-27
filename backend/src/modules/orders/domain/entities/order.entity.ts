import { OrderItemEntity } from './order-item.entity';
import { OrderStatus } from '../../../../core/domain/orders/order-status.enum';

export interface ShippingAddressVo {
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  city: string;
}

export class OrderEntity {
  id: string;
  orderNumber: string;
  customerId: string | null;
  storeId: string;
  orderType: string; // 'ONLINE' | 'STORE_PICKUP' | 'POS'
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  shippingAddress: ShippingAddressVo | null;
  billingAddress: any | null;
  note: string | null;
  couponId: string | null;
  loyaltyPointsUsed: number;
  salesStaffId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemEntity[];
  payments?: any[];

  constructor(partial: Partial<OrderEntity>) {
    Object.assign(this, partial);
  }
}
