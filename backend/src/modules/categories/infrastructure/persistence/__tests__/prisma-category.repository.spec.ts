import { Test, TestingModule } from '@nestjs/testing';
import { PrismaCategoryRepository } from '../prisma-category.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';

describe('PrismaCategoryRepository', () => {
  let repository: PrismaCategoryRepository;
  let prismaMock: { category: { findMany: jest.Mock; findUnique: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaCategoryRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get<PrismaCategoryRepository>(PrismaCategoryRepository);
  });

  describe('findTree', () => {
    it('nên dựng đúng cây danh mục đa cấp (root -> child -> grandchild)', async () => {
      const mockRawCategories = [
        {
          id: 'cat-root-1',
          parentId: null,
          name: 'Chăm sóc da',
          slug: 'cham-soc-da',
          description: null,
          imageUrl: null,
          sortOrder: 1,
          isActive: true,
          metaTitle: null,
          metaDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-child-1',
          parentId: 'cat-root-1',
          name: 'Kem dưỡng ẩm',
          slug: 'kem-duong-am',
          description: null,
          imageUrl: null,
          sortOrder: 1,
          isActive: true,
          metaTitle: null,
          metaDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-grandchild-1',
          parentId: 'cat-child-1',
          name: 'Kem dưỡng ẩm da dầu',
          slug: 'kem-duong-am-da-dau',
          description: null,
          imageUrl: null,
          sortOrder: 1,
          isActive: true,
          metaTitle: null,
          metaDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockRawCategories);

      const tree = await repository.findTree();

      expect(tree.length).toBe(1);
      const root = tree[0];
      expect(root.id).toBe('cat-root-1');
      expect(root.name).toBe('Chăm sóc da');
      expect(root.isRoot()).toBe(true);
      expect(root.children.length).toBe(1);

      const child = root.children[0];
      expect(child.id).toBe('cat-child-1');
      expect(child.name).toBe('Kem dưỡng ẩm');
      expect(child.children.length).toBe(1);

      const grandchild = child.children[0];
      expect(grandchild.id).toBe('cat-grandchild-1');
      expect(grandchild.name).toBe('Kem dưỡng ẩm da dầu');
      expect(grandchild.children.length).toBe(0);
    });

    it('nên loại bỏ danh mục con mồ côi (khi danh mục cha bị inactive)', async () => {
      // Giả sử Danh mục cha có isActive = false nên Prisma chỉ trả về danh mục con
      const mockRawCategories = [
        {
          id: 'cat-root-active',
          parentId: null,
          name: 'Trang điểm',
          slug: 'trang-diem',
          description: null,
          imageUrl: null,
          sortOrder: 1,
          isActive: true,
          metaTitle: null,
          metaDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'orphan-child-1',
          parentId: 'inactive-parent-id', // Cha không tồn tại trong danh sách active trả về
          name: 'Danh mục mồ côi',
          slug: 'danh-muc-mo-coi',
          description: null,
          imageUrl: null,
          sortOrder: 1,
          isActive: true,
          metaTitle: null,
          metaDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockRawCategories);

      const tree = await repository.findTree();

      // Chỉ có 1 danh mục gốc thực sự, orphan node không được biến thành root category
      expect(tree.length).toBe(1);
      expect(tree[0].id).toBe('cat-root-active');
      expect(tree[0].children.length).toBe(0);
    });
  });
});
