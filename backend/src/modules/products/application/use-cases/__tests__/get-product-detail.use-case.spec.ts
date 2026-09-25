import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetProductDetailUseCase } from '../get-product-detail.use-case';
import {
  PRODUCT_REPOSITORY,
  IProductRepository,
} from '../../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../../domain/entities/product.entity';

describe('GetProductDetailUseCase', () => {
  let useCase: GetProductDetailUseCase;
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
        GetProductDetailUseCase,
        { provide: PRODUCT_REPOSITORY, useValue: productRepo },
      ],
    }).compile();

    useCase = module.get<GetProductDetailUseCase>(GetProductDetailUseCase);
  });

  describe('executeBySlug', () => {
    it('nên trả về sản phẩm khi tìm thấy slug và sản phẩm đang active', async () => {
      const activeProduct = new ProductEntity({
        id: 'p-1',
        categoryId: 'cat-1',
        name: 'Son dưỡng',
        slug: 'son-duong',
        sku: 'SD-01',
        basePrice: 100000,
        isActive: true,
      });
      productRepo.findBySlug.mockResolvedValue(activeProduct);

      const result = await useCase.executeBySlug('son-duong');

      expect(result.id).toBe('p-1');
      expect(result.slug).toBe('son-duong');
      expect(productRepo.findBySlug).toHaveBeenCalledWith('son-duong');
    });

    it('nên ném NotFoundException khi sản phẩm bị ẩn (isActive = false)', async () => {
      const inactiveProduct = new ProductEntity({
        id: 'p-2',
        categoryId: 'cat-1',
        name: 'Sản phẩm ngừng bán',
        slug: 'san-pham-ngung-ban',
        sku: 'NGUNG-01',
        basePrice: 100000,
        isActive: false,
      });
      productRepo.findBySlug.mockResolvedValue(inactiveProduct);

      await expect(useCase.executeBySlug('san-pham-ngung-ban')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên ném NotFoundException khi danh mục của sản phẩm bị ẩn (isCategoryActive = false)', async () => {
      const productWithInactiveCategory = new ProductEntity({
        id: 'p-3',
        categoryId: 'cat-hidden',
        name: 'Sản phẩm danh mục ẩn',
        slug: 'sp-danh-muc-an',
        sku: 'HIDDEN-CAT-01',
        basePrice: 150000,
        isActive: true,
        isCategoryActive: false,
      });
      productRepo.findBySlug.mockResolvedValue(productWithInactiveCategory);

      await expect(useCase.executeBySlug('sp-danh-muc-an')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên ném NotFoundException khi thương hiệu của sản phẩm bị ẩn (isBrandActive = false)', async () => {
      const productWithInactiveBrand = new ProductEntity({
        id: 'p-4',
        categoryId: 'cat-1',
        brandId: 'brand-hidden',
        name: 'Sản phẩm thương hiệu ẩn',
        slug: 'sp-thuong-hieu-an',
        sku: 'HIDDEN-BRAND-01',
        basePrice: 200000,
        isActive: true,
        isBrandActive: false,
      });
      productRepo.findBySlug.mockResolvedValue(productWithInactiveBrand);

      await expect(useCase.executeBySlug('sp-thuong-hieu-an')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên ném NotFoundException khi slug không tồn tại', async () => {
      productRepo.findBySlug.mockResolvedValue(null);

      await expect(useCase.executeBySlug('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('executeById', () => {
    it('nên trả về sản phẩm khi ID tồn tại', async () => {
      const product = new ProductEntity({
        id: 'p-1',
        categoryId: 'cat-1',
        name: 'Son dưỡng',
        slug: 'son-duong',
        sku: 'SD-01',
        basePrice: 100000,
      });
      productRepo.findById.mockResolvedValue(product);

      const result = await useCase.executeById('p-1');

      expect(result.id).toBe('p-1');
      expect(productRepo.findById).toHaveBeenCalledWith('p-1');
    });

    it('nên ném NotFoundException khi ID không tồn tại', async () => {
      productRepo.findById.mockResolvedValue(null);

      await expect(useCase.executeById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
