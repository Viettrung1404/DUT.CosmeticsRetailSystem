import { Test, TestingModule } from '@nestjs/testing';
import { GetProductsUseCase } from '../get-products.use-case';
import {
  PRODUCT_REPOSITORY,
  IProductRepository,
} from '../../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../../domain/entities/product.entity';
import { ProductFilterDto } from '../../../presentation/dtos/product-filter.dto';
import { PageOptionsDto } from '@core/common/pagination.dto';

describe('GetProductsUseCase', () => {
  let useCase: GetProductsUseCase;
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
        GetProductsUseCase,
        { provide: PRODUCT_REPOSITORY, useValue: productRepo },
      ],
    }).compile();

    useCase = module.get<GetProductsUseCase>(GetProductsUseCase);
  });

  it('should call findFiltered when filter parameters are provided', async () => {
    const filter = new ProductFilterDto();
    filter.categoryId = 'cat-1';
    filter.minPrice = 100000;

    const mockProducts = [
      new ProductEntity({
        id: 'p-1',
        categoryId: 'cat-1',
        name: 'Kem dưỡng ẩm',
        slug: 'kem-duong-am',
        sku: 'KEM-01',
        basePrice: 250000,
      }),
    ];

    productRepo.findFiltered.mockResolvedValue({
      items: mockProducts,
      total: 1,
    });

    const result = await useCase.execute(filter);

    expect(result.items.length).toBe(1);
    expect(result.total).toBe(1);
    expect(productRepo.findFiltered).toHaveBeenCalledWith(filter);
    expect(productRepo.findAll).not.toHaveBeenCalled();
  });

  it('should call findAll when simple PageOptionsDto is provided', async () => {
    const pageOptions = new PageOptionsDto();
    productRepo.findAll.mockResolvedValue({
      items: [],
      total: 0,
    });

    const result = await useCase.execute(pageOptions);

    expect(result.items).toEqual([]);
    expect(productRepo.findAll).toHaveBeenCalledWith(pageOptions);
    expect(productRepo.findFiltered).not.toHaveBeenCalled();
  });
});
