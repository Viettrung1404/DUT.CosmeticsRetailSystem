import { Module } from '@nestjs/common';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { PosSessionController } from './presentation/controllers/pos-session.controller';
import { PosSessionAdminController } from './presentation/controllers/pos-session-admin.controller';
import { PosProductController } from './presentation/controllers/pos-product.controller';
import { PosCustomerController } from './presentation/controllers/pos-customer.controller';
import { OpenPosSessionUseCase } from './application/use-cases/open-pos-session.use-case';
import { ClosePosSessionUseCase } from './application/use-cases/close-pos-session.use-case';
import { ReconcilePosSessionUseCase } from './application/use-cases/reconcile-pos-session.use-case';
import { GetCurrentPosSessionUseCase } from './application/use-cases/get-current-pos-session.use-case';
import { GetPosSessionsUseCase } from './application/use-cases/get-pos-sessions.use-case';
import { ScanPosProductUseCase } from './application/use-cases/scan-pos-product.use-case';
import { SearchPosProductsUseCase } from './application/use-cases/search-pos-products.use-case';
import { LookupPosCustomerUseCase } from './application/use-cases/lookup-pos-customer.use-case';
import { CreatePosCustomerUseCase } from './application/use-cases/create-pos-customer.use-case';
import { PosStoreAccessService } from './application/services/pos-store-access.service';
import { POS_SESSION_REPOSITORY } from './domain/repositories/pos-session.repository.interface';
import { POS_CATALOG_REPOSITORY } from './domain/repositories/pos-catalog.repository.interface';
import { POS_CUSTOMER_REPOSITORY } from './domain/repositories/pos-customer.repository.interface';
import { PrismaPosSessionRepository } from './infrastructure/persistence/prisma-pos-session.repository';
import { PrismaPosCatalogRepository } from './infrastructure/persistence/prisma-pos-catalog.repository';
import { PrismaPosCustomerRepository } from './infrastructure/persistence/prisma-pos-customer.repository';

@Module({
  imports: [PermissionsModule],
  controllers: [
    PosSessionController,
    PosSessionAdminController,
    PosProductController,
    PosCustomerController,
  ],
  providers: [
    OpenPosSessionUseCase,
    ClosePosSessionUseCase,
    ReconcilePosSessionUseCase,
    GetCurrentPosSessionUseCase,
    GetPosSessionsUseCase,
    ScanPosProductUseCase,
    SearchPosProductsUseCase,
    LookupPosCustomerUseCase,
    CreatePosCustomerUseCase,
    PosStoreAccessService,
    {
      provide: POS_SESSION_REPOSITORY,
      useClass: PrismaPosSessionRepository,
    },
    {
      provide: POS_CATALOG_REPOSITORY,
      useClass: PrismaPosCatalogRepository,
    },
    {
      provide: POS_CUSTOMER_REPOSITORY,
      useClass: PrismaPosCustomerRepository,
    },
  ],
})
export class PosModule {}
