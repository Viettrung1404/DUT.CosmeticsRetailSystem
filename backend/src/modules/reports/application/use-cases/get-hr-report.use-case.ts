import { Inject, Injectable } from '@nestjs/common';
import { GetUserEffectivePermissionsUseCase } from '@modules/permissions/application/use-cases/get-user-effective-permissions.use-case';
import {
  IReportRepository,
  REPORT_REPOSITORY,
} from '../../domain/repositories/report.repository.interface';
import { ReportScopeService } from '../services/report-scope.service';
import { addDays, resolveRange } from '../utils/report-calculations';

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

@Injectable()
export class GetHrReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly repository: IReportRepository,
    private readonly scope: ReportScopeService,
    private readonly getPermissions: GetUserEffectivePermissionsUseCase,
  ) {}

  // Tỷ lệ nghỉ việc = nhân viên RESIGNED / tổng hồ sơ hiện có (bảng employees chưa lưu ngày nghỉ)
  async execute(userId: string, input: { storeId?: string; from?: string; to?: string }) {
    const range = resolveRange(new Date(), input.from, input.to);
    const storeIds = await this.scope.stores(userId, input.storeId);
    const permissions = await this.getPermissions.execute(userId);

    const summary = await this.repository.hrSummary(storeIds, range.fromDay, addDays(range.toDay, 1));
    const total = summary.byStatus.reduce((s, r) => s + r.count, 0);
    const count = (status: string) => summary.byStatus.find((r) => r.status === status)?.count ?? 0;
    const attendance = (status: string) => summary.attendance.find((r) => r.status === status)?.count ?? 0;
    const present = attendance('PRESENT');
    const late = attendance('LATE');

    // KPI bán hàng chi tiết chỉ kèm theo khi người xem có quyền xem hiệu suất nhân viên
    const staffKpi = permissions.includes('REPORT_STAFF_PERF')
      ? (await this.repository.staffPerformance({ from: range.from, to: range.to, storeIds })).map((r) => ({
          ...r,
          averageOrderValue: r.orders ? Math.round(r.revenue / r.orders) : 0,
        }))
      : null;

    return {
      from: range.fromDay,
      to: range.toDay,
      totalEmployees: total,
      activeEmployees: count('ACTIVE'),
      onLeaveEmployees: count('ON_LEAVE'),
      resignedEmployees: count('RESIGNED'),
      resignationRatePercent: pct(count('RESIGNED'), total),
      byDepartment: summary.byDepartment,
      byStore: summary.byStore,
      attendance: {
        present,
        late,
        absent: attendance('ABSENT'),
        lateRatePercent: pct(late, present + late),
      },
      staffKpi,
    };
  }
}
