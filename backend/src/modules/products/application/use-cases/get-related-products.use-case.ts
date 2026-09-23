import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';

@Injectable()
export class GetRelatedProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(productId: string, limit = 8): Promise<ProductEntity[]> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${productId}`);
    }

    return this.productRepository.findRelated(
      product.id!,
      product.categoryId,
      product.brandId,
      limit,
    );
  }
}
