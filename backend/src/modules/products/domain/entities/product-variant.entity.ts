export interface ProductVariantEntityProps {
  id?: string;
  productId: string;
  sku: string;
  barcode?: string | null;
  option1Value?: string | null;
  option2Value?: string | null;
  option3Value?: string | null;
  price: number;
  costPrice: number;
  weight?: number | null;
  unit?: string | null;
  stockQuantity?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductVariantChanges = Partial<
  Omit<ProductVariantEntityProps, 'id' | 'productId' | 'stockQuantity' | 'createdAt' | 'updatedAt'>
>;

export class ProductVariantEntity {
  private props: ProductVariantEntityProps;

  constructor(props: ProductVariantEntityProps) {
    this.props = { ...props, stockQuantity: props.stockQuantity ?? 0, isActive: props.isActive ?? true };
  }

  get id(): string | undefined { return this.props.id; }
  get productId(): string { return this.props.productId; }
  get sku(): string { return this.props.sku; }
  get barcode(): string | null | undefined { return this.props.barcode; }
  get option1Value(): string | null | undefined { return this.props.option1Value; }
  get option2Value(): string | null | undefined { return this.props.option2Value; }
  get option3Value(): string | null | undefined { return this.props.option3Value; }
  get price(): number { return this.props.price; }
  get costPrice(): number { return this.props.costPrice; }
  get weight(): number | null | undefined { return this.props.weight; }
  get unit(): string | null | undefined { return this.props.unit; }
  get stockQuantity(): number { return this.props.stockQuantity!; }
  get isActive(): boolean { return this.props.isActive!; }
  get createdAt(): Date | undefined { return this.props.createdAt; }
  get updatedAt(): Date | undefined { return this.props.updatedAt; }

  update(changes: ProductVariantChanges): void {
    const { sku, price, costPrice, isActive, ...nullableFields } = changes;
    this.props = {
      ...this.props,
      ...nullableFields,
      sku: sku ?? this.props.sku,
      price: price ?? this.props.price,
      costPrice: costPrice ?? this.props.costPrice,
      isActive: isActive ?? this.props.isActive,
    };
  }

  deactivate(): void {
    this.props.isActive = false;
  }
}
