import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_SERVICE, ICacheService } from '@core/cache/cache.service.interface';
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
} from '../../domain/repositories/category.repository.interface';
import { CATEGORY_TREE_CACHE_KEY } from '../../categories.constants';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(CACHE_SERVICE)
    private readonly cacheService: ICacheService,
  ) {}

  // Bảng categories không có deleted_at nên xóa mềm = chuyển is_active sang false
  async execute(id: string): Promise<void> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const activeChildren = await this.categoryRepository.countActiveChildren(id);
    if (activeChildren > 0) {
      throw new ConflictException(
        `Danh mục "${category.name}" còn ${activeChildren} danh mục con đang hoạt động, hãy xóa hoặc chuyển chúng trước.`,
      );
    }

    category.deactivate();
    await this.categoryRepository.update(category);
    await this.cacheService.del(CATEGORY_TREE_CACHE_KEY);
  }
}
