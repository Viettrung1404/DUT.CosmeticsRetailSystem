import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../core/guards/permission.guard';
import { RequireAnyPermission } from '../../../../core/decorators/require-permissions.decorator';
import { LogisticsDashboardService } from '../../application/services/logistics-dashboard.service';
import { DashboardFilterDto } from '../dtos/logistics-dashboard.dto';

@ApiTags('Admin - Real-Time Logistics & Operations Dashboard (Epic 20)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/logistics/dashboard')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminLogisticsDashboardController {
  constructor(
    private readonly dashboardService: LogisticsDashboardService,
  ) {}

  @Get('overview')
  @RequireAnyPermission('LOGISTICS_VIEW', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Toàn cảnh Dashboard Logistics thời gian thực (SLA, COD, First-Attempt, Throughput)' })
  async getDashboardOverview(@Query() filter: DashboardFilterDto) {
    return this.dashboardService.getDashboardOverview(filter);
  }

  @Get('first-attempt-rate')
  @RequireAnyPermission('LOGISTICS_VIEW', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Tỷ lệ giao hàng thành công lần đầu (First-attempt Delivery Rate)' })
  async getFirstAttemptRate(@Query() filter: DashboardFilterDto) {
    return this.dashboardService.getFirstAttemptDeliveryRate(filter);
  }

  @Get('express-sla')
  @RequireAnyPermission('LOGISTICS_VIEW', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Tỷ lệ vi phạm cam kết giao hỏa tốc 2H (2H Express SLA Breach Rate)' })
  async getExpressSla(@Query() filter: DashboardFilterDto) {
    return this.dashboardService.getExpressSlaMetrics(filter);
  }

  @Get('cod-reconciliation')
  @RequireAnyPermission('LOGISTICS_VIEW', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Báo cáo & Heatmap sai lệch đối soát COD thời gian thực' })
  async getCodReconciliation(@Query() filter: DashboardFilterDto) {
    return this.dashboardService.getCodReconciliationHeatmap(filter);
  }

  @Get('fulfillment-throughput')
  @RequireAnyPermission('LOGISTICS_VIEW', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Năng suất hoàn tất đơn hàng theo từng kho / Showroom' })
  async getFulfillmentThroughput(@Query() filter: DashboardFilterDto) {
    return this.dashboardService.getFulfillmentThroughput(filter);
  }
}
