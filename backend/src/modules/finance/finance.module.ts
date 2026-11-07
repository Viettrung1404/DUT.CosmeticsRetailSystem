import { Module } from '@nestjs/common';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { FinanceAdminController } from './presentation/controllers/finance-admin.controller';
import { FinanceUseCase } from './application/use-cases/finance.use-case';
import { FINANCE_REPOSITORY } from './domain/repositories/finance.repository.interface';
import { PrismaFinanceRepository } from './infrastructure/persistence/prisma-finance.repository';

@Module({
  imports: [PermissionsModule],
  controllers: [FinanceAdminController],
  providers: [FinanceUseCase, { provide: FINANCE_REPOSITORY, useClass: PrismaFinanceRepository }],
})
export class FinanceModule {}
