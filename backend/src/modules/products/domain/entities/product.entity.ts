export interface ProductVariantProps {
  id?: string;
  sku: string;
  barcode?: string | null;
  price: number;
  costPrice: number;
  weight?: number | null;
  unit?: string | null;
  stockQuantity?: number;
  option1Value?: string | null;
  option2Value?: string | null;
  option3Value?: string | null;
  isActive?: boolean;
}

export interface ProductImageProps {
  id?: string;
  imageUrl: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  productVariantId?: string | null;
}

export interface ProductIngredientProps {
  id?: string;
  ingredientName: string;
  percentage?: string | null;
  isKeyIngredient: boolean;
}

export interface ProductProps {
  id?: string;
  categoryId: string;
  brandId?: string | null;
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  shortDescription?: string | null;
  basePrice: number;
  salePrice?: number | null;
  option1Name?: string | null;
  option2Name?: string | null;
  option3Name?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  avgRating?: number;
  totalReviews?: number;
  totalSold?: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  variants?: ProductVariantProps[];
  images?: ProductImageProps[];
  ingredients?: ProductIngredientProps[];
  tags?: string[];
  brandName?: string | null;
  categoryName?: string;
  categorySlug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductChanges = Partial<
  Pick<
    ProductProps,
    | 'categoryId'
    | 'brandId'
    | 'name'
    | 'slug'
    | 'sku'
    | 'description'
    | 'shortDescription'
    | 'basePrice'
    | 'salePrice'
    | 'option1Name'
    | 'option2Name'
    | 'option3Name'
    | 'isActive'
    | 'isFeatured'
    | 'metaTitle'
    | 'metaDescription'
    | 'metaKeywords'
  >
>;

export interface VariantOptionValues {
  option1Value?: string | null;
  option2Value?: string | null;
  option3Value?: string | null;
}

/**
 * Pure Domain Entity - encapsulates business invariants of Product.
 * Completely framework-agnostic (independent of NestJS, Prisma, etc.).
 */
export class ProductEntity {
  private _id?: string;
  private _categoryId: string;
  private _brandId?: string | null;
  private _name: string;
  private _slug: string;
  private _sku: string;
  private _description?: string | null;
  private _shortDescription?: string | null;
  private _basePrice: number;
  private _salePrice?: number | null;
  private _option1Name?: string | null;
  private _option2Name?: string | null;
  private _option3Name?: string | null;
  private _isActive: boolean;
  private _isFeatured: boolean;
  private _avgRating: number;
  private _totalReviews: number;
  private _totalSold: number;
  private _metaTitle?: string | null;
  private _metaDescription?: string | null;
  private _metaKeywords?: string | null;
  private _variants: ProductVariantProps[];
  private _images: ProductImageProps[];
  private _ingredients: ProductIngredientProps[];
  private _tags: string[];
  private _brandName?: string | null;
  private _categoryName?: string;
  private _categorySlug?: string;
  private _createdAt?: Date;
  private _updatedAt?: Date;

  constructor(props: ProductProps) {
    this._id = props.id;
    this._categoryId = props.categoryId;
    this._brandId = props.brandId;
    this._name = props.name;
    this._slug = props.slug;
    this._sku = props.sku;
    this._description = props.description;
    this._shortDescription = props.shortDescription;
    this._basePrice = props.basePrice;
    this._salePrice = props.salePrice;
    this._option1Name = props.option1Name;
    this._option2Name = props.option2Name;
    this._option3Name = props.option3Name;
    this._isActive = props.isActive ?? true;
    this._isFeatured = props.isFeatured ?? false;
    this._avgRating = props.avgRating ?? 0;
    this._totalReviews = props.totalReviews ?? 0;
    this._totalSold = props.totalSold ?? 0;
    this._metaTitle = props.metaTitle;
    this._metaDescription = props.metaDescription;
    this._metaKeywords = props.metaKeywords;
    this._variants = props.variants ?? [];
    this._images = props.images ?? [];
    this._ingredients = props.ingredients ?? [];
    this._tags = props.tags ?? [];
    this._brandName = props.brandName;
    this._categoryName = props.categoryName;
    this._categorySlug = props.categorySlug;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters
  get id(): string | undefined { return this._id; }
  get categoryId(): string { return this._categoryId; }
  get brandId(): string | null | undefined { return this._brandId; }
  get name(): string { return this._name; }
  get slug(): string { return this._slug; }
  get sku(): string { return this._sku; }
  get description(): string | null | undefined { return this._description; }
  get shortDescription(): string | null | undefined { return this._shortDescription; }
  get basePrice(): number { return this._basePrice; }
  get salePrice(): number | null | undefined { return this._salePrice; }
  get option1Name(): string | null | undefined { return this._option1Name; }
  get option2Name(): string | null | undefined { return this._option2Name; }
  get option3Name(): string | null | undefined { return this._option3Name; }
  get isActive(): boolean { return this._isActive; }
  get isFeatured(): boolean { return this._isFeatured; }
  get avgRating(): number { return this._avgRating; }
  get totalReviews(): number { return this._totalReviews; }
  get totalSold(): number { return this._totalSold; }
  get metaTitle(): string | null | undefined { return this._metaTitle; }
  get metaDescription(): string | null | undefined { return this._metaDescription; }
  get metaKeywords(): string | null | undefined { return this._metaKeywords; }
  get variants(): ProductVariantProps[] { return this._variants; }
  get images(): ProductImageProps[] { return this._images; }
  get ingredients(): ProductIngredientProps[] { return this._ingredients; }
  get tags(): string[] { return this._tags; }
  get brandName(): string | null | undefined { return this._brandName; }
  get categoryName(): string | undefined { return this._categoryName; }
  get categorySlug(): string | undefined { return this._categorySlug; }
  get createdAt(): Date | undefined { return this._createdAt; }
  get updatedAt(): Date | undefined { return this._updatedAt; }

  get primaryImageUrl(): string | null {
    const primary = this._images.find((img) => img.isPrimary);
    if (primary) return primary.imageUrl;
    return this._images.length > 0 ? this._images[0].imageUrl : null;
  }

  // Domain Business Rules
  public activate(): void {
    this._isActive = true;
  }

  public deactivate(): void {
    this._isActive = false;
  }

  public updateBasicInfo(name: string, description?: string | null): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Tên sản phẩm không được để trống');
    }
    this._name = name.trim();
    this._description = description;
  }

  public update(changes: ProductChanges): void {
    if (changes.name != null) this.updateBasicInfo(changes.name, this._description);
    if (changes.categoryId != null) this._categoryId = changes.categoryId;
    if (changes.slug != null) this._slug = changes.slug;
    if (changes.sku != null) this._sku = changes.sku;
    if (changes.basePrice != null) this._basePrice = changes.basePrice;
    if (changes.isActive != null) this._isActive = changes.isActive;
    if (changes.isFeatured != null) this._isFeatured = changes.isFeatured;
    if (changes.brandId !== undefined) this._brandId = changes.brandId;
    if (changes.description !== undefined) this._description = changes.description;
    if (changes.shortDescription !== undefined) this._shortDescription = changes.shortDescription;
    if (changes.salePrice !== undefined) this._salePrice = changes.salePrice;
    if (changes.option1Name !== undefined) this._option1Name = changes.option1Name;
    if (changes.option2Name !== undefined) this._option2Name = changes.option2Name;
    if (changes.option3Name !== undefined) this._option3Name = changes.option3Name;
    if (changes.metaTitle !== undefined) this._metaTitle = changes.metaTitle;
    if (changes.metaDescription !== undefined) this._metaDescription = changes.metaDescription;
    if (changes.metaKeywords !== undefined) this._metaKeywords = changes.metaKeywords;
  }

  public hasValidSalePrice(): boolean {
    return this._salePrice == null || this._salePrice <= this._basePrice;
  }

  // Biến thể chỉ được có giá trị ở đúng những thuộc tính mà sản phẩm đã khai báo tên
  public getVariantOptionError(values: VariantOptionValues): string | null {
    const names = [this._option1Name, this._option2Name, this._option3Name];
    const vals = [values.option1Value, values.option2Value, values.option3Value];
    for (let i = 0; i < 3; i++) {
      if (!names[i] && vals[i]) {
        return `Sản phẩm chưa khai báo thuộc tính ${i + 1}, biến thể không được có giá trị thuộc tính ${i + 1}`;
      }
      if (names[i] && !vals[i]) {
        return `Biến thể phải có giá trị cho thuộc tính "${names[i]}"`;
      }
    }
    return null;
  }
}

export const variantOptionKey = (values: VariantOptionValues): string =>
  [values.option1Value ?? '', values.option2Value ?? '', values.option3Value ?? ''].join('|');
