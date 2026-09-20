import { Inject, Injectable } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';
import { PageOptionsDto } from '@core/common/pagination.dto';

@Injectable()
export class GetProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(
    pageOptionsDto: PageOptionsDto,
  ): Promise<{ items: ProductEntity[]; total: number }> {
    return this.productRepository.findAll(pageOptionsDto);
  }
}
