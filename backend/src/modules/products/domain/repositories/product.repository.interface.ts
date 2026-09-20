import { ProductEntity } from '../entities/product.entity';
import { PageOptionsDto } from '@core/common/pagination.dto';

export const PRODUCT_REPOSITORY = Symbol('IProductRepository');

export interface IProductRepository {
  findById(id: string): Promise<ProductEntity | null>;
  findBySlug(slug: string): Promise<ProductEntity | null>;
  findAll(options: PageOptionsDto): Promise<{ items: ProductEntity[]; total: number }>;
  create(product: ProductEntity): Promise<ProductEntity>;
  update(product: ProductEntity): Promise<ProductEntity>;
  delete(id: string): Promise<void>;
}
