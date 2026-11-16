import { Module } from '@nestjs/common';
import { AsyncInfrastructureModule } from '@modules/async-infrastructure';
import { OmsModule } from '@modules/oms/oms.module';
import { FinanceModule } from '@modules/finance/finance.module';
import { PickingService } from './application/services/picking.service';
import { PackingService } from './application/services/packing.service';
import { HandoverService } from './application/services/handover.service';
import { AdminActionMatrixService } from './application/services/admin-action-matrix.service';
import { FulfillmentQueueService } from './application/services/fulfillment-queue.service';
import { AuditLogService } from '@core/services/audit-log.service';
import { AdminFulfillmentController } from './presentation/controllers/admin-fulfillment.controller';
import { AdminFulfillmentQueueController } from './presentation/controllers/admin-fulfillment-queue.controller';

@Module({
  imports: [AsyncInfrastructureModule, OmsModule, FinanceModule],
  controllers: [AdminFulfillmentController, AdminFulfillmentQueueController],
  providers: [
    PickingService,
    PackingService,
    HandoverService,
    AdminActionMatrixService,
    FulfillmentQueueService,
    AuditLogService,
  ],
  exports: [
    PickingService,
    PackingService,
    HandoverService,
    AdminActionMatrixService,
    FulfillmentQueueService,
    AuditLogService,
  ],
})
export class FulfillmentModule {}
