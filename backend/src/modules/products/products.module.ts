import { Module } from '@nestjs/common';
import { ProductCustomerController } from './presentation/controllers/product-customer.controller';
import { ProductAdminController } from './presentation/controllers/product-admin.controller';
import { GetProductsUseCase } from './application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from './application/use-cases/get-product-detail.use-case';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { DeleteProductUseCase } from './application/use-cases/delete-product.use-case';
import { PRODUCT_REPOSITORY } from './domain/repositories/product.repository.interface';
import { PrismaProductRepository } from './infrastructure/persistence/prisma-product.repository';

@Module({
  controllers: [ProductCustomerController, ProductAdminController],
  providers: [
    // Use Cases
    GetProductsUseCase,
    GetProductDetailUseCase,
    CreateProductUseCase,
    DeleteProductUseCase,

    // Repository Port -> Adapter Mapping
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
  ],
  exports: [
    GetProductsUseCase,
    GetProductDetailUseCase,
    CreateProductUseCase,
    DeleteProductUseCase,
  ],
})
export class ProductsModule {}

