import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';

export enum ProductSortBy {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NEWEST = 'newest',
  BESTSELLER = 'bestseller',
  RATING = 'rating',
}

export class ProductFilterDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Nhiều danh mục UUID, phân tách bằng dấu phẩy', type: String })
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.split(',').filter(Boolean) : value)
  @IsArray() @ArrayMaxSize(20) @IsUUID(undefined, { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Lọc theo ID danh mục (UUID)' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID thương hiệu (UUID)' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ description: 'Nhiều thương hiệu UUID, phân tách bằng dấu phẩy', type: String })
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.split(',').filter(Boolean) : value)
  @IsArray() @ArrayMaxSize(20) @IsUUID(undefined, { each: true })
  brandIds?: string[];

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

  @ApiPropertyOptional({ description: 'Lọc theo tag sản phẩm' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Nhiều tag tình trạng da, phân tách bằng dấu phẩy', type: String })
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.split(',').map((item: string) => item.trim()).filter(Boolean) : value)
  @IsArray() @ArrayMaxSize(10) @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    enum: ProductSortBy,
    default: ProductSortBy.NEWEST,
    description: 'Sắp xếp kết quả',
  })
  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy = ProductSortBy.NEWEST;
}

