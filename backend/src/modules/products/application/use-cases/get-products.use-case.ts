import { Inject, Injectable } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';
import { ProductFilterDto } from '../../presentation/dtos/product-filter.dto';
import { PageOptionsDto } from '@core/common/pagination.dto';

@Injectable()
export class GetProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(
    filterOrOptions: ProductFilterDto | PageOptionsDto,
  ): Promise<{ items: ProductEntity[]; total: number }> {
    if (filterOrOptions instanceof ProductFilterDto || this.hasFilterCriteria(filterOrOptions)) {
      return this.productRepository.findFiltered(filterOrOptions as ProductFilterDto);
    }
    return this.productRepository.findAll(filterOrOptions);
  }

  private hasFilterCriteria(options: any): boolean {
    return (
      options != null &&
      (options.categoryId !== undefined ||
        options.brandId !== undefined ||
        options.minPrice !== undefined ||
        options.maxPrice !== undefined ||
        options.rating !== undefined ||
        options.tag !== undefined ||
        options.sortBy !== undefined)
    );
  }
}
