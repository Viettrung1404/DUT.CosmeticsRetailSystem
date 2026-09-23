import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export enum ProductSortBy {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NEWEST = 'newest',
  BESTSELLER = 'bestseller',
  RATING = 'rating',
}

export class ProductFilterDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Số trang' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Số lượng item mỗi trang' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Lọc theo ID danh mục' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID thương hiệu' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ description: 'Giá tối thiểu (VNĐ)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Giá tối đa (VNĐ)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Đánh giá tối thiểu (1 - 5 sao)' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ description: 'Lọc theo tag sản phẩm (cách nhau bởi dấu phẩy nếu nhiều)' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    enum: ProductSortBy,
    default: ProductSortBy.NEWEST,
    description: 'Sắp xếp kết quả',
  })
  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy = ProductSortBy.NEWEST;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}
