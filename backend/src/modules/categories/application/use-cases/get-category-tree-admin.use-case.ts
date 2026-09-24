import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
} from '../../domain/repositories/category.repository.interface';
import { CategoryEntity } from '../../domain/entities/category.entity';

@Injectable()
export class GetCategoryTreeAdminUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  execute(): Promise<CategoryEntity[]> {
    return this.categoryRepository.findTree({ includeInactive: true });
  }
}
