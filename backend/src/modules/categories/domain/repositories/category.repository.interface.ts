import { CategoryEntity } from '../entities/category.entity';

export const CATEGORY_REPOSITORY = Symbol('ICategoryRepository');

export interface CategoryListFilter {
  skip: number;
  take: number;
  order: 'asc' | 'desc';
  search?: string;
  isActive?: boolean;
  parentId?: string;
}

export interface ICategoryRepository {
  findTree(options?: { includeInactive?: boolean }): Promise<CategoryEntity[]>;
  findById(id: string): Promise<CategoryEntity | null>;
  findBySlug(slug: string): Promise<CategoryEntity | null>;
  findAll(filter: CategoryListFilter): Promise<{ items: CategoryEntity[]; total: number }>;
  create(category: CategoryEntity): Promise<CategoryEntity>;
  update(category: CategoryEntity): Promise<CategoryEntity>;
  countActiveChildren(id: string): Promise<number>;
}
