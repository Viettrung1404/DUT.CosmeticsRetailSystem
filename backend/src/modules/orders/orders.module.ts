import { Module } from '@nestjs/common';
import { CustomerOrderController } from './presentation/controllers/order-customer.controller';
import { ORDER_REPOSITORY } from './domain/repositories/order.repository.interface';
import { PrismaOrderRepository } from './infrastructure/repositories/prisma-order.repository';
import { VARIANT_CATALOG_PROVIDER } from './application/ports/variant-catalog.provider';
import { PrismaVariantCatalogAdapter } from './infrastructure/adapters/prisma-variant-catalog.adapter';
import { PrismaStoreInventoryAdapter } from './infrastructure/adapters/prisma-store-inventory.adapter';
import { OrderPricingService } from './application/services/order-pricing.service';
import { StoreResolverService } from './application/services/store-resolver.service';
import { PreviewOrderUseCase } from './application/use-cases/preview-order.use-case';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetCustomerOrdersUseCase } from './application/use-cases/get-customer-orders.use-case';
import { GetOrderDetailUseCase } from './application/use-cases/get-order-detail.use-case';
import { CancelOrderUseCase } from './application/use-cases/cancel-order.use-case';
import { CancelExpiredOrdersUseCase } from './application/use-cases/cancel-expired-orders.use-case';
import { OrderExpiryScheduler } from './infrastructure/schedulers/order-expiry.scheduler';
import { CustomerContextService } from '../../core/services/customer-context.service';
import { CartModule } from '../cart/cart.module';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { OrderAdminController } from './presentation/controllers/order-admin.controller';
import { ADMIN_ORDER_REPOSITORY } from './domain/repositories/admin-order.repository.interface';
import { PrismaAdminOrderRepository } from './infrastructure/repositories/prisma-admin-order.repository';
import { GetAdminOrdersUseCase } from './application/use-cases/get-admin-orders.use-case';
import { AdminOrderAccessService } from './application/services/admin-order-access.service';
import { GetAdminOrderDetailUseCase } from './application/use-cases/get-admin-order-detail.use-case';
import { ConfirmAdminOrderUseCase } from './application/use-cases/confirm-admin-order.use-case';
import { UpdateAdminOrderStatusUseCase } from './application/use-cases/update-admin-order-status.use-case';

@Module({
  imports: [CartModule, PermissionsModule],
  controllers: [CustomerOrderController, OrderAdminController],
  providers: [
    CustomerContextService,
    OrderPricingService,
    PrismaStoreInventoryAdapter,
    {
      provide: StoreResolverService,
      useFactory: (adapter: PrismaStoreInventoryAdapter) => {
        return new StoreResolverService(adapter);
      },
      inject: [PrismaStoreInventoryAdapter],
    },
    {
      provide: ORDER_REPOSITORY,
      useClass: PrismaOrderRepository,
    },
    {
      provide: VARIANT_CATALOG_PROVIDER,
      useClass: PrismaVariantCatalogAdapter,
    },
    PreviewOrderUseCase,
    CreateOrderUseCase,
    GetCustomerOrdersUseCase,
    GetOrderDetailUseCase,
    CancelOrderUseCase,
    CancelExpiredOrdersUseCase,
    OrderExpiryScheduler,
    {
      provide: ADMIN_ORDER_REPOSITORY,
      useClass: PrismaAdminOrderRepository,
    },
    GetAdminOrdersUseCase,
    AdminOrderAccessService,
    GetAdminOrderDetailUseCase,
    ConfirmAdminOrderUseCase,
    UpdateAdminOrderStatusUseCase,
  ],
  exports: [
    ORDER_REPOSITORY,
    PreviewOrderUseCase,
    CreateOrderUseCase,
  ],
})
export class OrdersModule {}
