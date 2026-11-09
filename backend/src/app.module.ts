import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DistributedThrottlerStorage } from '@core/cache/distributed-throttler.storage';
import { validateRuntimeConfig } from '@core/config/runtime-config';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { CacheModule } from '@core/cache/cache.module';
import { ProductsModule } from '@modules/products/products.module';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { BrandsModule } from '@modules/brands/brands.module';
import { PosModule } from '@modules/pos/pos.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { PermissionGuard } from '@core/guards/permission.guard';
import { CategoriesModule } from '@modules/categories/categories.module';
import { UploadsModule } from '@modules/uploads/uploads.module';
import { CartModule } from '@modules/cart/cart.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { HrModule } from '@modules/hr/hr.module';
import { SuppliersModule } from '@modules/suppliers/suppliers.module';
import { FinanceModule } from '@modules/finance/finance.module';
import { ReportsModule } from '@modules/reports/reports.module';
import { MarketingModule } from '@modules/marketing/marketing.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CustomerCommerceModule } from '@modules/customer-commerce/customer-commerce.module';
import { SeoModule } from '@modules/seo/seo.module';
import { ReturnsModule } from '@modules/returns/returns.module';
import { ShipmentsModule } from '@modules/shipments/shipments.module';
import { HealthModule } from '@core/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateRuntimeConfig,
    }),
    ScheduleModule.forRoot(),
    {
      ...ThrottlerModule.forRootAsync({
        imports: [CacheModule],
        inject: [DistributedThrottlerStorage],
        useFactory: (storage: DistributedThrottlerStorage) => ({
          throttlers: [{ ttl: 60000, limit: 100 }],
          storage,
        }),
      }),
      global: true,
    },
    PrismaModule,
    AuthModule,
    UsersModule,
    UploadsModule,
    CacheModule,
    PosModule,
    InventoryModule,
    ProductsModule,
    PermissionsModule,
    CategoriesModule,
    BrandsModule,
    NotificationsModule,
    CartModule,
    CustomersModule,
    OrdersModule,
    PaymentsModule,
    CustomerCommerceModule,
    SeoModule,
    ReturnsModule,
    ShipmentsModule,
    HealthModule,
    HrModule,
    SuppliersModule,
    FinanceModule,
    ReportsModule,
    MarketingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
