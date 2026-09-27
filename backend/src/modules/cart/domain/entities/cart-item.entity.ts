export interface CartItemProps {
  id: string;
  cartId: string;
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  productName?: string;
  variantName?: string;
  sku?: string;
  thumbnailUrl?: string;
  availableStock?: number;
  createdAt?: Date;
}

export class CartItemEntity {
  public id: string;
  public cartId: string;
  public productVariantId: string;
  public quantity: number;
  public unitPrice: number;
  public productName?: string;
  public variantName?: string;
  public sku?: string;
  public thumbnailUrl?: string;
  public availableStock?: number;
  public createdAt: Date;

  constructor(props: CartItemProps) {
    this.id = props.id;
    this.cartId = props.cartId;
    this.productVariantId = props.productVariantId;
    this.quantity = props.quantity;
    this.unitPrice = Number(props.unitPrice);
    this.productName = props.productName;
    this.variantName = props.variantName;
    this.sku = props.sku;
    this.thumbnailUrl = props.thumbnailUrl;
    this.availableStock = props.availableStock;
    this.createdAt = props.createdAt || new Date();
  }

  public getTotalPrice(): number {
    return this.unitPrice * this.quantity;
  }

  public updateQuantity(newQty: number, maxStock?: number): void {
    if (newQty <= 0) {
      throw new Error('Số lượng phải lớn hơn 0');
    }
    if (maxStock !== undefined && newQty > maxStock) {
      throw new Error('Số lượng vượt quá tồn kho khả dụng');
    }
    this.quantity = newQty;
  }
}
