import { Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  IReportRepository,
  REPORT_REPOSITORY,
} from '../../domain/repositories/report.repository.interface';
import { ReportScopeService, visibleStores } from '../services/report-scope.service';
import { addDays, fillDays, groupRevenue, sumRevenue, toVnDay, vnDayStart } from '../utils/report-calculations';

@Injectable()
export class GetDashboardUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly repository: IReportRepository,
    private readonly scope: ReportScopeService,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string) {
    const now = new Date();
    const today = toVnDay(now);
    const weekFromDay = addDays(today, -6);
    const week = await this.scope.filter(userId, { from: weekFromDay, to: today }, now);
    const todayFilter = { ...week, from: vnDayStart(today) };
    const stores = visibleStores(await this.getUserDataScope.execute(userId));

    const [dayRows, todayRows, channels, topProducts, pending, lowStock, newCustomers] = await Promise.all([
      this.repository.revenueSeries(week, 'day'),
      this.repository.revenueSeries(todayFilter, 'day'),
      this.repository.revenueByChannel(week),
      this.repository.productSales(week, 5),
      this.repository.pendingOrders(stores),
      this.repository.lowStockCount(stores),
      this.repository.newCustomers(vnDayStart(today), week.to),
    ]);

    const todayTotal = sumRevenue(groupRevenue(todayRows, 'day'));
    const channelTotal = channels.reduce((s, c) => s + c.revenue, 0);
    return {
      date: today,
      today: {
        revenue: todayTotal.netRevenue,
        orders: todayTotal.orders,
        averageOrderValue: todayTotal.orders ? Math.round(todayTotal.revenue / todayTotal.orders) : 0,
        newCustomers,
      },
      last7Days: fillDays(groupRevenue(dayRows, 'day'), weekFromDay, today).map((r) => ({
        date: r.period,
        orders: r.orders,
        revenue: r.netRevenue,
      })),
      topProducts,
      channelShare: channels.map((c) => ({
        channel: c.channel,
        orders: c.orders,
        revenue: c.revenue,
        percent: channelTotal ? Math.round((c.revenue / channelTotal) * 1000) / 10 : 0,
      })),
      pendingOrders: pending,
      lowStockVariants: lowStock,
    };
  }
}
