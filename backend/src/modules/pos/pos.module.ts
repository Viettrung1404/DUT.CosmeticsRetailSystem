import { Module } from '@nestjs/common';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { PosSessionController } from './presentation/controllers/pos-session.controller';
import { PosSessionAdminController } from './presentation/controllers/pos-session-admin.controller';
import { OpenPosSessionUseCase } from './application/use-cases/open-pos-session.use-case';
import { ClosePosSessionUseCase } from './application/use-cases/close-pos-session.use-case';
import { ReconcilePosSessionUseCase } from './application/use-cases/reconcile-pos-session.use-case';
import { GetCurrentPosSessionUseCase } from './application/use-cases/get-current-pos-session.use-case';
import { GetPosSessionsUseCase } from './application/use-cases/get-pos-sessions.use-case';
import { POS_SESSION_REPOSITORY } from './domain/repositories/pos-session.repository.interface';
import { PrismaPosSessionRepository } from './infrastructure/persistence/prisma-pos-session.repository';

@Module({
  imports: [PermissionsModule],
  controllers: [PosSessionController, PosSessionAdminController],
  providers: [
    OpenPosSessionUseCase,
    ClosePosSessionUseCase,
    ReconcilePosSessionUseCase,
    GetCurrentPosSessionUseCase,
    GetPosSessionsUseCase,
    {
      provide: POS_SESSION_REPOSITORY,
      useClass: PrismaPosSessionRepository,
    },
  ],
})
export class PosModule {}
