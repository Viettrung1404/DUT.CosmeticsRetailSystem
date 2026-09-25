import { Module } from '@nestjs/common';
import { BrandAdminController } from './presentation/controllers/brand-admin.controller';
import { GetBrandsUseCase } from './application/use-cases/get-brands.use-case';
import { GetBrandDetailUseCase } from './application/use-cases/get-brand-detail.use-case';
import { CreateBrandUseCase } from './application/use-cases/create-brand.use-case';
import { UpdateBrandUseCase } from './application/use-cases/update-brand.use-case';
import { DeleteBrandUseCase } from './application/use-cases/delete-brand.use-case';
import { BRAND_REPOSITORY } from './domain/repositories/brand.repository.interface';
import { PrismaBrandRepository } from './infrastructure/persistence/prisma-brand.repository';

@Module({
  controllers: [BrandAdminController],
  providers: [
    GetBrandsUseCase,
    GetBrandDetailUseCase,
    CreateBrandUseCase,
    UpdateBrandUseCase,
    DeleteBrandUseCase,
    {
      provide: BRAND_REPOSITORY,
      useClass: PrismaBrandRepository,
    },
  ],
  exports: [GetBrandsUseCase, GetBrandDetailUseCase],
})
export class BrandsModule {}
