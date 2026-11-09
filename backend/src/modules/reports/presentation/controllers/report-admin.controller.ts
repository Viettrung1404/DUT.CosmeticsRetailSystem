import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RawResponse } from '@core/decorators/raw-response.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { ExportReportUseCase } from '../../application/use-cases/export-report.use-case';
import { GetCustomerSegmentsUseCase } from '../../application/use-cases/get-customer-segments.use-case';
import { GetDashboardUseCase } from '../../application/use-cases/get-dashboard.use-case';
import { GetForecastUseCase } from '../../application/use-cases/get-forecast.use-case';
import { GetHrReportUseCase } from '../../application/use-cases/get-hr-report.use-case';
import { GetProductReportUseCase } from '../../application/use-cases/get-product-report.use-case';
import { GetRevenueReportUseCase } from '../../application/use-cases/get-revenue-report.use-case';
import { GetRfmReportUseCase } from '../../application/use-cases/get-rfm-report.use-case';
import { GetStaffKpiUseCase } from '../../application/use-cases/get-staff-kpi.use-case';
import { GetTrendsUseCase } from '../../application/use-cases/get-trends.use-case';
import {
  ExportReportQueryDto,
  ForecastQueryDto,
  HrReportQueryDto,
  ProductReportQueryDto,
  ReportRangeQueryDto,
  RevenueReportQueryDto,
  RfmQueryDto,
  StoreQueryDto,
  TrendsQueryDto,
} from '../dtos/report-request.dto';
import { DashboardResponseDto } from '../dtos/report-response.dto';
import { RevenueReportResponseDto } from '../dtos/report-response.dto';
import { ProductReportResponseDto } from '../dtos/report-response.dto';
import { StaffKpiResponseDto } from '../dtos/report-response.dto';
import { RfmReportResponseDto } from '../dtos/report-response.dto';
import { CustomerSegmentsResponseDto } from '../dtos/report-response.dto';
import { TrendsResponseDto } from '../dtos/report-response.dto';
import { ForecastResponseDto } from '../dtos/report-response.dto';
import { HrReportResponseDto } from '../dtos/report-response.dto';

@ApiTags('Admin - Reports (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class ReportAdminController {
  constructor(
    private readonly dashboard: GetDashboardUseCase,
    private readonly revenue: GetRevenueReportUseCase,
    private readonly products: GetProductReportUseCase,
    private readonly staffKpi: GetStaffKpiUseCase,
    private readonly exporter: ExportReportUseCase,
    private readonly rfm: GetRfmReportUseCase,
    private readonly segments: GetCustomerSegmentsUseCase,
    private readonly trends: GetTrendsUseCase,
    private readonly forecast: GetForecastUseCase,
    private readonly hr: GetHrReportUseCase,
  ) {}

  @Get('dashboard')
  @RequirePermissions('REPORT_VIEW_BASIC')
  @ApiOperation({ summary: 'Admin - Dashboard: doanh thu hôm nay, 7 ngày, top 5 sản phẩm, tỷ lệ kênh, đơn chờ, tồn thấp' })
  @ApiOkResponse({ type: DashboardResponseDto })
  getDashboard(@CurrentUser('userId') userId: string) {
    return this.dashboard.execute(userId);
  }

  @Get('reports/revenue')
  @RequirePermissions('REPORT_REVENUE')
  @ApiOperation({ summary: 'Admin - Báo cáo doanh thu theo ngày/tuần/tháng: giảm giá, phí ship, giá vốn, lợi nhuận gộp' })
  @ApiOkResponse({ type: RevenueReportResponseDto })
  getRevenue(@CurrentUser('userId') userId: string, @Query() query: RevenueReportQueryDto) {
    return this.revenue.execute(userId, query);
  }

  @Get('reports/products')
  @RequirePermissions('REPORT_VIEW_BASIC')
  @ApiOperation({ summary: 'Admin - Sản phẩm bán chạy và bán chậm (còn tồn, không bán 30 ngày)' })
  @ApiOkResponse({ type: ProductReportResponseDto })
  getProducts(@CurrentUser('userId') userId: string, @Query() query: ProductReportQueryDto) {
    return this.products.execute(userId, query);
  }

  @Get('reports/staff-kpi')
  @RequirePermissions('REPORT_STAFF_PERF')
  @ApiOperation({ summary: 'Admin - KPI bán hàng theo nhân viên: số đơn, doanh thu, hoa hồng' })
  @ApiOkResponse({ type: StaffKpiResponseDto })
  getStaffKpi(@CurrentUser('userId') userId: string, @Query() query: ReportRangeQueryDto) {
    return this.staffKpi.execute(userId, query);
  }

  @Get('reports/export')
  @RequirePermissions('REPORT_EXPORT')
  @RawResponse()
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'text/csv',
  )
  @ApiOperation({ summary: 'Admin - Xuất báo cáo ra Excel (mặc định), PDF hoặc CSV; cần quyền xem đúng loại báo cáo' })
  async export(
    @CurrentUser('userId') userId: string,
    @Query() query: ExportReportQueryDto,
    @Res() res: Response,
  ) {
    const { filename, contentType, body } = await this.exporter.execute(userId, query);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });
    res.send(body);
  }

  @Get('reports/rfm')
  @RequirePermissions('REPORT_FORECAST')
  @ApiOperation({ summary: 'Admin - Phân tích RFM khung 12 tháng (ngũ phân vị), kèm nhóm khách' })
  @ApiOkResponse({ type: RfmReportResponseDto })
  getRfm(@CurrentUser('userId') userId: string, @Query() query: RfmQueryDto) {
    return this.rfm.execute(userId, query);
  }

  @Get('customers/segments')
  @RequirePermissions('REPORT_FORECAST')
  @ApiOperation({ summary: 'Admin - Số khách và chi tiêu theo từng nhóm RFM' })
  @ApiOkResponse({ type: CustomerSegmentsResponseDto })
  getSegments(@CurrentUser('userId') userId: string, @Query() query: StoreQueryDto) {
    return this.segments.execute(userId, query);
  }

  @Get('reports/trends')
  @RequirePermissions('REPORT_FORECAST')
  @ApiOperation({ summary: 'Admin - Xu hướng doanh thu theo thời gian, danh mục và giờ trong tuần (heatmap)' })
  @ApiOkResponse({ type: TrendsResponseDto })
  getTrends(@CurrentUser('userId') userId: string, @Query() query: TrendsQueryDto) {
    return this.trends.execute(userId, query);
  }

  @Get('reports/forecast')
  @RequirePermissions('REPORT_FORECAST')
  @ApiOperation({ summary: 'Admin - Dự báo doanh thu kèm khoảng tin cậy 95% (trung bình trượt hoặc hồi quy tuyến tính)' })
  @ApiOkResponse({ type: ForecastResponseDto })
  getForecast(@CurrentUser('userId') userId: string, @Query() query: ForecastQueryDto) {
    return this.forecast.execute(userId, query);
  }

  @Get('reports/hr')
  @RequirePermissions('EMPLOYEE_VIEW')
  @ApiOperation({ summary: 'Admin - Báo cáo nhân sự: theo phòng ban, cửa hàng, nghỉ việc, đi muộn, KPI' })
  @ApiOkResponse({ type: HrReportResponseDto })
  getHr(@CurrentUser('userId') userId: string, @Query() query: HrReportQueryDto) {
    return this.hr.execute(userId, query);
  }
}
