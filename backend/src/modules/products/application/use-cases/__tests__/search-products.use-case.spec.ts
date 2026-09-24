import { Test, TestingModule } from '@nestjs/testing';
import { SearchProductsUseCase } from '../search-products.use-case';
import {
  PRODUCT_REPOSITORY,
  IProductRepository,
} from '../../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../../domain/entities/product.entity';
import { PageOptionsDto } from '@core/common/pagination.dto';

describe('SearchProductsUseCase', () => {
  let useCase: SearchProductsUseCase;
  let productRepo: jest.Mocked<IProductRepository>;

  beforeEach(async () => {
    productRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      findFiltered: jest.fn(),
      search: jest.fn(),
      suggest: jest.fn(),
      findRelated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAllForAdmin: jest.fn(),
      findBySku: jest.fn(),
      findCategoryState: jest.fn(),
      brandExists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchProductsUseCase,
        { provide: PRODUCT_REPOSITORY, useValue: productRepo },
      ],
    }).compile();

    useCase = module.get<SearchProductsUseCase>(SearchProductsUseCase);
  });

  it('should return search results when query is provided', async () => {
    const mockProduct = new ProductEntity({
      id: 'p-1',
      categoryId: 'c-1',
      name: 'Son MAC Chili',
      slug: 'son-mac-chili',
      sku: 'MAC-CHILI',
      basePrice: 550000,
    });

    productRepo.search.mockResolvedValue({
      items: [mockProduct],
      total: 1,
    });

    const pageOptions = new PageOptionsDto();
    const result = await useCase.execute('mac chili', pageOptions);

    expect(result.items.length).toBe(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe('Son MAC Chili');
    expect(productRepo.search).toHaveBeenCalledWith('mac chili', pageOptions);
  });

  it('should return empty list when query is empty string or spaces', async () => {
    const pageOptions = new PageOptionsDto();
    const result = await useCase.execute('   ', pageOptions);

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(productRepo.search).not.toHaveBeenCalled();
  });
});
