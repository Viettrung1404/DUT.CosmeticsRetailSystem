export interface CartItemProps {
  id: string;
  cartId: string;
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  currentPrice?: number;
  isSelected?: boolean;
  productName?: string;
  variantName?: string;
  sku?: string;
  thumbnailUrl?: string;
  availableStock?: number;
  isVariantActive?: boolean;
  createdAt?: Date;
}

export class CartItemEntity {
  public id: string;
  public cartId: string;
  public productVariantId: string;
  public quantity: number;
  public unitPrice: number;
  public currentPrice: number;
  public isSelected: boolean;
  public productName?: string;
  public variantName?: string;
  public sku?: string;
  public thumbnailUrl?: string;
  public availableStock?: number;
  public isVariantActive: boolean;
  public createdAt: Date;

  constructor(props: CartItemProps) {
    this.id = props.id;
    this.cartId = props.cartId;
    this.productVariantId = props.productVariantId;
    this.quantity = props.quantity;
    this.unitPrice = Number(props.unitPrice);
    this.currentPrice = props.currentPrice !== undefined ? Number(props.currentPrice) : this.unitPrice;
    this.isSelected = props.isSelected ?? true;
    this.productName = props.productName;
    this.variantName = props.variantName;
    this.sku = props.sku;
    this.thumbnailUrl = props.thumbnailUrl;
    this.availableStock = props.availableStock;
    this.isVariantActive = props.isVariantActive ?? true;
    this.createdAt = props.createdAt || new Date();
  }

  public getTotalPrice(): number {
    return this.currentPrice * this.quantity;
  }

  public get priceChanged(): boolean {
    return this.unitPrice !== this.currentPrice;
  }

  public get isQuantityExceeded(): boolean {
    if (this.availableStock === undefined) return false;
    return this.quantity > this.availableStock;
  }

  public toggleSelected(selected?: boolean): void {
    this.isSelected = selected !== undefined ? selected : !this.isSelected;
  }

  public updateQuantity(newQty: number, maxStock?: number): void {
    if (newQty <= 0) {
      throw new Error('Số lượng phải lớn hơn 0');
    }
    if (newQty > 99) {
      throw new Error('Số lượng cho mỗi sản phẩm tối đa là 99');
    }
    if (maxStock !== undefined && newQty > maxStock) {
      throw new Error(`Số lượng yêu cầu (${newQty}) vượt quá tồn kho khả dụng (${maxStock})`);
    }
    this.quantity = newQty;
  }
}
