import { Module } from '@nestjs/common';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { AsyncInfrastructureModule } from '@modules/async-infrastructure';
import { FinanceAdminController } from './presentation/controllers/finance-admin.controller';
import { AdminCodController } from './presentation/controllers/admin-cod.controller';
import { FinanceUseCase } from './application/use-cases/finance.use-case';
import { FINANCE_REPOSITORY } from './domain/repositories/finance.repository.interface';
import { PrismaFinanceRepository } from './infrastructure/persistence/prisma-finance.repository';
import { CodManagementService } from './application/services/cod-management.service';
import { CodReconciliationService } from './application/services/cod-reconciliation.service';

@Module({
  imports: [PermissionsModule, AsyncInfrastructureModule],
  controllers: [FinanceAdminController, AdminCodController],
  providers: [
    FinanceUseCase,
    CodManagementService,
    CodReconciliationService,
    { provide: FINANCE_REPOSITORY, useClass: PrismaFinanceRepository },
  ],
  exports: [FinanceUseCase, CodManagementService, CodReconciliationService],
})
export class FinanceModule {}
