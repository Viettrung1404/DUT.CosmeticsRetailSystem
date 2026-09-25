import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_SERVICE, ICacheService } from '@core/cache/cache.service.interface';
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
} from '../../domain/repositories/category.repository.interface';
import { CategoryEntity, CategoryProps } from '../../domain/entities/category.entity';
import { CATEGORY_TREE_CACHE_KEY } from '../../categories.constants';

export type CreateCategoryInput = Omit<CategoryProps, 'id' | 'children' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(CACHE_SERVICE)
    private readonly cacheService: ICacheService,
  ) {}

  async execute(input: CreateCategoryInput): Promise<CategoryEntity> {
    if (await this.categoryRepository.findBySlug(input.slug)) {
      throw new ConflictException(`Slug "${input.slug}" đã được danh mục khác sử dụng`);
    }
    if (input.parentId) {
      const parent = await this.categoryRepository.findById(input.parentId);
      if (!parent) {
        throw new NotFoundException('Không tìm thấy danh mục cha');
      }
      if (!parent.isActive && input.isActive !== false) {
        throw new BadRequestException('Danh mục cha đang ngừng hoạt động, hãy bật danh mục cha trước');
      }
    }

    const category = new CategoryEntity({ ...input, name: input.name.trim() });
    const created = await this.categoryRepository.create(category);
    await this.cacheService.del(CATEGORY_TREE_CACHE_KEY);
    return created;
  }
}
