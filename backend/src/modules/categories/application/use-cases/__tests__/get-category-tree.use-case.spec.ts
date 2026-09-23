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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCategoryTreeUseCase,
        { provide: CATEGORY_REPOSITORY, useValue: categoryRepo },
      ],
    }).compile();

    useCase = module.get<GetCategoryTreeUseCase>(GetCategoryTreeUseCase);
  });

  it('should return nested category tree structure', async () => {
    const childCategory = new CategoryEntity({
      id: 'cat-child-1',
      parentId: 'cat-root-1',
      name: 'Son thá»i',
      slug: 'son-thoi',
      sortOrder: 1,
    });

    const rootCategory = new CategoryEntity({
      id: 'cat-root-1',
      name: 'Trang Ä‘iá»ƒm mÃ´i',
      slug: 'trang-diem-moi',
      sortOrder: 1,
      children: [childCategory],
    });

    categoryRepo.findTree.mockResolvedValue([rootCategory]);

    const result = await useCase.execute();

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Trang Ä‘iá»ƒm mÃ´i');
    expect(result[0].children.length).toBe(1);
    expect(result[0].children[0].name).toBe('Son thá»i');
    expect(categoryRepo.findTree).toHaveBeenCalledTimes(1);
  });
});
