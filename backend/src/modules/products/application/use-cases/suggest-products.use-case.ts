import { Inject, Injectable } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
  ProductSuggestionItem,
} from '../../domain/repositories/product.repository.interface';

@Injectable()
export class SuggestProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(query: string, limit = 8): Promise<ProductSuggestionItem[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.productRepository.suggest(query.trim(), limit);
  }
}
