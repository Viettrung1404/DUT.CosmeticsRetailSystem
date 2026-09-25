import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductCustomerController } from '../product-customer.controller';
import { GetProductsUseCase } from '../../../application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from '../../../application/use-cases/get-product-detail.use-case';
import { SearchProductsUseCase } from '../../../application/use-cases/search-products.use-case';
import { SuggestProductsUseCase } from '../../../application/use-cases/suggest-products.use-case';
import { GetRelatedProductsUseCase } from '../../../application/use-cases/get-related-products.use-case';
import { ProductEntity } from '../../../domain/entities/product.entity';
import { ProductFilterDto } from '../../dtos/product-filter.dto';
import { SearchProductsQueryDto } from '../../dtos/search-products-query.dto';
import { SuggestProductsQueryDto } from '../../dtos/suggest-products-query.dto';

describe('ProductCustomerController', () => {
  let controller: ProductCustomerController;
  let getProductsUseCase: { execute: jest.Mock };
  let getProductDetailUseCase: { executeBySlug: jest.Mock; executeById: jest.Mock };
  let searchProductsUseCase: { execute: jest.Mock };
  let suggestProductsUseCase: { execute: jest.Mock };
  let getRelatedProductsUseCase: { execute: jest.Mock };

  const mockProduct = new ProductEntity({
    id: 'prod-uuid-1',
    categoryId: 'cat-uuid-1',
    brandId: 'brand-uuid-1',
    name: 'Son kem lì Black Rouge',
    slug: 'son-kem-li-black-rouge',
    sku: 'BR-01',
    basePrice: 200000,
    salePrice: 180000,
    isActive: true,
    variants: [
      {
        id: 'var-1',
        sku: 'BR-01-A12',
        price: 180000,
        costPrice: 90000, // Giá vốn bí mật
        stockQuantity: 100,
        option1Value: 'A12',
        isActive: true,
      },
      {
        id: 'var-2',
        sku: 'BR-01-A13-DISCONTINUED',
        price: 180000,
        costPrice: 90000,
        stockQuantity: 0,
        option1Value: 'A13',
        isActive: false, // Biến thể đã ngừng bán / ẩn
      },
    ],
  });

  beforeEach(async () => {
    getProductsUseCase = { execute: jest.fn() };
    getProductDetailUseCase = { executeBySlug: jest.fn(), executeById: jest.fn() };
    searchProductsUseCase = { execute: jest.fn() };
    suggestProductsUseCase = { execute: jest.fn() };
    getRelatedProductsUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductCustomerController],
      providers: [
        { provide: GetProductsUseCase, useValue: getProductsUseCase },
        { provide: GetProductDetailUseCase, useValue: getProductDetailUseCase },
        { provide: SearchProductsUseCase, useValue: searchProductsUseCase },
        { provide: SuggestProductsUseCase, useValue: suggestProductsUseCase },
        { provide: GetRelatedProductsUseCase, useValue: getRelatedProductsUseCase },
      ],
    }).compile();

    controller = module.get<ProductCustomerController>(ProductCustomerController);
  });

  describe('getProducts', () => {
    it('nên trả về PageDto, ẩn giá vốn costPrice và lọc bỏ biến thể ngừng bán (isActive = false)', async () => {
      getProductsUseCase.execute.mockResolvedValue({
        items: [mockProduct],
        total: 1,
      });

      const filter = new ProductFilterDto();
      const result = await controller.getProducts(filter);

      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('Son kem lì Black Rouge');
      expect(result.meta.itemCount).toBe(1);

      // Đảm bảo chỉ trả về biến thể active (1 thay vì 2)
      expect(result.data[0].variants.length).toBe(1);
      expect(result.data[0].variants[0].sku).toBe('BR-01-A12');

      // Đảm bảo tuyệt đối không rò rỉ costPrice
      const variantResponse = result.data[0].variants[0] as any;
      expect(variantResponse.costPrice).toBeUndefined();
      expect(variantResponse.price).toBe(180000);
      expect(getProductsUseCase.execute).toHaveBeenCalledWith(filter);
    });
  });

  describe('searchProducts', () => {
    it('nên tìm kiếm sản phẩm với SearchProductsQueryDto thành công', async () => {
      searchProductsUseCase.execute.mockResolvedValue({
        items: [mockProduct],
        total: 1,
      });

      const queryDto = new SearchProductsQueryDto();
      queryDto.q = 'black rouge';
      const result = await controller.searchProducts(queryDto);

      expect(result.data.length).toBe(1);
      expect(result.meta.itemCount).toBe(1);
      expect(searchProductsUseCase.execute).toHaveBeenCalledWith('black rouge', queryDto);
    });
  });

  describe('suggestProducts', () => {
    it('nên gọi suggestProductsUseCase với query và limit hợp lệ', async () => {
      const mockSuggestions = [
        {
          id: 'prod-uuid-1',
          name: 'Son kem lì Black Rouge',
          slug: 'son-kem-li-black-rouge',
          price: 180000,
        },
      ];
      suggestProductsUseCase.execute.mockResolvedValue(mockSuggestions);

      const queryDto = new SuggestProductsQueryDto();
      queryDto.q = 'son';
      queryDto.limit = 5;

      const result = await controller.suggestProducts(queryDto);

      expect(result).toEqual(mockSuggestions);
      expect(suggestProductsUseCase.execute).toHaveBeenCalledWith('son', 5);
    });
  });

  describe('getProductBySlug', () => {
    it('nên trả về chi tiết sản phẩm theo slug', async () => {
      getProductDetailUseCase.executeBySlug.mockResolvedValue(mockProduct);

      const result = await controller.getProductBySlug('son-kem-li-black-rouge');

      expect(result.id).toBe('prod-uuid-1');
      expect(result.slug).toBe('son-kem-li-black-rouge');
      expect(getProductDetailUseCase.executeBySlug).toHaveBeenCalledWith('son-kem-li-black-rouge');
    });

    it('nên ném NotFoundException nếu use case báo không tìm thấy hoặc sản phẩm bị ẩn', async () => {
      getProductDetailUseCase.executeBySlug.mockRejectedValue(
        new NotFoundException('Không tìm thấy sản phẩm với slug: an-san-pham'),
      );

      await expect(controller.getProductBySlug('an-san-pham')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRelatedProducts', () => {
    it('nên trả về danh sách sản phẩm liên quan và giới hạn limit an toàn', async () => {
      getRelatedProductsUseCase.execute.mockResolvedValue([mockProduct]);

      const result = await controller.getRelatedProducts('prod-uuid-1', 8);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('prod-uuid-1');
      expect(getRelatedProductsUseCase.execute).toHaveBeenCalledWith('prod-uuid-1', 8);
    });
  });
});
