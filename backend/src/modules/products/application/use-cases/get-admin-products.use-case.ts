import { Inject, Injectable } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';

export interface GetAdminProductsInput {
  page: number;
  limit: number;
  order: 'ASC' | 'DESC';
  search?: string;
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
}

@Injectable()
export class GetAdminProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  execute(input: GetAdminProductsInput): Promise<{ items: ProductEntity[]; total: number }> {
    return this.productRepository.findAllForAdmin({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      order: input.order === 'ASC' ? 'asc' : 'desc',
      search: input.search?.trim() || undefined,
      categoryId: input.categoryId,
      brandId: input.brandId,
      isActive: input.isActive,
    });
  }
}
