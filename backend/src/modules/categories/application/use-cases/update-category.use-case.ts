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
import { CategoryChanges, CategoryEntity } from '../../domain/entities/category.entity';
import { CATEGORY_TREE_CACHE_KEY } from '../../categories.constants';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(CACHE_SERVICE)
    private readonly cacheService: ICacheService,
  ) {}

  async execute(id: string, changes: CategoryChanges): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    if (changes.slug && changes.slug !== category.slug) {
      if (await this.categoryRepository.findBySlug(changes.slug)) {
        throw new ConflictException(`Slug "${changes.slug}" đã được danh mục khác sử dụng`);
      }
    }

    if (changes.parentId) {
      await this.ensureNoCycle(id, changes.parentId);
    }

    const wasActive = category.isActive;
    category.update(changes);

    if (wasActive && !category.isActive) {
      const activeChildren = await this.categoryRepository.countActiveChildren(id);
      if (activeChildren > 0) {
        throw new ConflictException(
          `Danh mục "${category.name}" còn ${activeChildren} danh mục con đang hoạt động, không thể ẩn.`,
        );
      }
    }

    if (category.isActive && category.parentId) {
      const parent = await this.categoryRepository.findById(category.parentId);
      if (!parent?.isActive) {
        throw new BadRequestException('Danh mục cha đang ngừng hoạt động, hãy bật danh mục cha trước');
      }
    }

    const updated = await this.categoryRepository.update(category);
    await this.cacheService.del(CATEGORY_TREE_CACHE_KEY);
    return updated;
  }

  // Đi ngược từ cha mới lên gốc; gặp lại chính danh mục đang sửa nghĩa là tạo vòng lặp
  private async ensureNoCycle(id: string, newParentId: string): Promise<void> {
    if (newParentId === id) {
      throw new BadRequestException('Danh mục không thể là cha của chính nó');
    }

    let ancestor = await this.categoryRepository.findById(newParentId);
    if (!ancestor) {
      throw new NotFoundException('Không tìm thấy danh mục cha');
    }

    const visited = new Set<string>([newParentId]);
    while (ancestor?.parentId) {
      if (ancestor.parentId === id) {
        throw new BadRequestException('Không thể chuyển danh mục vào bên trong danh mục con của nó');
      }
      // Dữ liệu cũ đã có vòng lặp (sửa tay trong DB) thì dừng, tránh treo request
      if (visited.has(ancestor.parentId)) break;
      visited.add(ancestor.parentId);
      ancestor = await this.categoryRepository.findById(ancestor.parentId);
    }
  }
}
