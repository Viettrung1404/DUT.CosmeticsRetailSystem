import { Inject, Injectable } from '@nestjs/common';
import {
  IReportRepository,
  REPORT_REPOSITORY,
} from '../../domain/repositories/report.repository.interface';
import { ReportScopeInput, ReportScopeService } from '../services/report-scope.service';

@Injectable()
export class GetStaffKpiUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly repository: IReportRepository,
    private readonly scope: ReportScopeService,
  ) {}

  async execute(userId: string, input: ReportScopeInput) {
    const filter = await this.scope.filter(userId, input);
    const rows = await this.repository.staffPerformance(filter);
    return {
      from: filter.fromDay,
      to: filter.toDay,
      rows: rows.map((r) => ({
        ...r,
        netRevenue: Math.round((r.revenue - r.returns) * 100) / 100,
        averageOrderValue: r.orders ? Math.round(r.revenue / r.orders) : 0,
      })),
    };
  }
}
