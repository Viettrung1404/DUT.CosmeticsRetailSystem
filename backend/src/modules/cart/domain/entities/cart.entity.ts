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

  /**
   * Tính tổng tiền các sản phẩm được chọn để thanh toán (Partial Checkout)
   */
  public getSelectedSubtotal(): number {
    return this.items
      .filter((item) => item.isSelected)
      .reduce((total, item) => total + item.getTotalPrice(), 0);
  }

  /**
   * Tính tổng số lượng các sản phẩm được chọn để thanh toán
   */
  public getSelectedQuantity(): number {
    return this.items
      .filter((item) => item.isSelected)
      .reduce((total, item) => total + item.quantity, 0);
  }

  public findItemById(cartItemId: string): CartItemEntity | undefined {
    return this.items.find((i) => i.id === cartItemId);
  }

  public findItemByVariantId(productVariantId: string): CartItemEntity | undefined {
    return this.items.find((i) => i.productVariantId === productVariantId);
  }

  /**
   * Thêm sản phẩm vào giỏ hàng hoặc tăng số lượng nếu đã tồn tại
   */
  public addItem(item: CartItemEntity, maxStock?: number): CartItemEntity {
    const existing = this.findItemByVariantId(item.productVariantId);
    if (existing) {
      const newQty = existing.quantity + item.quantity;
      existing.updateQuantity(newQty, maxStock);
      return existing;
    } else {
      if (maxStock !== undefined && item.quantity > maxStock) {
        throw new Error(`Số lượng yêu cầu (${item.quantity}) vượt quá tồn kho khả dụng (${maxStock})`);
      }
      if (item.quantity > 99) {
        throw new Error('Số lượng cho mỗi sản phẩm tối đa là 99');
      }
      this.items.push(item);
      return item;
    }
  }

  /**
   * Cập nhật số lượng sản phẩm trong giỏ hàng
   */
  public updateItemQuantity(cartItemId: string, newQty: number, maxStock?: number): CartItemEntity {
    const item = this.findItemById(cartItemId);
    if (!item) {
      throw new Error('Sản phẩm không tồn tại trong giỏ hàng');
    }
    item.updateQuantity(newQty, maxStock);
    return item;
  }

  /**
   * Chọn / Bỏ chọn sản phẩm trong giỏ hàng (Partial Checkout)
   */
  public toggleItemSelection(cartItemId: string, selected?: boolean): CartItemEntity {
    const item = this.findItemById(cartItemId);
    if (!item) {
      throw new Error('Sản phẩm không tồn tại trong giỏ hàng');
    }
    item.toggleSelected(selected);
    return item;
  }

  /**
   * Xóa sản phẩm khỏi giỏ hàng
   */
  public removeItem(cartItemId: string): void {
    this.items = this.items.filter((i) => i.id !== cartItemId);
  }
}
