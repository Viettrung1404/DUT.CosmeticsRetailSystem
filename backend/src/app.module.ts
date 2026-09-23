import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { CacheModule } from '@core/cache/cache.module';
import { ProductsModule } from '@modules/products/products.module';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { BrandsModule } from '@modules/brands/brands.module';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { PermissionGuard } from '@core/guards/permission.guard';
import { CategoriesModule } from '@modules/categories/categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    AuthModule,
    CacheModule,
    ProductsModule,
    PermissionsModule,
    CategoriesModule,
    BrandsModule,
  ],
  providers: [
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

