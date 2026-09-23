import { Inject, Injectable } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';
import { PageOptionsDto } from '@core/common/pagination.dto';

@Injectable()
export class SearchProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(
    query: string,
    options: PageOptionsDto,
  ): Promise<{ items: ProductEntity[]; total: number }> {
    if (!query || query.trim().length === 0) {
      return { items: [], total: 0 };
    }
    return this.productRepository.search(query.trim(), options);
  }
}
