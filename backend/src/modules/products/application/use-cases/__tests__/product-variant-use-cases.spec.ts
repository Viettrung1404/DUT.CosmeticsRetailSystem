import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { IProductVariantRepository } from '../../../domain/repositories/product-variant.repository.interface';
import { ProductEntity } from '../../../domain/entities/product.entity';
import {
  ProductVariantEntity,
  ProductVariantEntityProps,
} from '../../../domain/entities/product-variant.entity';
import { CreateProductVariantUseCase } from '../create-product-variant.use-case';
import { UpdateProductVariantUseCase } from '../update-product-variant.use-case';
import { DeleteProductVariantUseCase } from '../delete-product-variant.use-case';
import { GetProductVariantsUseCase } from '../get-product-variants.use-case';

const PRODUCT_ID = 'a0000000-0000-4000-8000-000000000001';
const VARIANT_ID = 'd0000000-0000-4000-8000-000000000001';

// Sản phẩm có 2 thuộc tính: Màu sắc + Dung tích
const product = new ProductEntity({
  id: PRODUCT_ID,
  categoryId: 'c0000000-0000-4000-8000-000000000001',
  name: 'Kem dưỡng',
  slug: 'kem-duong',
  sku: 'KEM',
  basePrice: 300000,
  option1Name: 'Màu sắc',
  option2Name: 'Dung tích',
});

const makeVariant = (props: Partial<ProductVariantEntityProps> = {}) =>
  new ProductVariantEntity({
    id: VARIANT_ID,
    productId: PRODUCT_ID,
    sku: 'KEM-TRANG-50',
    option1Value: 'Trắng',
    option2Value: '50ml',
    price: 300000,
    costPrice: 150000,
    ...props,
  });

describe('Product variant use cases', () => {
  let repo: jest.Mocked<Pick<IProductRepository, 'findById'>>;
  let variantRepo: jest.Mocked<IProductVariantRepository>;

  beforeEach(() => {
    repo = { findById: jest.fn().mockResolvedValue(product) };
    variantRepo = {
      findById: jest.fn(),
      findByProduct: jest.fn().mockResolvedValue([]),
      findBySku: jest.fn().mockResolvedValue(null),
      findByBarcode: jest.fn().mockResolvedValue(null),
      findByOptions: jest.fn().mockResolvedValue(null),
      create: jest.fn((v: ProductVariantEntity) => Promise.resolve(v)),
      update: jest.fn((v: ProductVariantEntity) => Promise.resolve(v)),
    };
  });

  const productRepo = () => repo as unknown as IProductRepository;

  describe('CreateProductVariantUseCase', () => {
    const run = (input: Parameters<CreateProductVariantUseCase['execute']>[1]) =>
      new CreateProductVariantUseCase(productRepo(), variantRepo).execute(PRODUCT_ID, input);

    it('tạo biến thể hợp lệ, tồn kho mặc định 0', async () => {
      const result = await run({
        sku: 'KEM-HONG-30',
        option1Value: 'Hồng',
        option2Value: '30ml',
        price: 250000,
        costPrice: 120000,
      });
      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.stockQuantity).toBe(0);
    });

    it('chặn tổ hợp thuộc tính đã có (Trắng – 50ml)', async () => {
      variantRepo.findByOptions.mockResolvedValueOnce(makeVariant());
      await expect(
        run({ sku: 'KEM-X', option1Value: 'Trắng', option2Value: '50ml', price: 1, costPrice: 1 }),
      ).rejects.toThrow(ConflictException);
    });

    it('chặn thiếu giá trị thuộc tính "Dung tích"', async () => {
      await expect(
        run({ sku: 'KEM-X', option1Value: 'Trắng', price: 1, costPrice: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('chặn mã vạch đã được biến thể khác dùng', async () => {
      variantRepo.findByBarcode.mockResolvedValueOnce(makeVariant({ id: 'khac' }));
      await expect(
        run({
          sku: 'KEM-X',
          barcode: '893000',
          option1Value: 'Hồng',
          option2Value: '30ml',
          price: 1,
          costPrice: 1,
        }),
      ).rejects.toThrow('Mã vạch "893000"');
    });

    it('ném NotFoundException khi sản phẩm không tồn tại', async () => {
      repo.findById.mockResolvedValueOnce(null);
      await expect(run({ sku: 'X', price: 1, costPrice: 1 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('UpdateProductVariantUseCase', () => {
    it('sửa giá, giữ nguyên SKU của chính nó mà không báo trùng', async () => {
      variantRepo.findById.mockResolvedValue(makeVariant());
      variantRepo.findBySku.mockResolvedValue(makeVariant());

      const result = await new UpdateProductVariantUseCase(productRepo(), variantRepo).execute(VARIANT_ID, {
        sku: 'KEM-TRANG-50',
        price: 280000,
      });
      expect(result.price).toBe(280000);
    });

    it('chặn đổi sang tổ hợp thuộc tính của biến thể khác', async () => {
      variantRepo.findById.mockResolvedValue(makeVariant());
      variantRepo.findByOptions.mockResolvedValue(makeVariant({ id: 'khac', option2Value: '30ml' }));

      await expect(
        new UpdateProductVariantUseCase(productRepo(), variantRepo).execute(VARIANT_ID, {
          option2Value: '30ml',
        }),
      ).rejects.toThrow(ConflictException);
      expect(variantRepo.update).not.toHaveBeenCalled();
    });

    it('bỏ qua null ở cột bắt buộc (sku, giá)', async () => {
      variantRepo.findById.mockResolvedValue(makeVariant());
      const result = await new UpdateProductVariantUseCase(productRepo(), variantRepo).execute(VARIANT_ID, {
        sku: null as unknown as string,
        price: null as unknown as number,
      });
      expect(result.sku).toBe('KEM-TRANG-50');
      expect(result.price).toBe(300000);
    });
  });

  it('DeleteProductVariantUseCase xóa mềm', async () => {
    variantRepo.findById.mockResolvedValue(makeVariant());
    await new DeleteProductVariantUseCase(variantRepo).execute(VARIANT_ID);
    expect(variantRepo.update).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });

  it('GetProductVariantsUseCase ném NotFoundException khi sản phẩm không tồn tại', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(
      new GetProductVariantsUseCase(productRepo(), variantRepo).execute(PRODUCT_ID),
    ).rejects.toThrow(NotFoundException);
  });
});
