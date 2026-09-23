import { Test, TestingModule } from '@nestjs/testing';
import { SuggestProductsUseCase } from '../suggest-products.use-case';
import {
  PRODUCT_REPOSITORY,
  IProductRepository,
} from '../../../domain/repositories/product.repository.interface';

describe('SuggestProductsUseCase', () => {
  let useCase: SuggestProductsUseCase;
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestProductsUseCase,
        { provide: PRODUCT_REPOSITORY, useValue: productRepo },
      ],
    }).compile();

    useCase = module.get<SuggestProductsUseCase>(SuggestProductsUseCase);
  });

  it('should return suggestions when query is valid', async () => {
    const mockSuggestions = [
      {
        id: 'p-1',
        name: 'Son dưỡng môi Rohto',
        slug: 'son-duong-moi-rohto',
        imageUrl: 'http://example.com/img.jpg',
        price: 95000,
      },
    ];

    productRepo.suggest.mockResolvedValue(mockSuggestions);

    const result = await useCase.execute('son duong', 5);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Son dưỡng môi Rohto');
    expect(productRepo.suggest).toHaveBeenCalledWith('son duong', 5);
  });

  it('should return empty array when query is empty or whitespace', async () => {
    const result = await useCase.execute('   ');

    expect(result).toEqual([]);
    expect(productRepo.suggest).not.toHaveBeenCalled();
  });
});
