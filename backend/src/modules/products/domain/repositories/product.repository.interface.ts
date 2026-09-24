import { ProductEntity, ProductImageProps } from '../entities/product.entity';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { ProductFilterDto } from '../../presentation/dtos/product-filter.dto';

export const PRODUCT_REPOSITORY = Symbol('IProductRepository');

export interface ProductSuggestionItem {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  price: number;
}

export interface AdminProductListFilter {
  skip: number;
  take: number;
  order: 'asc' | 'desc';
  search?: string;
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
}

export interface IProductRepository {
  findById(id: string): Promise<ProductEntity | null>;
  findBySlug(slug: string): Promise<ProductEntity | null>;
  findAll(options: PageOptionsDto): Promise<{ items: ProductEntity[]; total: number }>;
  findFiltered(filter: ProductFilterDto): Promise<{ items: ProductEntity[]; total: number }>;
  search(query: string, options: PageOptionsDto): Promise<{ items: ProductEntity[]; total: number }>;
  suggest(query: string, limit?: number): Promise<ProductSuggestionItem[]>;
  findRelated(productId: string, categoryId: string, brandId?: string | null, limit?: number): Promise<ProductEntity[]>;
  create(product: ProductEntity): Promise<ProductEntity>;
  update(product: ProductEntity, options?: { images?: ProductImageProps[] }): Promise<ProductEntity>;
  delete(id: string): Promise<void>;
  findAllForAdmin(filter: AdminProductListFilter): Promise<{ items: ProductEntity[]; total: number }>;
  findBySku(sku: string): Promise<ProductEntity | null>;
  findCategoryState(categoryId: string): Promise<{ isActive: boolean } | null>;
  brandExists(brandId: string): Promise<boolean>;
}
