import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../core/guards/permission.guard';
import { RequireAnyPermission } from '../../../../core/decorators/require-permissions.decorator';
import { LotQualityAnalyticsService } from '../../application/services/lot-quality-analytics.service';
import {
  CarrierDamageQueryDto,
  CarrierDamageResponseDto,
  LotQualityDetailDto,
  LotQualityReportQueryDto,
  ReturnReasonBreakdownQueryDto,
  ReturnReasonBreakdownResponseDto,
} from '../dtos/lot-quality-analytics.dto';

@ApiTags('Admin Returns Analytics & BI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/returns/analytics')
export class AdminReturnAnalyticsController {
  constructor(
    private readonly analyticsService: LotQualityAnalyticsService,
  ) {}

  @Get('quality-by-lot')
  @RequireAnyPermission('RETURN_VIEW', 'RETURN_MANAGE', 'ADMIN', 'MANAGER', 'QC_STAFF')
  @ApiOperation({
    summary: 'Báo cáo chất lượng theo từng lô sản xuất & Cảnh báo lỗi biến chất (FR-09)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đánh giá chất lượng các lô hàng và kiến nghị hành động (QUARANTINE)',
    type: [LotQualityDetailDto],
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getLotQualityReport(
    @Query() query: LotQualityReportQueryDto,
  ): Promise<LotQualityDetailDto[]> {
    return this.analyticsService.getLotQualityReport(query);
  }

  @Get('reason-breakdown')
  @RequireAnyPermission('RETURN_VIEW', 'RETURN_MANAGE', 'ADMIN', 'MANAGER', 'QC_STAFF')
  @ApiOperation({
    summary: 'Phân tích cơ cấu lý do trả hàng (Hỏng hóc, Bể vỡ, Đổi ý, Dị ứng...)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tỷ trọng và tổng giá trị hoàn theo từng nhóm lý do',
    type: ReturnReasonBreakdownResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getReturnReasonBreakdown(
    @Query() query: ReturnReasonBreakdownQueryDto,
  ): Promise<ReturnReasonBreakdownResponseDto> {
    return this.analyticsService.getReturnReasonBreakdown(query);
  }

  @Get('carrier-damage')
  @RequireAnyPermission('RETURN_VIEW', 'RETURN_MANAGE', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'So sánh tỷ lệ hư hại trong quá trình vận chuyển giữa các hãng 3PL (GHN vs Ahamove)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tỷ lệ hư hại vận chuyển theo đối tác',
    type: CarrierDamageResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getCarrierDamageComparison(
    @Query() query: CarrierDamageQueryDto,
  ): Promise<CarrierDamageResponseDto> {
    return this.analyticsService.getCarrierDamageComparison(query);
  }
}
