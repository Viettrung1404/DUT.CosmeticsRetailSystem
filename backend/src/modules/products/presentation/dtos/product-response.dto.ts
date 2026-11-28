import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductEntity } from '../../domain/entities/product.entity';

export class ProductVariantResponseDto {
  @ApiPropertyOptional({ description: 'Giá một đơn vị theo engine Sprint 5, chưa áp điều kiện giỏ/coupon/điểm' })
  effectivePrice?: number;
  @ApiPropertyOptional({ example: 'v1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id?: string;

  @ApiProperty({ example: 'BR-VELVET-TINT-A12' })
  sku: string;

  @ApiPropertyOptional({ example: '8809641190012' })
  barcode?: string | null;

  @ApiProperty({ example: 199000 })
  price: number;

  @ApiPropertyOptional({ example: 25.5 })
  weight?: number | null;

  @ApiPropertyOptional({ example: 'g' })
  unit?: string | null;

  @ApiPropertyOptional({ example: 50 })
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 'A12 Dashed Brown' })
  option1Value?: string | null;

  @ApiPropertyOptional({ example: '4.5g' })
  option2Value?: string | null;

  @ApiPropertyOptional()
  option3Value?: string | null;

  @ApiPropertyOptional({ example: true })
  isActive?: boolean;
}

export class ProductImageResponseDto {
  @ApiPropertyOptional({ example: 'img-uuid-1' })
  id?: string;

  @ApiProperty({ example: 'https://example.com/product-1.jpg' })
  imageUrl: string;

  @ApiPropertyOptional({ example: 'Ảnh chi tiết son' })
  altText?: string | null;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ example: true })
  isPrimary: boolean;

  @ApiPropertyOptional({ example: 'v1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  productVariantId?: string | null;
}

export class ProductIngredientResponseDto {
  @ApiPropertyOptional({ example: 'ing-uuid-1' })
  id?: string;

  @ApiProperty({ example: 'Dimethicone' })
  ingredientName: string;

  @ApiPropertyOptional({ example: '15%' })
  percentage?: string | null;

  @ApiPropertyOptional({ example: 'Khóa ẩm, làm mịn mờ rãnh môi và tạo hàng rào bảo vệ' })
  purpose?: string | null;

  @ApiProperty({ example: true })
  isKeyIngredient: boolean;
}

export class ProductResponseDto {
  @ApiPropertyOptional({ description: 'Giá thấp nhất của variant active, một đơn vị chưa áp điều kiện giỏ' })
  effectivePrice?: number | null;
  @ApiPropertyOptional()
  effectivePriceMax?: number | null;
  @ApiPropertyOptional({ description: 'Điều kiện campaign; campaign có minOrderAmount chỉ được xác nhận tại preview/checkout', type: 'array', items: { type: 'object' } })
  promotions?: object[];
  @ApiPropertyOptional({ enum: ['SINGLE_UNIT_WITHOUT_CART_CONDITIONS'] })
  priceBasis?: string;
  @ApiPropertyOptional({ example: false })
  reservation?: boolean;
  @ApiProperty({ default: false })
  isWishlisted?: boolean;
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  categoryId: string;

  @ApiPropertyOptional({ example: 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  brandId?: string | null;

  @ApiPropertyOptional({ example: 'Black Rouge' })
  brandName?: string | null;

  @ApiPropertyOptional({ example: 'Trang điểm môi' })
  categoryName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/primary.jpg' })
  primaryImage?: string | null;

  @ApiProperty({ example: 'Son kem lì Black Rouge Air Fit Velvet Tint' })
  name: string;

  @ApiProperty({ example: 'son-kem-li-black-rouge-air-fit-velvet-tint' })
  slug: string;

  @ApiProperty({ example: 'BR-VELVET-TINT' })
  sku: string;

  @ApiPropertyOptional({ example: 'Dòng son kem lì đình đám...' })
  description?: string | null;

  @ApiPropertyOptional()
  shortDescription?: string | null;

  @ApiPropertyOptional({ example: '1. Thoa đều từ lòng môi ra viền môi...' })
  howToUse?: string | null;

  @ApiPropertyOptional({ description: 'Thông số kỹ thuật sản phẩm: xuất xứ, nơi sản xuất, dung tích, hạn sử dụng, v.v.' })
  specifications?: Record<string, any> | null;

  @ApiProperty({ example: 199000 })
  basePrice: number;

  @ApiPropertyOptional({ example: 179000 })
  salePrice?: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: false })
  isFeatured: boolean;

  @ApiProperty({ example: 4.8 })
  avgRating: number;

  @ApiProperty({ example: 120 })
  totalReviews: number;

  @ApiProperty({ example: 500 })
  totalSold: number;

  @ApiPropertyOptional({ example: 'Màu sắc' })
  option1Name?: string | null;

  @ApiPropertyOptional({ example: 'Dung tích' })
  option2Name?: string | null;

  @ApiPropertyOptional()
  option3Name?: string | null;

  @ApiPropertyOptional({ example: 'https://video.hsv-tech.io/product-video.mp4' })
  videoUrl?: string | null;

  @ApiProperty({ type: [ProductVariantResponseDto] })
  variants: ProductVariantResponseDto[];

  @ApiPropertyOptional({ type: [ProductImageResponseDto] })
  images?: ProductImageResponseDto[];

  @ApiPropertyOptional({ type: [ProductIngredientResponseDto] })
  ingredients?: ProductIngredientResponseDto[];

  @ApiPropertyOptional({ type: [String], example: ['son lì', 'hot trend'] })
  tags?: string[];

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;

  static fromDomain(
    entity: ProductEntity,
    options: { onlyActiveVariants?: boolean } = { onlyActiveVariants: true },
  ): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = entity.id!;
    dto.categoryId = entity.categoryId;
    dto.brandId = entity.brandId;
    dto.brandName = entity.brandName;
    dto.categoryName = entity.categoryName;
    dto.primaryImage = entity.primaryImageUrl;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.sku = entity.sku;
    dto.description = entity.description;
    dto.shortDescription = entity.shortDescription;
    dto.howToUse = (entity as any).howToUse ?? null;
    dto.specifications = (entity as any).specifications ?? null;
    dto.basePrice = entity.basePrice;
    dto.salePrice = entity.salePrice;
    dto.isActive = entity.isActive;
    dto.isFeatured = entity.isFeatured;
    dto.avgRating = entity.avgRating;
    dto.totalReviews = entity.totalReviews;
    dto.totalSold = entity.totalSold;
    dto.option1Name = entity.option1Name;
    dto.option2Name = entity.option2Name;
    dto.option3Name = entity.option3Name;
    dto.videoUrl = entity.videoUrl ?? null;

    // Filter variants: if onlyActiveVariants is true (default for customer), filter out inactive variants
    const rawVariants = options.onlyActiveVariants
      ? (entity.variants || []).filter((v) => v.isActive !== false)
      : entity.variants || [];

    // Sanitize variants: remove costPrice to prevent sensitive data leak to clients
    dto.variants = rawVariants.map((v) => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode,
      price: v.price,
      weight: v.weight,
      unit: v.unit,
      stockQuantity: v.stockQuantity,
      option1Value: v.option1Value,
      option2Value: v.option2Value,
      option3Value: v.option3Value,
      isActive: v.isActive,
    }));

    dto.images = entity.images;
    dto.ingredients = entity.ingredients;
    dto.tags = entity.tags;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }

  static fromOpenSearch(doc: any): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = doc.id;
    dto.categoryId = doc.categoryId;
    dto.brandId = doc.brandId ?? null;
    dto.brandName = doc.brandName ?? null;
    dto.categoryName = doc.categoryName ?? '';
    dto.primaryImage = doc.primaryImage ?? null;
    dto.name = doc.name;
    dto.slug = doc.slug;
    dto.sku = doc.sku;
    dto.description = null;
    dto.shortDescription = null;
    dto.basePrice = Number(doc.basePrice);
    dto.salePrice = doc.salePrice != null ? Number(doc.salePrice) : null;
    dto.effectivePrice = Number(doc.salePrice ?? doc.basePrice ?? doc.minPrice);
    dto.isActive = doc.isActive ?? true;
    dto.isFeatured = false;
    dto.avgRating = doc.avgRating ?? 0;
    dto.totalReviews = doc.totalReviews != null ? Number(doc.totalReviews) : 0;
    dto.totalSold = doc.totalSold ?? 0;
    dto.option1Name = null;
    dto.option2Name = null;
    dto.option3Name = null;
    dto.videoUrl = null;
    dto.variants = [];
    dto.images = doc.primaryImage
      ? [{ imageUrl: doc.primaryImage, sortOrder: 0, isPrimary: true }]
      : [];
    dto.ingredients = [];
    dto.tags = doc.tags || [];
    dto.createdAt = doc.createdAt ? new Date(doc.createdAt) : undefined;
    dto.updatedAt = undefined;
    return dto;
  }
}
