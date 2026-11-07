import { Inject, Injectable } from '@nestjs/common';
import {
  IReportRepository,
  REPORT_REPOSITORY,
} from '../../domain/repositories/report.repository.interface';
import { ReportScopeInput, ReportScopeService } from '../services/report-scope.service';
import { groupRevenue } from '../utils/report-calculations';

@Injectable()
export class GetTrendsUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly repository: IReportRepository,
    private readonly scope: ReportScopeService,
  ) {}

  async execute(userId: string, input: ReportScopeInput & { granularity?: 'day' | 'month' }) {
    const granularity = input.granularity ?? 'month';
    const filter = await this.scope.filter(userId, input);
    const [series, categories, categorySeries, heatmap] = await Promise.all([
      this.repository.revenueSeries(filter, granularity),
      this.repository.categoryRevenue(filter),
      this.repository.categorySeries(filter, granularity),
      this.repository.salesHeatmap(filter),
    ]);
    const total = categories.reduce((s, c) => s + c.revenue, 0);
    return {
      granularity,
      from: filter.fromDay,
      to: filter.toDay,
      revenueSeries: groupRevenue(series, granularity).map((r) => ({
        period: r.period,
        orders: r.orders,
        revenue: r.netRevenue,
        grossProfit: r.grossProfit,
      })),
      categories: categories.map((c) => ({
        ...c,
        percent: total ? Math.round((c.revenue / total) * 1000) / 10 : 0,
      })),
      categorySeries,
      heatmap,
    };
  }
}
