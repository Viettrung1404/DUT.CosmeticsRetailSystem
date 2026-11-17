import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { AsyncInfrastructureModule } from '../async-infrastructure/async-infrastructure.module';
import { RmaEligibilityService } from './application/services/rma-eligibility.service';
import { SubmitReturnRequestUseCase } from './application/use-cases/submit-return-request.use-case';
import { CustomerReturnController } from './presentation/controllers/customer-return.controller';

@Module({
  imports: [PrismaModule, AsyncInfrastructureModule],
  controllers: [CustomerReturnController],
  providers: [RmaEligibilityService, SubmitReturnRequestUseCase],
  exports: [RmaEligibilityService, SubmitReturnRequestUseCase],
})
export class ReturnsModule {}
