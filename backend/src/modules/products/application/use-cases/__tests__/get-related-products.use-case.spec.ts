import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetRelatedProductsUseCase } from '../get-related-products.use-case';
import {
  PRODUCT_REPOSITORY,
  IProductRepository,
} from '../../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../../domain/entities/product.entity';

describe('GetRelatedProductsUseCase', () => {
  let useCase: GetRelatedProductsUseCase;
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
        GetRelatedProductsUseCase,
        { provide: PRODUCT_REPOSITORY, useValue: productRepo },
      ],
    }).compile();

    useCase = module.get<GetRelatedProductsUseCase>(GetRelatedProductsUseCase);
  });

  it('should throw NotFoundException if base product does not exist', async () => {
    productRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('invalid-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return related products for existing product', async () => {
    const baseProduct = new ProductEntity({
      id: 'p-1',
      categoryId: 'cat-1',
      brandId: 'brand-1',
      name: 'Kem dưỡng A',
      slug: 'kem-duong-a',
      sku: 'KEM-A',
      basePrice: 200000,
    });

    const relatedProduct = new ProductEntity({
      id: 'p-2',
      categoryId: 'cat-1',
      brandId: 'brand-1',
      name: 'Kem dưỡng B',
      slug: 'kem-duong-b',
      sku: 'KEM-B',
      basePrice: 220000,
    });

    productRepo.findById.mockResolvedValue(baseProduct);
    productRepo.findRelated.mockResolvedValue([relatedProduct]);

    const result = await useCase.execute('p-1', 4);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('p-2');
    expect(productRepo.findRelated).toHaveBeenCalledWith(
      'p-1',
      'cat-1',
      'brand-1',
      4,
    );
  });
});
