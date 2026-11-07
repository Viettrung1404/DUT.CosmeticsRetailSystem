import { Inject, Injectable } from '@nestjs/common';
import {
  IReportRepository,
  REPORT_REPOSITORY,
  ReportFilter,
} from '../../domain/repositories/report.repository.interface';
import { RfmCustomer, addMonths, computeRfm, toVnDay, vnDayStart } from '../utils/report-calculations';
import { ReportScopeService } from './report-scope.service';

export interface RfmResult {
  windowFrom: string;
  windowTo: string;
  customers: RfmCustomer[];
}

@Injectable()
export class RfmService {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly repository: IReportRepository,
    private readonly scope: ReportScopeService,
  ) {}

  // Khung 12 tháng gần nhất, tính khi gọi
  async compute(userId: string, storeId?: string, now = new Date()): Promise<RfmResult> {
    const base = await this.scope.filter(userId, { from: undefined, to: undefined, storeId }, now);
    return this.run(base, now);
  }

  // Toàn chuỗi, không theo phạm vi người gọi: dùng khi gửi chiến dịch marketing
  computeAllStores(now = new Date()): Promise<RfmResult> {
    return this.run({}, now);
  }

  private async run(base: Pick<ReportFilter, 'storeIds' | 'employeeId'>, now: Date): Promise<RfmResult> {
    const toDay = toVnDay(now);
    const fromDay = `${addMonths(toDay.slice(0, 7), -12)}${toDay.slice(7)}`;
    const rows = await this.repository.customerActivity({
      storeIds: base.storeIds,
      employeeId: base.employeeId,
      from: vnDayStart(fromDay),
      to: new Date(now.getTime()),
    });
    return { windowFrom: fromDay, windowTo: toDay, customers: computeRfm(rows, now) };
  }
}
