import { ForbiddenException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { GetUserEffectivePermissionsUseCase } from '@modules/permissions/application/use-cases/get-user-effective-permissions.use-case';
import { IReportRepository } from '../../../domain/repositories/report.repository.interface';
import { ReportScopeService } from '../../services/report-scope.service';
import { ExportReportUseCase } from '../export-report.use-case';
import { GetForecastUseCase } from '../get-forecast.use-case';
import { GetHrReportUseCase } from '../get-hr-report.use-case';
import { GetRevenueReportUseCase } from '../get-revenue-report.use-case';
import { GetProductReportUseCase } from '../get-product-report.use-case';
import { GetRfmReportUseCase } from '../get-rfm-report.use-case';
import { GetStaffKpiUseCase } from '../get-staff-kpi.use-case';
import { GetTrendsUseCase } from '../get-trends.use-case';
import { IReportFileRenderer } from '../../ports/report-file-renderer.port';
import { RfmService } from '../../services/rfm.service';

const makeRepo = (): jest.Mocked<IReportRepository> => ({
  revenueSeries: jest.fn().mockResolvedValue([]),
  orderOutcomes: jest.fn().mockResolvedValue([]),
  revenueByChannel: jest.fn().mockResolvedValue([]),
  productSales: jest.fn().mockResolvedValue([]),
  slowMovers: jest.fn().mockResolvedValue([]),
  staffPerformance: jest.fn().mockResolvedValue([]),
  customerActivity: jest.fn().mockResolvedValue([]),
  lowStockCount: jest.fn().mockResolvedValue(0),
  newCustomers: jest.fn().mockResolvedValue(0),
  pendingOrders: jest.fn().mockResolvedValue(0),
  categoryRevenue: jest.fn().mockResolvedValue([]),
  categorySeries: jest.fn().mockResolvedValue([]),
  salesHeatmap: jest.fn().mockResolvedValue([]),
  hrSummary: jest.fn().mockResolvedValue({ byStatus: [], byDepartment: [], byStore: [], attendance: [] }),
});

const scopeOf = (scope: unknown) =>
  new ReportScopeService({ execute: jest.fn().mockResolvedValue(scope) } as unknown as GetUserDataScopeUseCase);

const STORE_SCOPE = { type: 'STORE', storeIds: ['s1'], employeeId: 'e1' };

describe('ReportScopeService', () => {
  it('phạm vi ALL không giới hạn cửa hàng', async () => {
    const f = await scopeOf({ type: 'ALL', storeIds: [], employeeId: null }).filter('u', {});
    expect(f.storeIds).toBeUndefined();
  });

  it('phạm vi STORE chỉ thấy cửa hàng được gán', async () => {
    const f = await scopeOf(STORE_SCOPE).filter('u', {});
    expect(f.storeIds).toEqual(['s1']);
  });

  it('cửa hàng ngoài phạm vi → 403', async () => {
    await expect(scopeOf(STORE_SCOPE).filter('u', { storeId: 's2' })).rejects.toThrow(ForbiddenException);
  });

  it('phạm vi SELF bị ép về đơn của chính nhân viên, bỏ qua employeeId gửi lên', async () => {
    const f = await scopeOf({ type: 'SELF', storeIds: ['s1'], employeeId: 'e1' }).filter('u', { employeeId: 'khac' });
    expect(f.employeeId).toBe('e1');
  });

  it('SELF không có hồ sơ nhân viên thì không thấy dữ liệu nào', async () => {
    const f = await scopeOf({ type: 'SELF', storeIds: [], employeeId: null }).filter('u', {});
    expect(f.storeIds).toEqual([]);
  });
});

describe('use case báo cáo', () => {
  it('doanh thu truyền đúng bộ lọc và nhóm theo tuần', async () => {
    const repo = makeRepo();
    repo.revenueSeries.mockResolvedValue([
      { period: '2026-11-02', orders: 1, revenue: 100, discount: 0, shipping: 0, cost: 50, returns: 0, returnedCost: 0 },
    ]);
    const uc = new GetRevenueReportUseCase(repo, scopeOf(STORE_SCOPE));
    const result = await uc.execute('u', { from: '2026-11-01', to: '2026-11-07', period: 'week' });
    expect(repo.revenueSeries.mock.calls[0][0].storeIds).toEqual(['s1']);
    expect(repo.revenueSeries.mock.calls[0][1]).toBe('day');
    expect(result.rows[0].period).toBe('2026-11-02');
    expect(result.totals.grossProfit).toBe(50);
  });

  it('doanh thu theo quý kèm giá trị đơn, tỷ lệ hủy và danh mục', async () => {
    const repo = makeRepo();
    repo.revenueSeries.mockResolvedValue([
      { period: '2026-01', orders: 2, revenue: 300, discount: 0, shipping: 0, cost: 100, returns: 0, returnedCost: 0 },
      { period: '2026-02', orders: 1, revenue: 300, discount: 0, shipping: 0, cost: 100, returns: 0, returnedCost: 0 },
    ]);
    repo.orderOutcomes.mockResolvedValue([
      { period: '2026-01', placed: 4, cancelled: 1 },
      { period: '2026-04', placed: 1, cancelled: 1 },
    ]);
    repo.categoryRevenue.mockResolvedValue([
      { categoryId: 'c1', categoryName: 'Son', quantity: 3, revenue: 450 },
      { categoryId: 'c2', categoryName: 'Kem', quantity: 1, revenue: 150 },
    ]);
    const uc = new GetRevenueReportUseCase(repo, scopeOf(STORE_SCOPE));
    const result = await uc.execute('u', { from: '2026-01-01', to: '2026-06-30', period: 'quarter' });
    expect(repo.revenueSeries.mock.calls[0][1]).toBe('month');
    expect(result.rows.map((r) => r.period)).toEqual(['2026-Q1', '2026-Q2']);
    expect(result.rows[0]).toMatchObject({ orders: 3, averageOrderValue: 200, placedOrders: 4, cancelRate: 25 });
    expect(result.rows[1]).toMatchObject({ orders: 0, cancelledOrders: 1, cancelRate: 100 });
    expect(result.totals).toMatchObject({ placedOrders: 5, cancelledOrders: 2, cancelRate: 40 });
    expect(result.categories[0].percent).toBe(75);
  });

  it('so sánh kỳ liền trước tính phần trăm thay đổi', async () => {
    const repo = makeRepo();
    const row = (revenue: number) => ({
      period: '2026-10-01', orders: 1, revenue, discount: 0, shipping: 0, cost: 0, returns: 0, returnedCost: 0,
    });
    repo.revenueSeries.mockResolvedValueOnce([row(150)]).mockResolvedValueOnce([row(100)]);
    const uc = new GetRevenueReportUseCase(repo, scopeOf(STORE_SCOPE));
    const result = await uc.execute('u', { from: '2026-10-11', to: '2026-10-20', compare: 'previous' });
    expect('comparison' in result && result.comparison).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-10',
      change: { netRevenue: 50 },
    });
  });

  it('bán chậm tính mốc 30 ngày', async () => {
    const repo = makeRepo();
    const uc = new GetProductReportUseCase(repo, scopeOf(STORE_SCOPE));
    const result = await uc.execute('u', {});
    expect(result.slowMoverDays).toBe(30);
    const since = repo.slowMovers.mock.calls[0][1];
    expect(Math.round((Date.now() - since.getTime()) / 86400000)).toBe(30);
  });

  it('dự báo: 12 tháng lịch sử + SMA 3 tháng', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-10T03:00:00Z'));
    try {
      const repo = makeRepo();
      repo.revenueSeries.mockResolvedValue(
        ['2026-08', '2026-09', '2026-10'].map((period, i) => ({
          period,
          orders: 1,
          revenue: (i + 1) * 100,
          discount: 0,
          shipping: 0,
          cost: 0,
          returns: 0,
          returnedCost: 0,
        })),
      );
      const result = await new GetForecastUseCase(repo, scopeOf(STORE_SCOPE)).execute('u', { months: 2 });
      expect(result.history).toHaveLength(12);
      expect(result.history[0].period).toBe('2025-11');
      expect(result.history[11]).toEqual({ period: '2026-10', revenue: 300 });
      expect(result.forecast).toMatchObject([
        { period: '2026-11', revenue: 200 },
        { period: '2026-12', revenue: 233.33 },
      ]);
      expect(result.forecast[0].lower).toBeLessThan(200);
      expect(result.forecast[0].upper).toBeGreaterThan(200);
    } finally {
      jest.useRealTimers();
    }
  });

  it('RFM giới hạn số khách liệt kê nhưng đếm đủ tổng', async () => {
    const repo = makeRepo();
    repo.customerActivity.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        customerId: `c${i}`,
        fullName: null,
        lastPurchaseAt: new Date(Date.now() - i * 86400000),
        frequency: i + 1,
        monetary: (i + 1) * 100,
      })),
    );
    const rfm = new RfmService(repo, scopeOf(STORE_SCOPE));
    const result = await new GetRfmReportUseCase(rfm).execute('u', { limit: 2 });
    expect(result.totalCustomers).toBe(5);
    expect(result.customers).toHaveLength(2);
    expect(result.customers[0].monetary).toBe(500);
  });
});

describe('ExportReportUseCase', () => {
  const permissionsOf = (permissions: string[]) =>
    ({ execute: jest.fn().mockResolvedValue(permissions) }) as unknown as GetUserEffectivePermissionsUseCase;

  const build = (permissions: string[]) => {
    const repo = makeRepo();
    const renderer: IReportFileRenderer = { render: jest.fn().mockResolvedValue(Buffer.from('FILE')) };
    repo.staffPerformance.mockResolvedValue([
      { employeeId: 'e1', employeeCode: 'NV001', fullName: 'Nguyễn, Văn "A"', orders: 2, revenue: 200, returns: 50, commission: 4 },
    ]);
    const scope = scopeOf(STORE_SCOPE);
    const rfm = new RfmService(repo, scope);
    const uc = new ExportReportUseCase(
      permissionsOf(permissions),
      new GetRevenueReportUseCase(repo, scope),
      new GetProductReportUseCase(repo, scope),
      new GetStaffKpiUseCase(repo, scope),
      new GetRfmReportUseCase(rfm),
      new GetTrendsUseCase(repo, scope),
      new GetForecastUseCase(repo, scope),
      new GetHrReportUseCase(repo, scope, permissionsOf(permissions)),
      renderer,
    );
    return { uc, renderer };
  };

  it('xuất KPI nhân viên ra CSV có BOM và escape đúng', async () => {
    const { uc } = build(['REPORT_EXPORT', 'REPORT_STAFF_PERF']);
    const { body, filename, contentType } = await uc.execute('u', { type: 'staff-kpi', format: 'csv' });
    const csv = body as string;
    expect(filename).toMatch(/^bao-cao-staff-kpi-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(contentType).toContain('text/csv');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('NV001,"Nguyễn, Văn ""A""",2,200,50,150,100,4');
  });

  it('mặc định xuất Excel, đưa bảng cho bộ dựng file', async () => {
    const { uc, renderer } = build(['REPORT_EXPORT', 'REPORT_STAFF_PERF']);
    const { filename, contentType } = await uc.execute('u', { type: 'staff-kpi' });
    expect(filename).toMatch(/\.xlsx$/);
    expect(contentType).toContain('spreadsheetml');
    const [document, format] = (renderer.render as jest.Mock).mock.calls[0];
    expect(format).toBe('xlsx');
    expect(document.tables[0].rows[0][0]).toBe('NV001');
  });

  it.each([
    ['trends', 'REPORT_FORECAST'],
    ['forecast', 'REPORT_FORECAST'],
    ['hr', 'EMPLOYEE_VIEW'],
  ] as const)('xuất %s ra PDF cần quyền %s', async (type, permission) => {
    const allowed = build(['REPORT_EXPORT', permission]);
    const { filename } = await allowed.uc.execute('u', { type, format: 'pdf' });
    expect(filename.endsWith('.pdf')).toBe(true);
    await expect(build(['REPORT_EXPORT']).uc.execute('u', { type })).rejects.toThrow(ForbiddenException);
  });

  it('thiếu quyền xem loại báo cáo thì không xuất được', async () => {
    const { uc } = build(['REPORT_EXPORT']);
    await expect(uc.execute('u', { type: 'revenue' })).rejects.toThrow(ForbiddenException);
  });
});
