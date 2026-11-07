import { Module } from '@nestjs/common';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { ExportReportUseCase } from './application/use-cases/export-report.use-case';
import { GetCustomerSegmentsUseCase } from './application/use-cases/get-customer-segments.use-case';
import { GetDashboardUseCase } from './application/use-cases/get-dashboard.use-case';
import { GetForecastUseCase } from './application/use-cases/get-forecast.use-case';
import { GetHrReportUseCase } from './application/use-cases/get-hr-report.use-case';
import { GetProductReportUseCase } from './application/use-cases/get-product-report.use-case';
import { GetRevenueReportUseCase } from './application/use-cases/get-revenue-report.use-case';
import { GetRfmReportUseCase } from './application/use-cases/get-rfm-report.use-case';
import { GetStaffKpiUseCase } from './application/use-cases/get-staff-kpi.use-case';
import { GetTrendsUseCase } from './application/use-cases/get-trends.use-case';
import { ReportScopeService } from './application/services/report-scope.service';
import { RfmService } from './application/services/rfm.service';
import { REPORT_FILE_RENDERER } from './application/ports/report-file-renderer.port';
import { REPORT_REPOSITORY } from './domain/repositories/report.repository.interface';
import { ReportFileRenderer } from './infrastructure/adapters/report-file.renderer';
import { PrismaReportRepository } from './infrastructure/persistence/prisma-report.repository';
import { ReportAdminController } from './presentation/controllers/report-admin.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [ReportAdminController],
  providers: [
    ReportScopeService,
    RfmService,
    GetDashboardUseCase,
    GetRevenueReportUseCase,
    GetProductReportUseCase,
    GetStaffKpiUseCase,
    ExportReportUseCase,
    GetRfmReportUseCase,
    GetCustomerSegmentsUseCase,
    GetTrendsUseCase,
    GetForecastUseCase,
    GetHrReportUseCase,
    { provide: REPORT_REPOSITORY, useClass: PrismaReportRepository },
    { provide: REPORT_FILE_RENDERER, useClass: ReportFileRenderer },
  ],
  exports: [RfmService],
})
export class ReportsModule {}
