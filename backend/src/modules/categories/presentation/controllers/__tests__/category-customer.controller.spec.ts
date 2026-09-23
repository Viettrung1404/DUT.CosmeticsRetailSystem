import { Test, TestingModule } from '@nestjs/testing';
import { CategoryCustomerController } from '../category-customer.controller';
import { GetCategoryTreeUseCase } from '../../../application/use-cases/get-category-tree.use-case';
import { CACHE_SERVICE, ICacheService } from '@core/cache/cache.service.interface';
import { CategoryEntity } from '../../../domain/entities/category.entity';

describe('CategoryCustomerController', () => {
  let controller: CategoryCustomerController;
  let useCaseMock: { execute: jest.Mock };
  let cacheMock: jest.Mocked<ICacheService>;

  beforeEach(async () => {
    useCaseMock = {
      execute: jest.fn(),
    };

    cacheMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryCustomerController],
      providers: [
        { provide: GetCategoryTreeUseCase, useValue: useCaseMock },
        { provide: CACHE_SERVICE, useValue: cacheMock },
      ],
    }).compile();

    controller = module.get<CategoryCustomerController>(CategoryCustomerController);
  });

  it('nên trả về dữ liệu từ cache nếu có sẵn (cache hit)', async () => {
    const cachedData = [
      {
        id: 'cat-cached-1',
        name: 'Đã lưu cache',
        slug: 'da-luu-cache',
        sortOrder: 1,
        children: [],
      },
    ];
    cacheMock.get.mockResolvedValue(cachedData);

    const result = await controller.getCategoryTree();

    expect(result).toEqual(cachedData);
    expect(cacheMock.get).toHaveBeenCalledWith('categories:tree:customer');
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  it('nên gọi UseCase và lưu vào cache khi cache miss', async () => {
    cacheMock.get.mockResolvedValue(null);

    const rootEntity = new CategoryEntity({
      id: 'cat-1',
      name: 'Chăm sóc tóc',
      slug: 'cham-soc-toc',
      sortOrder: 1,
    });
    useCaseMock.execute.mockResolvedValue([rootEntity]);

    const result = await controller.getCategoryTree();

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Chăm sóc tóc');
    expect(useCaseMock.execute).toHaveBeenCalledTimes(1);
    expect(cacheMock.set).toHaveBeenCalledWith(
      'categories:tree:customer',
      expect.any(Array),
      300_000,
    );
  });
});
