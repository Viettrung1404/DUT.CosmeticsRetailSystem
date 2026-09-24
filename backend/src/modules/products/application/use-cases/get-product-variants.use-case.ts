import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository.interface';
import {
  IProductVariantRepository,
  PRODUCT_VARIANT_REPOSITORY,
} from '../../domain/repositories/product-variant.repository.interface';
import { ProductVariantEntity } from '../../domain/entities/product-variant.entity';

@Injectable()
export class GetProductVariantsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepository,
  ) {}

  async execute(productId: string): Promise<ProductVariantEntity[]> {
    if (!(await this.productRepository.findById(productId))) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return this.variantRepository.findByProduct(productId);
  }
}
