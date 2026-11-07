import { Inject, Injectable } from '@nestjs/common';
import {
  IReportRepository,
  REPORT_REPOSITORY,
} from '../../domain/repositories/report.repository.interface';
import { ReportScopeService } from '../services/report-scope.service';
import {
  addMonths,
  groupRevenue,
  linearWithInterval,
  smaWithInterval,
  toVnDay,
  vnDayStart,
} from '../utils/report-calculations';

export const HISTORY_MONTHS = 12;
export const SMA_WINDOW = 3;

export type ForecastMethod = 'sma' | 'linear';

@Injectable()
export class GetForecastUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly repository: IReportRepository,
    private readonly scope: ReportScopeService,
  ) {}

  // Lịch sử là 12 tháng trọn vẹn trước tháng hiện tại (tháng đang chạy chưa đủ nên bỏ ra)
  async execute(userId: string, input: { months?: number; storeId?: string; method?: ForecastMethod }) {
    const months = input.months ?? 3;
    const method = input.method ?? 'sma';
    const now = new Date();
    const currentMonth = toVnDay(now).slice(0, 7);
    const firstMonth = addMonths(currentMonth, -HISTORY_MONTHS);
    const base = await this.scope.filter(userId, { storeId: input.storeId }, now);
    const rows = groupRevenue(
      await this.repository.revenueSeries(
        { ...base, from: vnDayStart(`${firstMonth}-01`), to: vnDayStart(`${currentMonth}-01`) },
        'month',
      ),
      'month',
    );
    const byMonth = new Map(rows.map((r) => [r.period, r.netRevenue]));
    const history = Array.from({ length: HISTORY_MONTHS }, (_, i) => {
      const period = addMonths(firstMonth, i);
      return { period, revenue: byMonth.get(period) ?? 0 };
    });
    const revenues = history.map((h) => h.revenue);
    const points =
      method === 'linear'
        ? linearWithInterval(revenues, months)
        : smaWithInterval(revenues, months, SMA_WINDOW);
    return {
      method,
      methodLabel: method === 'linear' ? 'Hồi quy tuyến tính' : `Trung bình trượt ${SMA_WINDOW} tháng`,
      confidenceLevel: 95,
      history,
      forecast: points.map((point, i) => ({ period: addMonths(currentMonth, i), ...point })),
    };
  }
}
