import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { AsyncInfrastructureModule } from '../async-infrastructure/async-infrastructure.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { InventoryModule } from '../inventory/inventory.module';
import { RmaEligibilityService } from './application/services/rma-eligibility.service';
import { SubmitReturnRequestUseCase } from './application/use-cases/submit-return-request.use-case';
import { ReceiveStoreDropoffUseCase } from './application/use-cases/receive-store-dropoff.use-case';
import { ReverseShippingService } from './application/services/reverse-shipping.service';
import { ReceiveWarehouseReturnUseCase } from './application/use-cases/receive-warehouse-return.use-case';
import { RmaStatusAggregator } from './application/services/rma-status-aggregator';
import { InventoryDispositionService } from './application/services/inventory-disposition.service';
import { ReturnInspectionService } from './application/services/return-inspection.service';
import { RefundCalculatorService } from './application/services/refund-calculator.service';
import { RefundExecutionService } from './application/services/refund-execution.service';
import { PaymentRefundGatewayAdapter } from './infrastructure/adapters/payment-refund-gateway.adapter';
import { PaymentRefundGatewayService } from './application/services/payment-refund-gateway.service';
import { ExchangeSettlementService } from './application/services/exchange-settlement.service';
import { RmaActionMatrixService } from './application/services/rma-action-matrix.service';
import { RmaQueueService } from './application/services/rma-queue.service';
import { CustomerReturnController } from './presentation/controllers/customer-return.controller';
import { AdminReturnController } from './presentation/controllers/admin-return.controller';
import { AdminRmaQueueController } from './presentation/controllers/admin-rma-queue.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AsyncInfrastructureModule,
    PermissionsModule,
    InventoryModule,
  ],
  controllers: [
    CustomerReturnController,
    AdminReturnController,
    AdminRmaQueueController,
  ],
  providers: [
    RmaEligibilityService,
    SubmitReturnRequestUseCase,
    ReceiveStoreDropoffUseCase,
    ReverseShippingService,
    ReceiveWarehouseReturnUseCase,
    RmaStatusAggregator,
    InventoryDispositionService,
    ReturnInspectionService,
    RefundCalculatorService,
    RefundExecutionService,
    PaymentRefundGatewayAdapter,
    PaymentRefundGatewayService,
    ExchangeSettlementService,
    RmaActionMatrixService,
    RmaQueueService,
  ],
  exports: [
    RmaEligibilityService,
    SubmitReturnRequestUseCase,
    ReceiveStoreDropoffUseCase,
    ReverseShippingService,
    ReceiveWarehouseReturnUseCase,
    RmaStatusAggregator,
    InventoryDispositionService,
    ReturnInspectionService,
    RefundCalculatorService,
    RefundExecutionService,
    PaymentRefundGatewayAdapter,
    PaymentRefundGatewayService,
    ExchangeSettlementService,
    RmaActionMatrixService,
    RmaQueueService,
  ],
})
export class ReturnsModule {}
