import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';

@Injectable()
export class GetProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async executeBySlug(slug: string, onlyActive = true): Promise<ProductEntity> {
    const product = await this.productRepository.findBySlug(slug);
    if (
      !product ||
      (onlyActive &&
        (!product.isActive || !product.isCategoryActive || !product.isBrandActive))
    ) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với slug: ${slug}`);
    }

    return product;
  }

  async executeById(id: string): Promise<ProductEntity> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }

    return product;
  }
}
