import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationPlacement } from '@prisma/client';

export class RecommendedBrandDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class RecommendedProductItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ example: 450000 })
  basePrice!: number;

  @ApiPropertyOptional({ example: 390000, nullable: true })
  salePrice!: number | null;

  @ApiProperty({ example: 390000, description: 'Giá hiển thị cuối cùng (salePrice nếu có, ngược lại basePrice)' })
  displayPrice!: number;

  @ApiPropertyOptional({ nullable: true })
  imageUrl!: string | null;

  @ApiPropertyOptional({ type: RecommendedBrandDto, nullable: true })
  brand!: RecommendedBrandDto | null;

  @ApiProperty({ example: 4.8 })
  avgRating!: number;

  @ApiProperty({ example: 120 })
  totalSold!: number;

  @ApiPropertyOptional({ nullable: true })
  reason?: string | null;

  @ApiPropertyOptional({ example: 0.875 })
  score?: number;

  @ApiProperty({ enum: RecommendationPlacement })
  placement!: RecommendationPlacement;
}

export class RecommendationListResponseDto {
  @ApiProperty({ enum: RecommendationPlacement })
  placement!: RecommendationPlacement;

  @ApiProperty({ example: 'rec_home' })
  attributionSource!: string;

  @ApiProperty({ type: [RecommendedProductItemDto] })
  items!: RecommendedProductItemDto[];
}

export class SemanticSearchResponseDto extends RecommendationListResponseDto {
  @ApiProperty({ example: 'serum kiềm dầu cho da mụn nhạy cảm' })
  query!: string;

  @ApiProperty({ enum: ['SEMANTIC_VECTOR', 'KEYWORD_FALLBACK'] })
  mode!: 'SEMANTIC_VECTOR' | 'KEYWORD_FALLBACK';
}
