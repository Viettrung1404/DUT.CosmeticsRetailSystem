import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PublicListDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
export class ReviewQueryDto extends PublicListDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
  @ApiPropertyOptional({ enum: ['newest', 'rating_asc', 'rating_desc'] })
  @IsOptional()
  @IsIn(['newest', 'rating_asc', 'rating_desc'])
  sort = 'newest';
}
export class CreateReviewDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() orderId?: string;
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;
}
export class BlogQueryDto extends PublicListDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
}
export const BANNER_POSITIONS = [
  'HOME_HERO',
  'HOME_SECONDARY',
  'CATEGORY',
  'PRODUCT',
  'SIDEBAR',
] as const;
export class BannerQueryDto {
  @ApiPropertyOptional({ enum: BANNER_POSITIONS, default: 'HOME_HERO' })
  @IsOptional()
  @IsIn(BANNER_POSITIONS)
  position: string = 'HOME_HERO';
}
