import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PosCustomerInfo, PosVariantStock } from '../../../domain/entities/pos-lookup.entity';
import { IPosCatalogRepository } from '../../../domain/repositories/pos-catalog.repository.interface';
import { IPosCustomerRepository } from '../../../domain/repositories/pos-customer.repository.interface';
import { PosStoreAccessService } from '../../services/pos-store-access.service';
import { ScanPosProductUseCase } from '../scan-pos-product.use-case';
import { SearchPosProductsUseCase } from '../search-pos-products.use-case';
import { LookupPosCustomerUseCase } from '../lookup-pos-customer.use-case';
import { CreatePosCustomerUseCase } from '../create-pos-customer.use-case';

const STOCK: PosVariantStock = {
  variantId: 'v1',
  productId: 'p1',
  productName: 'Son lì',
  variantName: 'Đỏ',
  sku: 'SON-01',
  barcode: '893',
  price: 150000,
  isActive: true,
  productActive: true,
  onHand: 10,
  reserved: 2,
  expiredQuantity: 3,
  hasNearExpiry: true,
};

const CUSTOMER: PosCustomerInfo = {
  id: 'c1',
  fullName: 'Lê Văn Quầy',
  phone: '0905000003',
  hasAccount: false,
  totalPoints: 0,
  tier: null,
};

describe('POS tra cứu sản phẩm', () => {
  let catalog: jest.Mocked<IPosCatalogRepository>;
  let access: { assertCanSell: jest.Mock };

  beforeEach(() => {
    catalog = {
      findVariantByBarcode: jest.fn(),
      searchVariants: jest.fn(),
      findSellingStores: jest.fn(),
    };
    access = { assertCanSell: jest.fn().mockResolvedValue(undefined) };
  });

  describe('ScanPosProductUseCase', () => {
    const build = () =>
      new ScanPosProductUseCase(catalog, access as unknown as PosStoreAccessService);

    it('tồn bán được trừ giữ chỗ và lô hết hạn', async () => {
      catalog.findVariantByBarcode.mockResolvedValue(STOCK);
      const view = await build().execute('u1', '893', 's1');
      expect(view.sellableQuantity).toBe(5);
      expect(view.hasNearExpiry).toBe(true);
    });

    it('tồn bán được không âm', async () => {
      catalog.findVariantByBarcode.mockResolvedValue({ ...STOCK, onHand: 1 });
      const view = await build().execute('u1', '893', 's1');
      expect(view.sellableQuantity).toBe(0);
    });

    it('không thấy mã vạch thì 404', async () => {
      catalog.findVariantByBarcode.mockResolvedValue(null);
      await expect(build().execute('u1', 'x', 's1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('không được gán cửa hàng thì không tra cứu', async () => {
      access.assertCanSell.mockRejectedValue(new ForbiddenException());
      await expect(build().execute('u1', '893', 's1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(catalog.findVariantByBarcode).not.toHaveBeenCalled();
    });
  });

  describe('SearchPosProductsUseCase', () => {
    it('đổi trang thành skip/take và tính tồn bán được', async () => {
      catalog.searchVariants.mockResolvedValue({ items: [STOCK], total: 41 });
      const useCase = new SearchPosProductsUseCase(
        catalog,
        access as unknown as PosStoreAccessService,
      );
      const result = await useCase.execute('u1', {
        keyword: 'son',
        storeId: 's1',
        page: 3,
        limit: 20,
      });
      expect(catalog.searchVariants).toHaveBeenCalledWith('son', 's1', expect.anything(), 40, 20);
      expect(result.total).toBe(41);
      expect(result.items[0].sellableQuantity).toBe(5);
    });
  });
});

describe('POS khách hàng', () => {
  let customers: jest.Mocked<IPosCustomerRepository>;

  beforeEach(() => {
    customers = { findByPhone: jest.fn(), create: jest.fn() };
  });

  it('lookup: không có khách thì 404', async () => {
    customers.findByPhone.mockResolvedValue(null);
    await expect(new LookupPosCustomerUseCase(customers).execute('0905000003')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lookup: trả khách theo SĐT', async () => {
    customers.findByPhone.mockResolvedValue(CUSTOMER);
    await expect(new LookupPosCustomerUseCase(customers).execute('0905000003')).resolves.toBe(
      CUSTOMER,
    );
  });

  it('tạo khách: SĐT đã có thì 409 và không ghi', async () => {
    customers.findByPhone.mockResolvedValue(CUSTOMER);
    await expect(
      new CreatePosCustomerUseCase(customers).execute({ phone: '0905000003', fullName: 'A' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(customers.create).not.toHaveBeenCalled();
  });

  it('tạo khách: trùng khóa lúc ghi (tranh nhau) cũng 409', async () => {
    customers.findByPhone.mockResolvedValue(null);
    customers.create.mockResolvedValue(null);
    await expect(
      new CreatePosCustomerUseCase(customers).execute({ phone: '0905000003', fullName: 'A' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('tạo khách: thành công', async () => {
    customers.findByPhone.mockResolvedValue(null);
    customers.create.mockResolvedValue(CUSTOMER);
    await expect(
      new CreatePosCustomerUseCase(customers).execute({
        phone: '0905000003',
        fullName: 'Lê Văn Quầy',
      }),
    ).resolves.toBe(CUSTOMER);
  });
});
