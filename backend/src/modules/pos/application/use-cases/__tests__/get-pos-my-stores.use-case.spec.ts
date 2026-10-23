import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { IPosCatalogRepository } from '../../../domain/repositories/pos-catalog.repository.interface';
import { GetPosMyStoresUseCase } from '../get-pos-my-stores.use-case';

describe('GetPosMyStoresUseCase', () => {
  let catalog: jest.Mocked<IPosCatalogRepository>;
  let scope: { execute: jest.Mock };
  let useCase: GetPosMyStoresUseCase;

  beforeEach(() => {
    catalog = {
      findVariantByBarcode: jest.fn(),
      searchVariants: jest.fn(),
      findSellingStores: jest.fn().mockResolvedValue([{ id: 's1', code: 'CH01', name: 'GlowUp 1' }]),
    };
    scope = { execute: jest.fn() };
    useCase = new GetPosMyStoresUseCase(catalog, scope as unknown as GetUserDataScopeUseCase);
  });

  it('lọc cửa hàng theo danh sách được gán', async () => {
    scope.execute.mockResolvedValue({ type: 'STORE', storeIds: ['s1', 'wh'], employeeId: null });
    const stores = await useCase.execute('u1');
    expect(catalog.findSellingStores).toHaveBeenCalledWith(['s1', 'wh']);
    expect(stores).toHaveLength(1);
  });

  it('chưa được gán cửa hàng nào thì trả rỗng, không truy vấn', async () => {
    scope.execute.mockResolvedValue({ type: 'ALL', storeIds: [], employeeId: null });
    await expect(useCase.execute('u1')).resolves.toEqual([]);
    expect(catalog.findSellingStores).not.toHaveBeenCalled();
  });
});
