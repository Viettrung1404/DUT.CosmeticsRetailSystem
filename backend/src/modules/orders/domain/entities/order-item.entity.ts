export class OrderItemEntity {
  id: string;
  orderId: string;
  productVariantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount: number;
  totalPrice: number;
  createdAt?: Date;

  constructor(partial: Partial<OrderItemEntity>) {
    Object.assign(this, partial);
  }
}
