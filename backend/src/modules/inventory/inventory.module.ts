import { Module } from '@nestjs/common';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { InventoryAdminController } from './presentation/controllers/inventory-admin.controller';
import { InventoryPosController } from './presentation/controllers/inventory-pos.controller';
import { TransferAdminController } from './presentation/controllers/transfer-admin.controller';
import { StocktakeAdminController } from './presentation/controllers/stocktake-admin.controller';
import { BatchAdminController } from './presentation/controllers/batch-admin.controller';
import { GetInventoryUseCase } from './application/use-cases/get-inventory.use-case';
import { ReceivePurchaseOrderUseCase } from './application/use-cases/receive-purchase-order.use-case';
import { AdjustInventoryUseCase } from './application/use-cases/adjust-inventory.use-case';
import { GetAdjustmentsUseCase } from './application/use-cases/get-adjustments.use-case';
import { ReviewAdjustmentUseCase } from './application/use-cases/review-adjustment.use-case';
import { CancelAdjustmentUseCase } from './application/use-cases/cancel-adjustment.use-case';
import { UpdateInventoryThresholdsUseCase } from './application/use-cases/update-inventory-thresholds.use-case';
import { CreateTransferUseCase } from './application/use-cases/create-transfer.use-case';
import { UpdateTransferDraftUseCase } from './application/use-cases/update-transfer-draft.use-case';
import { ChangeTransferStatusUseCase } from './application/use-cases/change-transfer-status.use-case';
import { ApproveTransferUseCase } from './application/use-cases/approve-transfer.use-case';
import { ShipTransferUseCase } from './application/use-cases/ship-transfer.use-case';
import { ReceiveTransferUseCase } from './application/use-cases/receive-transfer.use-case';
import { GetTransfersUseCase } from './application/use-cases/get-transfers.use-case';
import { StocktakeWorkflowUseCase } from './application/use-cases/stocktake-workflow.use-case';
import { ManageBatchesUseCase } from './application/use-cases/manage-batches.use-case';
import { SendInventoryAlertsUseCase } from './application/use-cases/send-inventory-alerts.use-case';
import { TransferAccessService } from './application/services/transfer-access.service';
import { INVENTORY_REPOSITORY } from './domain/repositories/inventory.repository.interface';
import { ADJUSTMENT_REPOSITORY } from './domain/repositories/adjustment.repository.interface';
import { TRANSFER_REPOSITORY } from './domain/repositories/transfer.repository.interface';
import { STOCKTAKE_REPOSITORY } from './domain/repositories/stocktake.repository.interface';
import { BATCH_REPOSITORY } from './domain/repositories/batch.repository.interface';
import { INVENTORY_ALERT_REPOSITORY } from './domain/repositories/inventory-alert.repository.interface';
import { PrismaInventoryRepository } from './infrastructure/persistence/prisma-inventory.repository';
import { PrismaAdjustmentRepository } from './infrastructure/persistence/prisma-adjustment.repository';
import { PrismaTransferRepository } from './infrastructure/persistence/prisma-transfer.repository';
import { PrismaStocktakeRepository } from './infrastructure/persistence/prisma-stocktake.repository';
import { PrismaBatchRepository } from './infrastructure/persistence/prisma-batch.repository';
import { PrismaInventoryAlertRepository } from './infrastructure/persistence/prisma-inventory-alert.repository';
import { InventoryAlertScheduler } from './infrastructure/schedulers/inventory-alert.scheduler';

@Module({
  imports: [PermissionsModule],
  controllers: [
    InventoryAdminController,
    InventoryPosController,
    TransferAdminController,
    StocktakeAdminController,
    BatchAdminController,
  ],
  providers: [
    GetInventoryUseCase,
    ReceivePurchaseOrderUseCase,
    AdjustInventoryUseCase,
    GetAdjustmentsUseCase,
    ReviewAdjustmentUseCase,
    CancelAdjustmentUseCase,
    UpdateInventoryThresholdsUseCase,
    TransferAccessService,
    CreateTransferUseCase,
    UpdateTransferDraftUseCase,
    ChangeTransferStatusUseCase,
    ApproveTransferUseCase,
    ShipTransferUseCase,
    ReceiveTransferUseCase,
    GetTransfersUseCase,
    StocktakeWorkflowUseCase,
    ManageBatchesUseCase,
    SendInventoryAlertsUseCase,
    InventoryAlertScheduler,
    { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
    { provide: ADJUSTMENT_REPOSITORY, useClass: PrismaAdjustmentRepository },
    { provide: TRANSFER_REPOSITORY, useClass: PrismaTransferRepository },
    { provide: STOCKTAKE_REPOSITORY, useClass: PrismaStocktakeRepository },
    { provide: BATCH_REPOSITORY, useClass: PrismaBatchRepository },
    { provide: INVENTORY_ALERT_REPOSITORY, useClass: PrismaInventoryAlertRepository },
  ],
})
export class InventoryModule {}
