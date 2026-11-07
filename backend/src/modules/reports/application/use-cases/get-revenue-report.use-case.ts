import { Inject, Injectable } from '@nestjs/common';
import {
  IReportRepository,
  REPORT_REPOSITORY,
  ReportFilter,
} from '../../domain/repositories/report.repository.interface';
import { ReportScopeInput, ReportScopeService } from '../services/report-scope.service';
import {
  changePercent,
  comparisonRange,
  groupRevenue,
  PeriodKind,
  percent,
  sumOutcomes,
  sumRevenue,
  withOrderMetrics,
} from '../utils/report-calculations';

export type RevenuePeriod = PeriodKind;
export type RevenueCompare = 'previous' | 'last_year';

const seriesGrain = (period: RevenuePeriod) => (period === 'day' || period === 'week' ? 'day' : 'month');

@Injectable()
export class GetRevenueReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly repository: IReportRepository,
    private readonly scope: ReportScopeService,
  ) {}

  async execute(
    userId: string,
    input: ReportScopeInput & { period?: RevenuePeriod; compare?: RevenueCompare },
  ) {
    const period = input.period ?? 'day';
    const filter = await this.scope.filter(userId, input);
    const [current, categories] = await Promise.all([
      this.load(filter, period),
      this.repository.categoryRevenue(filter),
    ]);
    const categoryTotal = categories.reduce((s, c) => s + c.revenue, 0);
    const result = {
      period,
      from: filter.fromDay,
      to: filter.toDay,
      rows: current.rows,
      totals: current.totals,
      categories: categories.map((c) => ({ ...c, percent: percent(c.revenue, categoryTotal) })),
    };
    if (!input.compare) return result;

    const range = comparisonRange(filter.fromDay, filter.toDay, input.compare);
    const previous = await this.load(await this.scope.filter(userId, { ...input, ...range }), period);
    return {
      ...result,
      comparison: {
        mode: input.compare,
        from: range.from,
        to: range.to,
        totals: previous.totals,
        change: {
          orders: changePercent(current.totals.orders, previous.totals.orders),
          netRevenue: changePercent(current.totals.netRevenue, previous.totals.netRevenue),
          grossProfit: changePercent(current.totals.grossProfit, previous.totals.grossProfit),
          averageOrderValue: changePercent(
            current.totals.averageOrderValue,
            previous.totals.averageOrderValue,
          ),
          cancelRate: changePercent(current.totals.cancelRate, previous.totals.cancelRate),
        },
      },
    };
  }

  private async load(filter: ReportFilter, period: RevenuePeriod) {
    const grain = seriesGrain(period);
    const [series, outcomes] = await Promise.all([
      this.repository.revenueSeries(filter, grain),
      this.repository.orderOutcomes(filter, grain),
    ]);
    const grouped = groupRevenue(series, period);
    const totals = sumRevenue(grouped);
    return {
      rows: withOrderMetrics(grouped, outcomes, period),
      totals: {
        ...totals,
        averageOrderValue: totals.orders ? Math.round(totals.revenue / totals.orders) : 0,
        ...sumOutcomes(outcomes),
      },
    };
  }
}
