import { CartItemEntity } from './cart-item.entity';

export interface CartProps {
  id: string;
  customerId?: string | null;
  sessionId?: string | null;
  storeId?: string | null;
  items?: CartItemEntity[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class CartEntity {
  public id: string;
  public customerId: string | null;
  public sessionId: string | null;
  public storeId: string | null;
  public items: CartItemEntity[];
  public createdAt: Date;
  public updatedAt: Date;

  constructor(props: CartProps) {
    this.id = props.id;
    this.customerId = props.customerId || null;
    this.sessionId = props.sessionId || null;
    this.storeId = props.storeId || null;
    this.items = props.items || [];
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  public getSubtotal(): number {
    return this.items.reduce((total, item) => total + item.getTotalPrice(), 0);
  }

  public getTotalQuantity(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  public addItem(item: CartItemEntity, maxStock?: number): void {
    const existing = this.items.find((i) => i.productVariantId === item.productVariantId);
    if (existing) {
      const newQty = existing.quantity + item.quantity;
      existing.updateQuantity(newQty, maxStock);
    } else {
      if (maxStock !== undefined && item.quantity > maxStock) {
        throw new Error('Số lượng vượt quá tồn kho khả dụng');
      }
      this.items.push(item);
    }
  }

  public removeItem(cartItemId: string): void {
    this.items = this.items.filter((i) => i.id !== cartItemId);
  }
}
