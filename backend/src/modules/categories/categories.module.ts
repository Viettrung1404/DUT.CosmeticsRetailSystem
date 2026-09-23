import { Module } from '@nestjs/common';
import { CacheModule } from '@core/cache/cache.module';
import { CategoryCustomerController } from './presentation/controllers/category-customer.controller';
import { GetCategoryTreeUseCase } from './application/use-cases/get-category-tree.use-case';
import { CATEGORY_REPOSITORY } from './domain/repositories/category.repository.interface';
import { PrismaCategoryRepository } from './infrastructure/persistence/prisma-category.repository';

@Module({
  imports: [CacheModule],
  controllers: [CategoryCustomerController],
  providers: [
    GetCategoryTreeUseCase,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: PrismaCategoryRepository,
    },
  ],
  exports: [CATEGORY_REPOSITORY, GetCategoryTreeUseCase],
})
export class CategoriesModule {}
