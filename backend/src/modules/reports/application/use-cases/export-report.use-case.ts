import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { GetUserEffectivePermissionsUseCase } from '@modules/permissions/application/use-cases/get-user-effective-permissions.use-case';
import {
  BinaryReportFormat,
  IReportFileRenderer,
  REPORT_FILE_RENDERER,
  ReportTable,
} from '../ports/report-file-renderer.port';
import { ReportScopeInput } from '../services/report-scope.service';
import { toCsv, toVnDay } from '../utils/report-calculations';
import { GetForecastUseCase } from './get-forecast.use-case';
import { GetHrReportUseCase } from './get-hr-report.use-case';
import { GetProductReportUseCase } from './get-product-report.use-case';
import { GetRevenueReportUseCase, RevenuePeriod } from './get-revenue-report.use-case';
import { GetRfmReportUseCase } from './get-rfm-report.use-case';
import { GetStaffKpiUseCase } from './get-staff-kpi.use-case';
import { GetTrendsUseCase } from './get-trends.use-case';

export type ExportType = 'revenue' | 'products' | 'staff-kpi' | 'rfm' | 'trends' | 'forecast' | 'hr';
export type ExportFormat = BinaryReportFormat | 'csv';

export type ExportInput = ReportScopeInput & {
  type: ExportType;
  format?: ExportFormat;
  period?: RevenuePeriod;
  limit?: number;
  categoryId?: string;
};

// Xuất báo cáo nào thì phải có đúng quyền xem báo cáo đó
const REQUIRED_PERMISSION: Record<ExportType, string> = {
  revenue: 'REPORT_REVENUE',
  products: 'REPORT_VIEW_BASIC',
  'staff-kpi': 'REPORT_STAFF_PERF',
  rfm: 'REPORT_FORECAST',
  trends: 'REPORT_FORECAST',
  forecast: 'REPORT_FORECAST',
  hr: 'EMPLOYEE_VIEW',
};

const TITLES: Record<ExportType, string> = {
  revenue: 'Báo cáo doanh thu',
  products: 'Báo cáo sản phẩm',
  'staff-kpi': 'KPI nhân viên',
  rfm: 'Phân tích khách hàng RFM',
  trends: 'Xu hướng mua hàng',
  forecast: 'Dự báo doanh thu',
  hr: 'Báo cáo nhân sự',
};

const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

const WEEKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

interface ReportContent {
  subtitle: string;
  tables: ReportTable[];
}

@Injectable()
export class ExportReportUseCase {
  constructor(
    private readonly getPermissions: GetUserEffectivePermissionsUseCase,
    private readonly revenue: GetRevenueReportUseCase,
    private readonly products: GetProductReportUseCase,
    private readonly staffKpi: GetStaffKpiUseCase,
    private readonly rfm: GetRfmReportUseCase,
    private readonly trends: GetTrendsUseCase,
    private readonly forecast: GetForecastUseCase,
    private readonly hr: GetHrReportUseCase,
    @Inject(REPORT_FILE_RENDERER) private readonly renderer: IReportFileRenderer,
  ) {}

  async execute(
    userId: string,
    input: ExportInput,
  ): Promise<{ filename: string; contentType: string; body: Buffer | string }> {
    const permissions = await this.getPermissions.execute(userId);
    if (!permissions.includes(REQUIRED_PERMISSION[input.type])) {
      throw new ForbiddenException('Bạn không có quyền xem loại báo cáo này nên không thể xuất');
    }
    const format = input.format ?? 'xlsx';
    const today = toVnDay(new Date());
    const { subtitle, tables } = await this.content(userId, input);
    const body =
      format === 'csv'
        ? tables.map((t) => toCsv(t.headers, t.rows)).join('\r\n')
        : await this.renderer.render(
            { title: TITLES[input.type], subtitle: `${subtitle} · Ngày xuất: ${today}`, tables },
            format,
          );
    return {
      filename: `bao-cao-${input.type}-${today}.${format}`,
      contentType: CONTENT_TYPES[format],
      body,
    };
  }

  private content(userId: string, input: ExportInput): Promise<ReportContent> {
    switch (input.type) {
      case 'revenue':
        return this.revenueContent(userId, input);
      case 'products':
        return this.productContent(userId, input);
      case 'staff-kpi':
        return this.staffContent(userId, input);
      case 'trends':
        return this.trendContent(userId, input);
      case 'forecast':
        return this.forecastContent(userId, input);
      case 'hr':
        return this.hrContent(userId, input);
      default:
        return this.rfmContent(userId, input);
    }
  }

  private async revenueContent(userId: string, input: ExportInput): Promise<ReportContent> {
    const { rows, totals, categories, from, to } = await this.revenue.execute(userId, input);
    return {
      subtitle: `Từ ${from} đến ${to}`,
      tables: [
        {
          title: 'Theo kỳ',
          headers: [
            'Kỳ',
            'Số đơn',
            'Doanh thu',
            'Giảm giá',
            'Phí vận chuyển',
            'Hàng trả',
            'Doanh thu thuần',
            'Giá vốn',
            'Lợi nhuận gộp',
            'Giá trị đơn TB',
            'Tỷ lệ hủy (%)',
          ],
          rows: [...rows, { ...totals, period: 'Tổng' }].map((r) => [
            r.period,
            r.orders,
            r.revenue,
            r.discount,
            r.shippingFee,
            r.returns,
            r.netRevenue,
            r.cost,
            r.grossProfit,
            r.averageOrderValue,
            r.cancelRate,
          ]),
        },
        {
          title: 'Theo danh mục',
          headers: ['Danh mục', 'Số lượng', 'Doanh thu', 'Tỷ trọng (%)'],
          rows: categories.map((c) => [c.categoryName, c.quantity, c.revenue, c.percent]),
        },
      ],
    };
  }

  private async productContent(userId: string, input: ExportInput): Promise<ReportContent> {
    const { bestSellers, slowMovers, byCategory, from, to } = await this.products.execute(userId, input);
    return {
      subtitle: `Từ ${from} đến ${to}`,
      tables: [
        {
          title: 'Bán chạy',
          headers: ['SKU', 'Sản phẩm', 'Số lượng bán', 'Doanh thu', 'Giá vốn', 'Lợi nhuận gộp'],
          rows: bestSellers.map((p) => [p.sku, p.productName, p.quantity, p.revenue, p.cost, p.grossProfit]),
        },
        {
          title: 'Bán chậm',
          headers: ['SKU', 'Sản phẩm', 'Tồn kho', 'Lần bán gần nhất'],
          rows: slowMovers.map((p) => [p.sku, p.productName, p.stock, p.lastSoldAt]),
        },
        {
          title: 'Theo danh mục',
          headers: ['Danh mục', 'Số lượng', 'Doanh thu'],
          rows: byCategory.map((c) => [c.categoryName, c.quantity, c.revenue]),
        },
      ],
    };
  }

  private async staffContent(userId: string, input: ExportInput): Promise<ReportContent> {
    const { rows, from, to } = await this.staffKpi.execute(userId, input);
    return {
      subtitle: `Từ ${from} đến ${to}`,
      tables: [
        {
          title: 'KPI nhân viên',
          headers: [
            'Mã nhân viên',
            'Họ tên',
            'Số đơn',
            'Doanh thu',
            'Hàng trả',
            'Doanh thu thuần',
            'Giá trị đơn trung bình',
            'Hoa hồng',
          ],
          rows: rows.map((r) => [
            r.employeeCode,
            r.fullName,
            r.orders,
            r.revenue,
            r.returns,
            r.netRevenue,
            r.averageOrderValue,
            r.commission,
          ]),
        },
      ],
    };
  }

  private async trendContent(userId: string, input: ExportInput): Promise<ReportContent> {
    const { revenueSeries, categories, heatmap, from, to } = await this.trends.execute(userId, input);
    return {
      subtitle: `Từ ${from} đến ${to}`,
      tables: [
        {
          title: 'Doanh thu theo thời gian',
          headers: ['Kỳ', 'Số đơn', 'Doanh thu thuần', 'Lợi nhuận gộp'],
          rows: revenueSeries.map((r) => [r.period, r.orders, r.revenue, r.grossProfit]),
        },
        {
          title: 'Theo danh mục',
          headers: ['Danh mục', 'Số lượng', 'Doanh thu', 'Tỷ trọng (%)'],
          rows: categories.map((c) => [c.categoryName, c.quantity, c.revenue, c.percent]),
        },
        {
          title: 'Theo giờ trong tuần',
          headers: ['Thứ', 'Giờ', 'Số đơn', 'Doanh thu'],
          rows: heatmap.map((h) => [WEEKDAYS[h.weekday], h.hour, h.orders, h.revenue]),
        },
      ],
    };
  }

  private async forecastContent(userId: string, input: ExportInput): Promise<ReportContent> {
    const { methodLabel, history, forecast } = await this.forecast.execute(userId, {
      storeId: input.storeId,
    });
    return {
      subtitle: methodLabel,
      tables: [
        {
          title: 'Dự báo',
          headers: ['Tháng', 'Doanh thu dự báo', 'Cận dưới 95%', 'Cận trên 95%'],
          rows: forecast.map((f) => [f.period, f.revenue, f.lower, f.upper]),
        },
        {
          title: 'Lịch sử',
          headers: ['Tháng', 'Doanh thu thuần'],
          rows: history.map((h) => [h.period, h.revenue]),
        },
      ],
    };
  }

  private async hrContent(userId: string, input: ExportInput): Promise<ReportContent> {
    const report = await this.hr.execute(userId, input);
    const tables: ReportTable[] = [
      {
        title: 'Tổng quan',
        headers: ['Chỉ số', 'Giá trị'],
        rows: [
          ['Tổng hồ sơ nhân viên', report.totalEmployees],
          ['Đang làm', report.activeEmployees],
          ['Nghỉ phép', report.onLeaveEmployees],
          ['Đã nghỉ việc', report.resignedEmployees],
          ['Tỷ lệ nghỉ việc (%)', report.resignationRatePercent],
          ['Lượt đúng giờ', report.attendance.present],
          ['Lượt đi muộn', report.attendance.late],
          ['Tỷ lệ đi muộn (%)', report.attendance.lateRatePercent],
        ],
      },
      {
        title: 'Theo phòng ban',
        headers: ['Phòng ban', 'Số nhân viên'],
        rows: report.byDepartment.map((r) => [r.name, r.count]),
      },
      {
        title: 'Theo cửa hàng',
        headers: ['Cửa hàng', 'Số nhân viên'],
        rows: report.byStore.map((r) => [r.name, r.count]),
      },
    ];
    if (report.staffKpi) {
      tables.push({
        title: 'KPI bán hàng',
        headers: ['Mã nhân viên', 'Họ tên', 'Số đơn', 'Doanh thu', 'Hoa hồng'],
        rows: report.staffKpi.map((r) => [r.employeeCode, r.fullName, r.orders, r.revenue, r.commission]),
      });
    }
    return { subtitle: `Chấm công từ ${report.from} đến ${report.to}`, tables };
  }

  private async rfmContent(userId: string, input: ExportInput): Promise<ReportContent> {
    const { customers } = await this.rfm.execute(userId, {
      storeId: input.storeId,
      limit: Number.MAX_SAFE_INTEGER,
    });
    return {
      subtitle: 'Khung 12 tháng gần nhất',
      tables: [
        {
          title: 'Khách hàng',
          headers: [
            'Khách hàng',
            'Số ngày từ lần mua cuối',
            'Số đơn',
            'Chi tiêu',
            'Điểm R',
            'Điểm F',
            'Điểm M',
            'Nhóm',
          ],
          rows: customers.map((c) => [
            c.fullName ?? c.customerId,
            c.recencyDays,
            c.frequency,
            c.monetary,
            c.rScore,
            c.fScore,
            c.mScore,
            c.segmentLabel,
          ]),
        },
      ],
    };
  }
}
