import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { GetAdminCustomersUseCase, toCustomerScopeFilter } from '../get-admin-customers.use-case';
import { IAdminCustomerRepository } from '../../../domain/repositories/admin-customer.repository.interface';

describe('toCustomerScopeFilter', () => {
  it('ALL: không lọc', () => {
    expect(toCustomerScopeFilter({ type: 'ALL', storeIds: [], employeeId: null })).toEqual({});
  });

  it('STORE: khách từng có đơn tại các cửa hàng được giao', () => {
    expect(toCustomerScopeFilter({ type: 'STORE', storeIds: ['s1'], employeeId: 'e1' })).toEqual({
      orderStoreIds: ['s1'],
    });
  });

  it('SELF là nhân viên: khách có đơn do mình bán', () => {
    expect(toCustomerScopeFilter({ type: 'SELF', storeIds: [], employeeId: 'e1' })).toEqual({
      orderSalesStaffId: 'e1',
    });
  });

  it('SELF không phải nhân viên: không thấy khách nào', () => {
    expect(toCustomerScopeFilter({ type: 'SELF', storeIds: [], employeeId: null })).toEqual({
      orderStoreIds: [],
    });
  });
});

describe('GetAdminCustomersUseCase', () => {
  it('gắn phạm vi của người gọi vào truy vấn, giữ nguyên bộ lọc', async () => {
    const repository = { findMany: jest.fn().mockResolvedValue({ items: [], total: 0 }) };
    const getUserDataScope = {
      execute: jest.fn().mockResolvedValue({ type: 'STORE', storeIds: ['s1'], employeeId: null }),
    };
    const useCase = new GetAdminCustomersUseCase(
      repository as unknown as IAdminCustomerRepository,
      getUserDataScope as unknown as GetUserDataScopeUseCase,
    );

    await useCase.execute('u1', {
      page: 1,
      limit: 20,
      sortBy: 'totalSpent',
      order: 'desc',
      search: 'Khách',
    });

    expect(getUserDataScope.execute).toHaveBeenCalledWith('u1');
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ scope: { orderStoreIds: ['s1'] }, sortBy: 'totalSpent', search: 'Khách' }),
    );
  });
});
