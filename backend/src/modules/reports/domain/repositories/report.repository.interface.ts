export const REPORT_REPOSITORY = Symbol('IReportRepository');

export interface ReportFilter {
  from: Date;
  to: Date;
  // undefined = mọi cửa hàng (phạm vi ALL)
  storeIds?: string[];
  // Phạm vi SELF: chỉ đơn do chính nhân viên này bán
  employeeId?: string;
  // Lọc theo danh mục (gồm cả danh mục con); chỉ áp cho báo cáo theo dòng hàng
  categoryId?: string;
}

export interface RevenueRow {
  period: string;
  orders: number;
  revenue: number;
  discount: number;
  shipping: number;
  cost: number;
  returns: number;
  returnedCost: number;
}

export interface OrderOutcomeRow {
  period: string;
  placed: number;
  cancelled: number;
}

export interface ChannelRow {
  channel: string;
  orders: number;
  revenue: number;
}

export interface ProductSalesRow {
  productVariantId: string;
  sku: string;
  productName: string;
  quantity: number;
  revenue: number;
  cost: number;
}

export interface SlowMoverRow {
  productVariantId: string;
  sku: string;
  productName: string;
  stock: number;
  lastSoldAt: Date | null;
}

export interface StaffRow {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  orders: number;
  revenue: number;
  returns: number;
  commission: number;
}

export interface CustomerActivityRow {
  customerId: string;
  fullName: string | null;
  lastPurchaseAt: Date;
  frequency: number;
  monetary: number;
}

export interface CategoryRevenueRow {
  categoryId: string;
  categoryName: string;
  quantity: number;
  revenue: number;
}

export interface CategorySeriesRow {
  period: string;
  categoryId: string;
  categoryName: string;
  revenue: number;
}

export interface HeatmapRow {
  // 0 = Thứ Hai ... 6 = Chủ Nhật, giờ theo giờ VN
  weekday: number;
  hour: number;
  orders: number;
  revenue: number;
}

export interface HrSummaryRow {
  byStatus: { status: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  byStore: { name: string; count: number }[];
  attendance: { status: string | null; count: number }[];
}

export interface IReportRepository {
  // Doanh thu ghi nhận: POS lúc bán, online lúc COMPLETED; hàng trả trừ vào ngày hoàn tất trả hàng
  revenueSeries(filter: ReportFilter, granularity: 'day' | 'month'): Promise<RevenueRow[]>;
  // Đơn tạo trong kỳ và số đơn đã hủy, dùng tính tỷ lệ hủy
  orderOutcomes(filter: ReportFilter, granularity: 'day' | 'month'): Promise<OrderOutcomeRow[]>;
  revenueByChannel(filter: ReportFilter): Promise<ChannelRow[]>;
  productSales(filter: ReportFilter, limit: number): Promise<ProductSalesRow[]>;
  slowMovers(
    storeIds: string[] | undefined,
    since: Date,
    limit: number,
    categoryId?: string,
  ): Promise<SlowMoverRow[]>;
  staffPerformance(filter: ReportFilter): Promise<StaffRow[]>;
  customerActivity(filter: ReportFilter): Promise<CustomerActivityRow[]>;
  lowStockCount(storeIds: string[] | undefined): Promise<number>;
  newCustomers(from: Date, to: Date): Promise<number>;
  pendingOrders(storeIds: string[] | undefined): Promise<number>;
  categoryRevenue(filter: ReportFilter): Promise<CategoryRevenueRow[]>;
  categorySeries(filter: ReportFilter, granularity: 'day' | 'month'): Promise<CategorySeriesRow[]>;
  salesHeatmap(filter: ReportFilter): Promise<HeatmapRow[]>;
  // fromDay/toDay dạng YYYY-MM-DD, toDay là ngày không tính
  hrSummary(storeIds: string[] | undefined, fromDay: string, toDay: string): Promise<HrSummaryRow>;
}
