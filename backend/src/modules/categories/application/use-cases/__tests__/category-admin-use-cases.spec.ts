import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ICacheService } from '@core/cache/cache.service.interface';
import { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
import { CategoryEntity, CategoryProps } from '../../../domain/entities/category.entity';
import { CATEGORY_TREE_CACHE_KEY } from '../../../categories.constants';
import { GetCategoriesUseCase } from '../get-categories.use-case';
import { GetCategoryTreeAdminUseCase } from '../get-category-tree-admin.use-case';
import { CreateCategoryUseCase } from '../create-category.use-case';
import { UpdateCategoryUseCase } from '../update-category.use-case';
import { DeleteCategoryUseCase } from '../delete-category.use-case';

// Cây mẫu: cham-soc-da (A) → kem-duong (B) → kem-duong-dem (C)
const A = 'a0000000-0000-4000-8000-000000000001';
const B = 'b0000000-0000-4000-8000-000000000002';
const C = 'c0000000-0000-4000-8000-000000000003';

const make = (props: Partial<CategoryProps> & { id: string }) =>
  new CategoryEntity({ name: 'Danh mục', slug: `slug-${props.id.slice(0, 1)}`, ...props });

const tree: Record<string, CategoryEntity> = {
  [A]: make({ id: A, name: 'Chăm sóc da', slug: 'cham-soc-da' }),
  [B]: make({ id: B, name: 'Kem dưỡng', slug: 'kem-duong', parentId: A }),
  [C]: make({ id: C, name: 'Kem dưỡng đêm', slug: 'kem-duong-dem', parentId: B }),
};

describe('Category admin use cases', () => {
  let repo: jest.Mocked<ICategoryRepository>;
  let cache: jest.Mocked<ICacheService>;

  beforeEach(() => {
    repo = {
      findTree: jest.fn(),
      findById: jest.fn((id: string) => Promise.resolve(tree[id] ?? null)),
      findBySlug: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      create: jest.fn((c: CategoryEntity) => Promise.resolve(c)),
      update: jest.fn((c: CategoryEntity) => Promise.resolve(c)),
      countActiveChildren: jest.fn(),
    };
    cache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), reset: jest.fn() };
  });

  it('GetCategoriesUseCase đổi page/limit thành skip/take và giữ bộ lọc parentId', async () => {
    repo.findAll.mockResolvedValue({ items: [], total: 0 });

    await new GetCategoriesUseCase(repo).execute({ page: 2, limit: 10, order: 'DESC', parentId: A });

    expect(repo.findAll).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      order: 'desc',
      search: undefined,
      isActive: undefined,
      parentId: A,
    });
  });

  it('GetCategoryTreeAdminUseCase lấy cả danh mục đã ẩn', async () => {
    repo.findTree.mockResolvedValue([]);
    await new GetCategoryTreeAdminUseCase(repo).execute();
    expect(repo.findTree).toHaveBeenCalledWith({ includeInactive: true });
  });

  describe('CreateCategoryUseCase', () => {
    it('tạo danh mục con và xóa cache cây danh mục', async () => {
      const result = await new CreateCategoryUseCase(repo, cache).execute({
        name: ' Serum ',
        slug: 'serum',
        parentId: A,
      });

      expect(result.name).toBe('Serum');
      expect(result.parentId).toBe(A);
      expect(cache.del).toHaveBeenCalledWith(CATEGORY_TREE_CACHE_KEY);
    });

    it('ném NotFoundException khi danh mục cha không tồn tại', async () => {
      await expect(
        new CreateCategoryUseCase(repo, cache).execute({
          name: 'Serum',
          slug: 'serum',
          parentId: 'd0000000-0000-4000-8000-000000000009',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('chặn tạo danh mục đang hoạt động dưới danh mục cha đã ẩn', async () => {
      repo.findById.mockResolvedValueOnce(make({ id: A, isActive: false }));

      await expect(
        new CreateCategoryUseCase(repo, cache).execute({ name: 'Serum', slug: 'serum', parentId: A }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném ConflictException khi slug đã tồn tại', async () => {
      repo.findBySlug.mockResolvedValue(tree[A]);
      await expect(
        new CreateCategoryUseCase(repo, cache).execute({ name: 'X', slug: 'cham-soc-da' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('UpdateCategoryUseCase', () => {
    it('chặn đặt danh mục làm cha của chính nó', async () => {
      await expect(
        new UpdateCategoryUseCase(repo, cache).execute(B, { parentId: B }),
      ).rejects.toThrow(BadRequestException);
    });

    it('chặn chuyển danh mục vào bên trong danh mục cháu của nó (A → dưới C)', async () => {
      await expect(
        new UpdateCategoryUseCase(repo, cache).execute(A, { parentId: C }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('cho phép đưa danh mục về gốc bằng parentId = null', async () => {
      const category = make({ id: C, slug: 'kem-duong-dem', parentId: B });
      repo.findById.mockResolvedValueOnce(category);

      const result = await new UpdateCategoryUseCase(repo, cache).execute(C, { parentId: null });

      expect(result.parentId).toBeNull();
      expect(cache.del).toHaveBeenCalledWith(CATEGORY_TREE_CACHE_KEY);
    });

    it('chặn ẩn bằng PATCH isActive=false khi còn danh mục con đang hoạt động', async () => {
      repo.findById.mockResolvedValueOnce(make({ id: A, slug: 'cham-soc-da' }));
      repo.countActiveChildren.mockResolvedValue(1);

      await expect(
        new UpdateCategoryUseCase(repo, cache).execute(A, { isActive: false }),
      ).rejects.toThrow(ConflictException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('chặn chuyển danh mục vào dưới danh mục cha đã ẩn', async () => {
      const hidden = make({ id: A, slug: 'cham-soc-da', isActive: false });
      repo.findById.mockImplementation((id: string) =>
        Promise.resolve(id === A ? hidden : (tree[id] ?? null)),
      );

      await expect(
        new UpdateCategoryUseCase(repo, cache).execute(C, { parentId: A }),
      ).rejects.toThrow(BadRequestException);
    });

    it('không treo khi dữ liệu cũ trong DB đã có vòng lặp', async () => {
      const X = 'e0000000-0000-4000-8000-000000000005';
      const Y = 'f0000000-0000-4000-8000-000000000006';
      const loop: Record<string, CategoryEntity> = {
        [X]: make({ id: X, parentId: Y }),
        [Y]: make({ id: Y, parentId: X }),
        [C]: make({ id: C, slug: 'kem-duong-dem', parentId: B }),
      };
      repo.findById.mockImplementation((id: string) =>
        Promise.resolve(loop[id] ?? tree[id] ?? null),
      );

      await expect(
        new UpdateCategoryUseCase(repo, cache).execute(C, { parentId: X }),
      ).resolves.toBeDefined();
    });

    it('bỏ qua null ở cột bắt buộc', async () => {
      const category = make({ id: B, name: 'Kem dưỡng', slug: 'kem-duong', parentId: A });
      repo.findById.mockResolvedValueOnce(category);

      const result = await new UpdateCategoryUseCase(repo, cache).execute(B, {
        name: null as unknown as string,
        sortOrder: 5,
      });

      expect(result.name).toBe('Kem dưỡng');
      expect(result.sortOrder).toBe(5);
    });
  });

  describe('DeleteCategoryUseCase', () => {
    it('xóa mềm: chuyển isActive sang false khi không còn con đang hoạt động', async () => {
      const category = make({ id: C, slug: 'kem-duong-dem', parentId: B });
      repo.findById.mockResolvedValueOnce(category);
      repo.countActiveChildren.mockResolvedValue(0);

      await new DeleteCategoryUseCase(repo, cache).execute(C);

      expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
      expect(cache.del).toHaveBeenCalledWith(CATEGORY_TREE_CACHE_KEY);
    });

    it('chặn xóa khi còn danh mục con đang hoạt động', async () => {
      repo.countActiveChildren.mockResolvedValue(1);

      await expect(new DeleteCategoryUseCase(repo, cache).execute(A)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('ném NotFoundException khi không có danh mục', async () => {
      await expect(
        new DeleteCategoryUseCase(repo, cache).execute('d0000000-0000-4000-8000-000000000009'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
