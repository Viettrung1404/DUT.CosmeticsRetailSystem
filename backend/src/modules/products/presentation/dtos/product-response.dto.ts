import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductEntity, ProductVariantProps } from '../../domain/entities/product.entity';

/**
 * Response DTO cho Product — thuộc presentation layer.
 * Chứa Swagger decorators (@ApiProperty) vì đây là concern hiển thị API.
 * Mapping từ Domain Entity sang DTO được thực hiện qua static method fromDomain().
 */
export class ProductResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  categoryId: string;

  @ApiPropertyOptional({ example: 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  brandId?: string | null;

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

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  variants: ProductVariantProps[];

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;

  static fromDomain(entity: ProductEntity): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = entity.id!;
    dto.categoryId = entity.categoryId;
    dto.brandId = entity.brandId;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.sku = entity.sku;
    dto.description = entity.description;
    dto.shortDescription = entity.shortDescription;
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
    dto.variants = entity.variants;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
