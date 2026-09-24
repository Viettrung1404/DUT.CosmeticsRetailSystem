import { Module } from '@nestjs/common';
import { CacheModule } from '@core/cache/cache.module';
import { CategoryCustomerController } from './presentation/controllers/category-customer.controller';
import { CategoryAdminController } from './presentation/controllers/category-admin.controller';
import { GetCategoryTreeUseCase } from './application/use-cases/get-category-tree.use-case';
import { GetCategoriesUseCase } from './application/use-cases/get-categories.use-case';
import { GetCategoryTreeAdminUseCase } from './application/use-cases/get-category-tree-admin.use-case';
import { GetCategoryDetailUseCase } from './application/use-cases/get-category-detail.use-case';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from './application/use-cases/delete-category.use-case';
import { CATEGORY_REPOSITORY } from './domain/repositories/category.repository.interface';
import { PrismaCategoryRepository } from './infrastructure/persistence/prisma-category.repository';

@Module({
  imports: [CacheModule],
  controllers: [CategoryCustomerController, CategoryAdminController],
  providers: [
    GetCategoryTreeUseCase,
    GetCategoriesUseCase,
    GetCategoryTreeAdminUseCase,
    GetCategoryDetailUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: PrismaCategoryRepository,
    },
  ],
  exports: [CATEGORY_REPOSITORY, GetCategoryTreeUseCase],
})
export class CategoriesModule {}
