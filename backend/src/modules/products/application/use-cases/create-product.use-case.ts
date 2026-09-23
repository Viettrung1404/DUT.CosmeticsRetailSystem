import { Inject, Injectable } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';

/**
 * Input for CreateProductUseCase defined at the application layer.
 */
export interface CreateProductInput {
  categoryId: string;
  brandId?: string;
  name: string;
  slug: string;
  sku: string;
  basePrice: number;
  description?: string;
  option1Name?: string;
  option2Name?: string;
  option3Name?: string;
}

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(input: CreateProductInput): Promise<ProductEntity> {
    const productEntity = new ProductEntity({
      categoryId: input.categoryId,
      brandId: input.brandId,
      name: input.name,
      slug: input.slug,
      sku: input.sku,
      basePrice: input.basePrice,
      description: input.description,
      option1Name: input.option1Name,
      option2Name: input.option2Name,
      option3Name: input.option3Name,
    });

    return this.productRepository.create(productEntity);
  }
}
