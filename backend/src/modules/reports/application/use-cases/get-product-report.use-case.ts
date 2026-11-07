import { Inject, Injectable } from '@nestjs/common';
import {
  IReportRepository,
  REPORT_REPOSITORY,
} from '../../domain/repositories/report.repository.interface';
import { ReportScopeInput, ReportScopeService } from '../services/report-scope.service';
import { DAY_MS } from '../utils/report-calculations';

export const SLOW_MOVER_DAYS = 30;

@Injectable()
export class GetProductReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly repository: IReportRepository,
    private readonly scope: ReportScopeService,
  ) {}

  // Bán chậm: còn tồn nhưng không bán trong 30 ngày gần nhất, không phụ thuộc khoảng ngày chọn
  async execute(userId: string, input: ReportScopeInput & { limit?: number; categoryId?: string }) {
    const limit = input.limit ?? 10;
    const filter = { ...(await this.scope.filter(userId, input)), categoryId: input.categoryId };
    const since = new Date(Date.now() - SLOW_MOVER_DAYS * DAY_MS);
    const [bestSellers, slowMovers, byCategory] = await Promise.all([
      this.repository.productSales(filter, limit),
      this.repository.slowMovers(filter.storeIds, since, limit, input.categoryId),
      this.repository.categoryRevenue(filter),
    ]);
    return {
      from: filter.fromDay,
      to: filter.toDay,
      bestSellers: bestSellers.map((p) => ({ ...p, grossProfit: Math.round((p.revenue - p.cost) * 100) / 100 })),
      slowMovers,
      slowMoverDays: SLOW_MOVER_DAYS,
      byCategory,
    };
  }
}
