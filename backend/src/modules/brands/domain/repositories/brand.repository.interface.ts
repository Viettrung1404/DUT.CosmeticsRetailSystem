import { BrandEntity } from '../entities/brand.entity';

export const BRAND_REPOSITORY = Symbol('IBrandRepository');

export interface BrandListFilter {
  skip: number;
  take: number;
  order: 'asc' | 'desc';
  search?: string;
  isActive?: boolean;
}

export interface IBrandRepository {
  findById(id: string): Promise<BrandEntity | null>;
  findBySlug(slug: string): Promise<BrandEntity | null>;
  findAll(filter: BrandListFilter): Promise<{ items: BrandEntity[]; total: number }>;
  create(brand: BrandEntity): Promise<BrandEntity>;
  update(brand: BrandEntity): Promise<BrandEntity>;
  delete(id: string): Promise<void>;
  countProducts(brandId: string): Promise<number>;
}
