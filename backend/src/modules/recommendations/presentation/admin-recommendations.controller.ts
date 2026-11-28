import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { PermissionGuard } from '@core/guards/permission.guard';
import { RecommendationMetricsService } from '../application/services/recommendation-metrics.service';
import {
  AdminRecommendationMetricsQueryDto,
  AdminRecommendationMetricsResponseDto,
} from './dtos/admin-metrics.dto';

@ApiTags('Admin - Recommendations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/recommendations')
export class AdminRecommendationsController {
  constructor(private readonly metricsService: RecommendationMetricsService) {}

  @Get('metrics')
  @RequirePermissions('REPORT_VIEW_BASIC')
  @ApiOperation({
    summary:
      'Thống kê hiệu quả hệ thống gợi ý theo placement (Impressions, Clicks, AddToCart, Conversions, Revenue, CTR, CVR)',
  })
  @ApiOkResponse({ type: AdminRecommendationMetricsResponseDto })
  getMetrics(
    @Query() query: AdminRecommendationMetricsQueryDto,
  ): Promise<AdminRecommendationMetricsResponseDto> {
    return this.metricsService.getMetricsReport(query.from, query.to);
  }
}
