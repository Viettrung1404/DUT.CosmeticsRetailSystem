import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationPlacement } from '@prisma/client';
import { IsOptional, Matches } from 'class-validator';

export class AdminRecommendationMetricsQueryDto {
  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from phải theo định dạng YYYY-MM-DD',
  })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-11-25',
    description: 'Ngày kết thúc (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to phải theo định dạng YYYY-MM-DD',
  })
  to?: string;
}

export class RecommendationMetricsTotalsDto {
  @ApiProperty()
  impressions!: number;

  @ApiProperty()
  clicks!: number;

  @ApiProperty()
  addToCarts!: number;

  @ApiProperty()
  conversions!: number;

  @ApiProperty()
  revenue!: number;

  @ApiProperty({ description: 'Tỷ lệ clicks / impressions' })
  ctr!: number;

  @ApiProperty({ description: 'Tỷ lệ conversions / clicks' })
  cvr!: number;
}

export class PlacementMetricsSummaryDto extends RecommendationMetricsTotalsDto {
  @ApiProperty({ enum: RecommendationPlacement })
  placement!: RecommendationPlacement;
}

export class AdminRecommendationMetricsResponseDto {
  @ApiProperty({ example: '2026-10-27' })
  from!: string;

  @ApiProperty({ example: '2026-11-25' })
  to!: string;

  @ApiProperty({ type: RecommendationMetricsTotalsDto })
  totals!: RecommendationMetricsTotalsDto;

  @ApiProperty({ type: [PlacementMetricsSummaryDto] })
  byPlacement!: PlacementMetricsSummaryDto[];
}
