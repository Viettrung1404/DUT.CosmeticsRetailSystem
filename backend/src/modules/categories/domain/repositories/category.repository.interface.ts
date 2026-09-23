import { CategoryEntity } from '../entities/category.entity';

export const CATEGORY_REPOSITORY = Symbol('ICategoryRepository');

export interface ICategoryRepository {
  findTree(): Promise<CategoryEntity[]>;
  findById(id: string): Promise<CategoryEntity | null>;
  findBySlug(slug: string): Promise<CategoryEntity | null>;
}
