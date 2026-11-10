import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { CustomerCommerceModule } from '@modules/customer-commerce/customer-commerce.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { CARRIER_GATEWAYS } from './domain/ports/carrier-gateway.port';
import { SHIPMENT_REPOSITORY } from './domain/repositories/shipment.repository.interface';
import { MockCarrierAdapter } from './infrastructure/adapters/mock-carrier.adapter';
import { PrismaShipmentRepository } from './infrastructure/persistence/prisma-shipment.repository';
import { CarrierRegistry } from './application/services/carrier-registry.service';
import { ShipmentAccessService } from './application/services/shipment-access.service';
import { CreateAdminShipmentUseCase } from './application/use-cases/create-admin-shipment.use-case';
import { ListAdminShipmentsUseCase } from './application/use-cases/list-admin-shipments.use-case';
import { GetAdminShipmentDetailUseCase } from './application/use-cases/get-admin-shipment-detail.use-case';
import { CancelAdminShipmentUseCase } from './application/use-cases/cancel-admin-shipment.use-case';
import { ProcessCarrierEventUseCase } from './application/use-cases/process-carrier-event.use-case';
import { SimulateAdminShipmentUseCase } from './application/use-cases/simulate-admin-shipment.use-case';
import { ReceiveReturnedShipmentUseCase } from './application/use-cases/receive-returned-shipment.use-case';
import { ShipmentAdminController } from './presentation/controllers/shipment-admin.controller';
import { ShipmentWebhookController } from './presentation/controllers/shipment-webhook.controller';

@Module({
  imports: [PrismaModule, PermissionsModule, CustomerCommerceModule, OrdersModule],
  controllers: [ShipmentAdminController, ShipmentWebhookController],
  providers: [
    { provide: SHIPMENT_REPOSITORY, useClass: PrismaShipmentRepository },
    MockCarrierAdapter,
    {
      // Thêm hãng mới: viết adapter rồi thêm vào mảng này
      provide: CARRIER_GATEWAYS,
      useFactory: (mock: MockCarrierAdapter) => [mock],
      inject: [MockCarrierAdapter],
    },
    CarrierRegistry,
    ShipmentAccessService,
    CreateAdminShipmentUseCase,
    ListAdminShipmentsUseCase,
    GetAdminShipmentDetailUseCase,
    CancelAdminShipmentUseCase,
    ProcessCarrierEventUseCase,
    SimulateAdminShipmentUseCase,
    ReceiveReturnedShipmentUseCase,
  ],
})
export class ShipmentsModule {}
