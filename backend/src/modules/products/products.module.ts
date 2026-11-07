import { Module } from '@nestjs/common';
import { PublicCatalogService } from './application/services/public-catalog.service';
import { CatalogIndexWorker } from './infrastructure/search/catalog-index.worker';
import { CustomerCommerceModule } from '@modules/customer-commerce/customer-commerce.module';
import { ProductCustomerController } from './presentation/controllers/product-customer.controller';
import { ProductImportAdminController } from './presentation/controllers/product-import-admin.controller';
import { ProductTagAdminController } from './presentation/controllers/product-tag-admin.controller';
import { ImportProductsUseCase } from './application/use-cases/import-products.use-case';
import { ListProductTagsUseCase } from './application/use-cases/list-product-tags.use-case';
import { PRODUCT_IMPORT_REPOSITORY } from './domain/repositories/product-import.repository.interface';
import { PRODUCT_TAG_REPOSITORY } from './domain/repositories/product-tag.repository.interface';
import { PrismaProductImportRepository } from './infrastructure/persistence/prisma-product-import.repository';
import { PrismaProductTagRepository } from './infrastructure/persistence/prisma-product-tag.repository';
import { ProductAdminController } from './presentation/controllers/product-admin.controller';
import { ProductVariantAdminController } from './presentation/controllers/product-variant-admin.controller';
import { GetProductsUseCase } from './application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from './application/use-cases/get-product-detail.use-case';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { DeleteProductUseCase } from './application/use-cases/delete-product.use-case';
import { SearchProductsUseCase } from './application/use-cases/search-products.use-case';
import { SuggestProductsUseCase } from './application/use-cases/suggest-products.use-case';
import { GetRelatedProductsUseCase } from './application/use-cases/get-related-products.use-case';
import { GetAdminProductsUseCase } from './application/use-cases/get-admin-products.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { GetProductVariantsUseCase } from './application/use-cases/get-product-variants.use-case';
import { CreateProductVariantUseCase } from './application/use-cases/create-product-variant.use-case';
import { UpdateProductVariantUseCase } from './application/use-cases/update-product-variant.use-case';
import { DeleteProductVariantUseCase } from './application/use-cases/delete-product-variant.use-case';
import { PRODUCT_VARIANT_REPOSITORY } from './domain/repositories/product-variant.repository.interface';
import { PrismaProductVariantRepository } from './infrastructure/persistence/prisma-product-variant.repository';
import { PRODUCT_REPOSITORY } from './domain/repositories/product.repository.interface';
import { PrismaProductRepository } from './infrastructure/persistence/prisma-product.repository';
import { ElasticsearchProductService } from './infrastructure/search/elasticsearch-product.service';
import { ProductSearchSyncService } from './infrastructure/search/product-search-sync.service';

@Module({
  imports: [CustomerCommerceModule],
  controllers: [
    ProductCustomerController,
    ProductImportAdminController,
    ProductTagAdminController,
    ProductAdminController,
    ProductVariantAdminController,
  ],
  providers: [
    PublicCatalogService,
    CatalogIndexWorker,
    // Use Cases
    GetProductsUseCase,
    GetProductDetailUseCase,
    CreateProductUseCase,
    DeleteProductUseCase,
    SearchProductsUseCase,
    SuggestProductsUseCase,
    GetRelatedProductsUseCase,
    GetAdminProductsUseCase,
    UpdateProductUseCase,
    GetProductVariantsUseCase,
    CreateProductVariantUseCase,
    UpdateProductVariantUseCase,
    DeleteProductVariantUseCase,
    ImportProductsUseCase,
    ListProductTagsUseCase,

    // Search Engine
    ElasticsearchProductService,
    ProductSearchSyncService,

    // Repository Port -> Adapter Mapping
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
    {
      provide: PRODUCT_VARIANT_REPOSITORY,
      useClass: PrismaProductVariantRepository,
    },
    { provide: PRODUCT_IMPORT_REPOSITORY, useClass: PrismaProductImportRepository },
    { provide: PRODUCT_TAG_REPOSITORY, useClass: PrismaProductTagRepository },
  ],
  exports: [
    PRODUCT_REPOSITORY,
    GetProductsUseCase,
    GetProductDetailUseCase,
    CreateProductUseCase,
    DeleteProductUseCase,
    SearchProductsUseCase,
    SuggestProductsUseCase,
    GetRelatedProductsUseCase,
    ElasticsearchProductService,
  ],
})
export class ProductsModule {}
