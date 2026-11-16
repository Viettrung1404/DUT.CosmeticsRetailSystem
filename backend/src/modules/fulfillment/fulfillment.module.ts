import { Module } from '@nestjs/common';
import { AsyncInfrastructureModule } from '@modules/async-infrastructure';
import { OmsModule } from '@modules/oms/oms.module';
import { PickingService } from './application/services/picking.service';
import { PackingService } from './application/services/packing.service';
import { HandoverService } from './application/services/handover.service';
import { AdminFulfillmentController } from './presentation/controllers/admin-fulfillment.controller';

@Module({
  imports: [AsyncInfrastructureModule, OmsModule],
  controllers: [AdminFulfillmentController],
  providers: [PickingService, PackingService, HandoverService],
  exports: [PickingService, PackingService, HandoverService],
})
export class FulfillmentModule {}


