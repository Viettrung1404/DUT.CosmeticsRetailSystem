import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { IProductVariantRepository } from '../../../domain/repositories/product-variant.repository.interface';
import { ProductEntity, ProductProps } from '../../../domain/entities/product.entity';
import { ProductVariantEntity } from '../../../domain/entities/product-variant.entity';
import { CreateProductInput, CreateProductUseCase } from '../create-product.use-case';
import { UpdateProductUseCase } from '../update-product.use-case';
import { DeleteProductUseCase } from '../delete-product.use-case';
import { GetAdminProductsUseCase } from '../get-admin-products.use-case';

const CATEGORY_ID = 'c0000000-0000-4000-8000-000000000001';
const PRODUCT_ID = 'a0000000-0000-4000-8000-000000000001';

const makeProduct = (props: Partial<ProductProps> = {}) =>
  new ProductEntity({
    id: PRODUCT_ID,
    categoryId: CATEGORY_ID,
    name: 'Son Velvet',
    slug: 'son-velvet',
    sku: 'SON-VELVET',
    basePrice: 200000,
    option1Name: 'Màu sắc',
    ...props,
  });

const validInput = (): CreateProductInput => ({
  categoryId: CATEGORY_ID,
  name: ' Son Velvet ',
  slug: 'son-velvet',
  sku: 'SON-VELVET',
  basePrice: 200000,
  salePrice: 180000,
  option1Name: 'Màu sắc',
  variants: [
    { sku: 'SON-A01', option1Value: 'A01', price: 180000, costPrice: 90000 },
    { sku: 'SON-A02', option1Value: 'A02', price: 180000, costPrice: 90000 },
  ],
  images: [{ imageUrl: 'https://cdn.glowup.vn/a.jpg' }, { imageUrl: 'https://cdn.glowup.vn/b.jpg' }],
});

describe('Product admin use cases', () => {
  let repo: jest.Mocked<IProductRepository>;
  let variantRepo: jest.Mocked<IProductVariantRepository>;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findBySlug: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      findFiltered: jest.fn(),
      search: jest.fn(),
      suggest: jest.fn(),
      findRelated: jest.fn(),
      create: jest.fn((p: ProductEntity) => Promise.resolve(p)),
      update: jest.fn((p: ProductEntity) => Promise.resolve(p)),
      delete: jest.fn(),
      findAllForAdmin: jest.fn(),
      findBySku: jest.fn().mockResolvedValue(null),
      findCategoryState: jest.fn().mockResolvedValue({ isActive: true }),
      brandExists: jest.fn().mockResolvedValue(true),
    };
    variantRepo = {
      findById: jest.fn(),
      findByProduct: jest.fn(),
      findBySku: jest.fn().mockResolvedValue(null),
      findByBarcode: jest.fn().mockResolvedValue(null),
      findByOptions: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    };
  });

  describe('CreateProductUseCase', () => {
    const run = (input: CreateProductInput) => new CreateProductUseCase(repo, variantRepo).execute(input);

    it('tạo sản phẩm kèm biến thể, ảnh đầu tiên tự thành ảnh chính', async () => {
      const result = await run(validInput());

      expect(result.name).toBe('Son Velvet');
      expect(result.variants).toHaveLength(2);
      expect(result.images.map((img) => img.isPrimary)).toEqual([true, false]);
      expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('chặn giá khuyến mãi lớn hơn giá gốc', async () => {
      await expect(run({ ...validInput(), salePrice: 250000 })).rejects.toThrow(BadRequestException);
    });

    it('chặn hai biến thể trùng tổ hợp thuộc tính', async () => {
      const input = validInput();
      input.variants[1].option1Value = 'A01';
      await expect(run(input)).rejects.toThrow(BadRequestException);
    });

    it('chặn biến thể có giá trị ở thuộc tính sản phẩm chưa khai báo', async () => {
      const input = validInput();
      input.variants[0].option2Value = '50ml';
      await expect(run(input)).rejects.toThrow('chưa khai báo thuộc tính 2');
    });

    it('chặn biến thể thiếu giá trị cho thuộc tính đã khai báo', async () => {
      const input = validInput();
      input.variants[0].option1Value = null;
      await expect(run(input)).rejects.toThrow('Biến thể phải có giá trị cho thuộc tính "Màu sắc"');
    });

    it('chặn SKU biến thể đã tồn tại trong DB', async () => {
      variantRepo.findBySku.mockResolvedValueOnce(
        new ProductVariantEntity({ id: 'x', productId: 'y', sku: 'SON-A01', price: 1, costPrice: 1 }),
      );
      await expect(run(validInput())).rejects.toThrow(ConflictException);
    });

    it('chặn nhiều hơn 1 ảnh chính', async () => {
      const input = validInput();
      input.images = [
        { imageUrl: 'https://cdn.glowup.vn/a.jpg', isPrimary: true },
        { imageUrl: 'https://cdn.glowup.vn/b.jpg', isPrimary: true },
      ];
      await expect(run(input)).rejects.toThrow('tối đa 1 ảnh chính');
    });

    it('chặn danh mục đang ngừng hoạt động và thương hiệu không tồn tại', async () => {
      repo.findCategoryState.mockResolvedValueOnce({ isActive: false });
      await expect(run(validInput())).rejects.toThrow(BadRequestException);

      repo.brandExists.mockResolvedValueOnce(false);
      await expect(run({ ...validInput(), brandId: 'b0000000-0000-4000-8000-000000000001' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('chặn slug sản phẩm đã tồn tại', async () => {
      repo.findBySlug.mockResolvedValueOnce(makeProduct());
      await expect(run(validInput())).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('UpdateProductUseCase', () => {
    it('chặn bỏ tên thuộc tính khi biến thể còn dùng', async () => {
      repo.findById.mockResolvedValue(
        makeProduct({ variants: [{ sku: 'SON-A01', option1Value: 'A01', price: 1, costPrice: 1 }] }),
      );
      await expect(
        new UpdateProductUseCase(repo).execute(PRODUCT_ID, { option1Name: null }),
      ).rejects.toThrow('Không thể bỏ thuộc tính 1');
    });

    it('chặn bật lại sản phẩm khi danh mục của nó đang ẩn', async () => {
      repo.findById.mockResolvedValue(makeProduct({ isActive: false }));
      repo.findCategoryState.mockResolvedValueOnce({ isActive: false });
      await expect(
        new UpdateProductUseCase(repo).execute(PRODUCT_ID, { isActive: true }),
      ).rejects.toThrow('Danh mục đang ngừng hoạt động');
    });

    it('chặn giá khuyến mãi lớn hơn giá gốc sau khi sửa', async () => {
      repo.findById.mockResolvedValue(makeProduct({ salePrice: 150000 }));
      await expect(
        new UpdateProductUseCase(repo).execute(PRODUCT_ID, { basePrice: 100000 }),
      ).rejects.toThrow('Giá khuyến mãi không được lớn hơn giá gốc');
    });

    it('gửi images thì truyền danh sách ảnh mới xuống repository', async () => {
      repo.findById.mockResolvedValue(makeProduct());
      await new UpdateProductUseCase(repo).execute(PRODUCT_ID, {
        images: [{ imageUrl: 'https://cdn.glowup.vn/c.jpg' }],
      });
      expect(repo.update).toHaveBeenCalledWith(expect.any(ProductEntity), {
        images: [{ imageUrl: 'https://cdn.glowup.vn/c.jpg', sortOrder: 0, isPrimary: true }],
      });
    });
  });

  it('DeleteProductUseCase xóa mềm, không gọi xóa hẳn', async () => {
    repo.findById.mockResolvedValue(makeProduct());
    await new DeleteProductUseCase(repo).execute(PRODUCT_ID);

    expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('GetAdminProductsUseCase đổi page/limit thành skip/take và giữ bộ lọc', async () => {
    repo.findAllForAdmin.mockResolvedValue({ items: [], total: 0 });
    await new GetAdminProductsUseCase(repo).execute({
      page: 2,
      limit: 20,
      order: 'DESC',
      search: ' velvet ',
      isActive: false,
    });
    expect(repo.findAllForAdmin).toHaveBeenCalledWith({
      skip: 20,
      take: 20,
      order: 'desc',
      search: 'velvet',
      categoryId: undefined,
      brandId: undefined,
      isActive: false,
    });
  });
});
