import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { CategoryMapper } from '../mappers/category.mapper';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTree(): Promise<CategoryEntity[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const entityMap = new Map<string, CategoryEntity>();
    const rootCategories: CategoryEntity[] = [];

    // First pass: instantiate domain entities
    for (const raw of categories) {
      entityMap.set(raw.id, CategoryMapper.toDomain(raw));
    }

    // Second pass: assemble parent-child tree hierarchy
    for (const raw of categories) {
      const currentEntity = entityMap.get(raw.id)!;
      if (!raw.parentId) {
        // Chỉ các danh mục không có parentId mới là Root Category
        rootCategories.push(currentEntity);
      } else if (entityMap.has(raw.parentId)) {
        // Gắn vào cha nếu cha đang active (tồn tại trong entityMap)
        const parentEntity = entityMap.get(raw.parentId)!;
        parentEntity.addChild(currentEntity);
      }
      // Lưu ý: Nếu có parentId nhưng cha không active (không có trong entityMap),
      // danh mục này là orphan node và sẽ không được hiển thị làm root category.
    }

    return rootCategories;
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const raw = await this.prisma.category.findUnique({
      where: { id },
    });
    return raw ? CategoryMapper.toDomain(raw) : null;
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    const raw = await this.prisma.category.findUnique({
      where: { slug },
    });
    return raw ? CategoryMapper.toDomain(raw) : null;
  }
}
