import { ApiProperty } from '@nestjs/swagger';

// Các mảng lồng nhau (rows, items, series) mô tả ở mức khóa chính; chi tiết từng dòng theo use case tương ứng.
export class DashboardTodayDto {
  @ApiProperty({ example: 15400000, description: 'Doanh thu thuần hôm nay (VND)' })
  revenue: number;

  @ApiProperty({ example: 42 })
  orders: number;

  @ApiProperty({ example: 366666 })
  averageOrderValue: number;

  @ApiProperty({ example: 5 })
  newCustomers: number;
}

export class DashboardResponseDto {
  @ApiProperty({ example: '2026-11-09', description: 'Ngày theo giờ Việt Nam' })
  date: string;

  @ApiProperty({ type: DashboardTodayDto })
  today: DashboardTodayDto;

  @ApiProperty({ type: [Object], description: 'Doanh thu 7 ngày gần nhất: date, orders, revenue' })
  last7Days: object[];

  @ApiProperty({ type: [Object], description: 'Top sản phẩm bán chạy' })
  topProducts: object[];

  @ApiProperty({ type: [Object], description: 'Tỷ trọng doanh thu theo kênh (POS, ONLINE)' })
  channelShare: object[];

  @ApiProperty({ example: 3, description: 'Số đơn đang chờ xử lý' })
  pendingOrders: number;

  @ApiProperty({ type: [Object], description: 'Biến thể tồn kho thấp dưới ngưỡng' })
  lowStockVariants: object[];
}

export class RevenueTotalsDto {
  @ApiProperty({ example: 42 })
  orders: number;

  @ApiProperty({ example: 15400000 })
  revenue: number;

  @ApiProperty({ example: 366666 })
  averageOrderValue: number;
}

export class RevenueReportResponseDto {
  @ApiProperty({ type: [Object], description: 'Dòng doanh thu theo kỳ (cấu trúc RevenueRow)' })
  rows: object[];

  @ApiProperty({ type: RevenueTotalsDto, description: 'Tổng hợp kỳ hiện tại, cộng thêm số liệu kết quả đơn' })
  totals: RevenueTotalsDto & Record<string, unknown>;

  @ApiProperty({ required: false, type: Object, description: 'Có khi truyền tham số so sánh kỳ trước / cùng kỳ năm trước' })
  comparison?: object;
}

export class ProductReportResponseDto {
  @ApiProperty({ example: '2026-11-01' })
  from: string;

  @ApiProperty({ example: '2026-11-09' })
  to: string;

  @ApiProperty({ type: [Object], description: 'Sản phẩm bán chạy, có lợi nhuận gộp (grossProfit)' })
  bestSellers: object[];

  @ApiProperty({ type: [Object], description: 'Sản phẩm bán chậm' })
  slowMovers: object[];

  @ApiProperty({ example: 60, description: 'Ngưỡng ngày để xác định bán chậm' })
  slowMoverDays: number;

  @ApiProperty({ type: [Object], description: 'Doanh thu theo danh mục' })
  byCategory: object[];
}

export class StaffKpiResponseDto {
  @ApiProperty({ example: '2026-11-01' })
  from: string;

  @ApiProperty({ example: '2026-11-09' })
  to: string;

  @ApiProperty({ type: [Object], description: 'KPI từng nhân viên (cấu trúc StaffRow)' })
  rows: object[];
}

export class RfmReportResponseDto {
  @ApiProperty({ example: '2025-11-09' })
  windowFrom: string;

  @ApiProperty({ example: '2026-11-09' })
  windowTo: string;

  @ApiProperty({ example: 320 })
  totalCustomers: number;

  @ApiProperty({ type: [Object], description: 'Thống kê theo phân khúc RFM' })
  segments: object[];

  @ApiProperty({ type: [Object], description: 'Danh sách khách (đã lọc theo phân khúc, giới hạn số dòng)' })
  customers: object[];
}

export class CustomerSegmentsResponseDto {
  @ApiProperty({ example: '2025-11-09' })
  windowFrom: string;

  @ApiProperty({ example: '2026-11-09' })
  windowTo: string;

  @ApiProperty({ example: 320 })
  totalCustomers: number;

  @ApiProperty({ type: [Object], description: 'Thống kê theo phân khúc RFM' })
  segments: object[];
}

export class TrendsResponseDto {
  @ApiProperty({ enum: ['day', 'month'], example: 'day' })
  granularity: string;

  @ApiProperty({ example: '2026-11-01' })
  from: string;

  @ApiProperty({ example: '2026-11-09' })
  to: string;

  @ApiProperty({ type: [Object], description: 'Chuỗi doanh thu theo kỳ' })
  revenueSeries: object[];

  @ApiProperty({ type: [Object], description: 'Danh mục được so sánh' })
  categories: object[];

  @ApiProperty({ type: [Object], description: 'Chuỗi doanh thu theo từng danh mục' })
  categorySeries: object[];

  @ApiProperty({ type: [Object], description: 'Ma trận nhiệt (cấu trúc HeatmapRow)' })
  heatmap: object[];
}

export class ForecastResponseDto {
  @ApiProperty({ enum: ['sma', 'linear'], example: 'linear' })
  method: string;

  @ApiProperty({ example: 'Hồi quy tuyến tính' })
  methodLabel: string;

  @ApiProperty({ example: 95 })
  confidenceLevel: number;

  @ApiProperty({ type: [Object], description: 'Doanh thu lịch sử theo tháng' })
  history: object[];

  @ApiProperty({ type: [Object], description: 'Điểm dự báo theo tháng (cấu trúc ForecastPoint)' })
  forecast: object[];
}

export class HrReportResponseDto {
  @ApiProperty({ example: '2026-11-01' })
  from: string;

  @ApiProperty({ example: '2026-11-09' })
  to: string;

  @ApiProperty({ example: 25 })
  totalEmployees: number;

  @ApiProperty({ example: 22 })
  activeEmployees: number;

  @ApiProperty({ example: 1 })
  onLeaveEmployees: number;

  @ApiProperty({ example: 2 })
  resignedEmployees: number;

  @ApiProperty({ example: 8, description: 'Tỷ lệ nghỉ việc (phần trăm)' })
  resignationRatePercent: number;

  @ApiProperty({ type: [Object], description: 'Thống kê nhân sự theo phòng ban' })
  byDepartment: object[];

  @ApiProperty({ type: [Object], description: 'Thống kê nhân sự theo cửa hàng' })
  byStore: object[];

  @ApiProperty({ type: Object, description: 'Tổng hợp chấm công' })
  attendance: object;

  @ApiProperty({ type: [Object], description: 'KPI nhân viên' })
  staffKpi: object[];
}
