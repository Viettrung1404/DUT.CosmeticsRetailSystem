import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductVariantEntity } from '../../domain/entities/product-variant.entity';

export class ProductVariantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty({ example: 'BR-VELVET-A01' })
  sku: string;

  @ApiPropertyOptional()
  barcode?: string | null;

  @ApiPropertyOptional({ example: 'A01 Đỏ gạch' })
  option1Value?: string | null;

  @ApiPropertyOptional()
  option2Value?: string | null;

  @ApiPropertyOptional()
  option3Value?: string | null;

  @ApiProperty({ example: 179000 })
  price: number;

  @ApiProperty({ example: 95000 })
  costPrice: number;

  @ApiPropertyOptional()
  weight?: number | null;

  @ApiPropertyOptional()
  unit?: string | null;

  @ApiProperty({ example: 0, description: 'Chỉ đọc — tồn kho cập nhật qua module Inventory' })
  stockQuantity: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;

  static fromDomain(entity: ProductVariantEntity): ProductVariantResponseDto {
    const dto = new ProductVariantResponseDto();
    dto.id = entity.id!;
    dto.productId = entity.productId;
    dto.sku = entity.sku;
    dto.barcode = entity.barcode;
    dto.option1Value = entity.option1Value;
    dto.option2Value = entity.option2Value;
    dto.option3Value = entity.option3Value;
    dto.price = entity.price;
    dto.costPrice = entity.costPrice;
    dto.weight = entity.weight;
    dto.unit = entity.unit;
    dto.stockQuantity = entity.stockQuantity;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
