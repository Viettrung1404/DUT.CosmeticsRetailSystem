import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
} from '../../domain/repositories/category.repository.interface';
import { CategoryEntity } from '../../domain/entities/category.entity';

export interface GetCategoriesInput {
  page: number;
  limit: number;
  order: 'ASC' | 'DESC';
  search?: string;
  isActive?: boolean;
  parentId?: string;
}

@Injectable()
export class GetCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  execute(input: GetCategoriesInput): Promise<{ items: CategoryEntity[]; total: number }> {
    return this.categoryRepository.findAll({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      order: input.order === 'ASC' ? 'asc' : 'desc',
      search: input.search?.trim() || undefined,
      isActive: input.isActive,
      parentId: input.parentId,
    });
  }
}
