import { Test, TestingModule } from '@nestjs/testing';
import { GetCategoryTreeUseCase } from '../get-category-tree.use-case';
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
} from '../../../domain/repositories/category.repository.interface';
import { CategoryEntity } from '../../../domain/entities/category.entity';

describe('GetCategoryTreeUseCase', () => {
  let useCase: GetCategoryTreeUseCase;
  let categoryRepo: jest.Mocked<ICategoryRepository>;

  beforeEach(async () => {
    categoryRepo = {
      findTree: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      countActiveChildren: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCategoryTreeUseCase,
        { provide: CATEGORY_REPOSITORY, useValue: categoryRepo },
      ],
    }).compile();

    useCase = module.get<GetCategoryTreeUseCase>(GetCategoryTreeUseCase);
  });

  it('nên trả về cấu trúc cây danh mục đa cấp chính xác', async () => {
    const childCategory = new CategoryEntity({
      id: 'cat-child-1',
      parentId: 'cat-root-1',
      name: 'Son thỏi',
      slug: 'son-thoi',
      sortOrder: 1,
    });

    const rootCategory = new CategoryEntity({
      id: 'cat-root-1',
      name: 'Trang điểm môi',
      slug: 'trang-diem-moi',
      sortOrder: 1,
    });
    rootCategory.addChild(childCategory);

    categoryRepo.findTree.mockResolvedValue([rootCategory]);

    const result = await useCase.execute();

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Trang điểm môi');
    expect(result[0].isRoot()).toBe(true);
    expect(result[0].hasChildren()).toBe(true);
    expect(result[0].children.length).toBe(1);
    expect(result[0].children[0].name).toBe('Son thỏi');
    expect(result[0].children[0].isRoot()).toBe(false);
    expect(categoryRepo.findTree).toHaveBeenCalledTimes(1);
  });
});
