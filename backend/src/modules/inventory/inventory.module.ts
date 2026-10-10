import { Module } from '@nestjs/common';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { InventoryAdminController } from './presentation/controllers/inventory-admin.controller';
import { InventoryPosController } from './presentation/controllers/inventory-pos.controller';
import { GetInventoryUseCase } from './application/use-cases/get-inventory.use-case';
import { ReceivePurchaseOrderUseCase } from './application/use-cases/receive-purchase-order.use-case';
import { AdjustInventoryUseCase } from './application/use-cases/adjust-inventory.use-case';
import { INVENTORY_REPOSITORY } from './domain/repositories/inventory.repository.interface';
import { PrismaInventoryRepository } from './infrastructure/persistence/prisma-inventory.repository';

@Module({
  imports: [PermissionsModule],
  controllers: [InventoryAdminController, InventoryPosController],
  providers: [
    GetInventoryUseCase,
    ReceivePurchaseOrderUseCase,
    AdjustInventoryUseCase,
    {
      provide: INVENTORY_REPOSITORY,
      useClass: PrismaInventoryRepository,
    },
  ],
})
export class InventoryModule {}
