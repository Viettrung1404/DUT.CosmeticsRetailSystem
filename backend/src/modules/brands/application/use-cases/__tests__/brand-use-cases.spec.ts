import { ConflictException, NotFoundException } from '@nestjs/common';
import { IBrandRepository } from '../../../domain/repositories/brand.repository.interface';
import { BrandEntity } from '../../../domain/entities/brand.entity';
import { GetBrandsUseCase } from '../get-brands.use-case';
import { GetBrandDetailUseCase } from '../get-brand-detail.use-case';
import { CreateBrandUseCase } from '../create-brand.use-case';
import { UpdateBrandUseCase } from '../update-brand.use-case';
import { DeleteBrandUseCase } from '../delete-brand.use-case';

const BRAND_ID = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

const makeBrand = (overrides: Partial<ConstructorParameters<typeof BrandEntity>[0]> = {}) =>
  new BrandEntity({ id: BRAND_ID, name: 'Innisfree', slug: 'innisfree', ...overrides });

describe('Brand use cases', () => {
  let repo: jest.Mocked<IBrandRepository>;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn((brand: BrandEntity) => Promise.resolve(brand)),
      update: jest.fn((brand: BrandEntity) => Promise.resolve(brand)),
      delete: jest.fn(),
      countProducts: jest.fn(),
    };
  });

  describe('GetBrandsUseCase', () => {
    it('đổi page/limit thành skip/take và bỏ search rỗng', async () => {
      repo.findAll.mockResolvedValue({ items: [], total: 0 });

      await new GetBrandsUseCase(repo).execute({ page: 3, limit: 10, order: 'ASC', search: '   ' });

      expect(repo.findAll).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
        order: 'asc',
        search: undefined,
        isActive: undefined,
      });
    });
  });

  describe('GetBrandDetailUseCase', () => {
    it('ném NotFoundException khi không có thương hiệu', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(new GetBrandDetailUseCase(repo).execute(BRAND_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('CreateBrandUseCase', () => {
    it('tạo thương hiệu với giá trị mặc định khi slug chưa tồn tại', async () => {
      repo.findBySlug.mockResolvedValue(null);

      const result = await new CreateBrandUseCase(repo).execute({ name: '  MAC ', slug: 'mac' });

      expect(result.name).toBe('MAC');
      expect(result.isActive).toBe(true);
      expect(result.isFeatured).toBe(false);
      expect(result.sortOrder).toBe(0);
    });

    it('ném ConflictException khi slug đã tồn tại', async () => {
      repo.findBySlug.mockResolvedValue(makeBrand());

      await expect(
        new CreateBrandUseCase(repo).execute({ name: 'Innisfree 2', slug: 'innisfree' }),
      ).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('UpdateBrandUseCase', () => {
    it('ngừng kinh doanh bằng isActive = false, giữ nguyên các trường khác', async () => {
      repo.findById.mockResolvedValue(makeBrand({ countryOfOrigin: 'Hàn Quốc' }));

      const result = await new UpdateBrandUseCase(repo).execute(BRAND_ID, { isActive: false });

      expect(result.isActive).toBe(false);
      expect(result.name).toBe('Innisfree');
      expect(result.countryOfOrigin).toBe('Hàn Quốc');
    });

    it('bỏ qua null ở cột bắt buộc nhưng cho phép xóa logo', async () => {
      repo.findById.mockResolvedValue(makeBrand({ logoUrl: 'https://cdn.glowup.vn/a.png' }));

      const result = await new UpdateBrandUseCase(repo).execute(BRAND_ID, {
        name: null as unknown as string,
        logoUrl: null,
      });

      expect(result.name).toBe('Innisfree');
      expect(result.logoUrl).toBeNull();
    });

    it('ném ConflictException khi đổi sang slug của thương hiệu khác', async () => {
      repo.findById.mockResolvedValue(makeBrand());
      repo.findBySlug.mockResolvedValue(makeBrand({ id: 'other-id', slug: 'mac' }));

      await expect(new UpdateBrandUseCase(repo).execute(BRAND_ID, { slug: 'mac' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('ném NotFoundException khi không có thương hiệu', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(new UpdateBrandUseCase(repo).execute(BRAND_ID, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('DeleteBrandUseCase', () => {
    it('xóa khi thương hiệu chưa có sản phẩm', async () => {
      repo.findById.mockResolvedValue(makeBrand());
      repo.countProducts.mockResolvedValue(0);

      await new DeleteBrandUseCase(repo).execute(BRAND_ID);

      expect(repo.delete).toHaveBeenCalledWith(BRAND_ID);
    });

    it('chặn xóa khi thương hiệu còn sản phẩm', async () => {
      repo.findById.mockResolvedValue(makeBrand());
      repo.countProducts.mockResolvedValue(5);

      await expect(new DeleteBrandUseCase(repo).execute(BRAND_ID)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
