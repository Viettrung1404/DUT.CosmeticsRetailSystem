import { BadRequestException } from '@nestjs/common';
import { GetAdminOrdersUseCase, GetAdminOrdersInput } from '../get-admin-orders.use-case';
import { IAdminOrderRepository } from '../../../domain/repositories/admin-order.repository.interface';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';

describe('GetAdminOrdersUseCase', () => {
  let repository: jest.Mocked<Pick<IAdminOrderRepository, 'findMany'>>;
  let getUserDataScope: { execute: jest.Mock };
  let useCase: GetAdminOrdersUseCase;

  const baseInput: GetAdminOrdersInput = {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    order: 'desc',
  };

  beforeEach(() => {
    repository = { findMany: jest.fn().mockResolvedValue({ items: [], total: 0 }) };
    getUserDataScope = {
      execute: jest.fn().mockResolvedValue({ type: 'STORE', storeIds: ['s1'], employeeId: 'e1' }),
    };
    useCase = new GetAdminOrdersUseCase(
      repository as unknown as IAdminOrderRepository,
      getUserDataScope as unknown as GetUserDataScopeUseCase,
    );
  });

  it('gắn phạm vi dữ liệu của người gọi vào truy vấn', async () => {
    await useCase.execute('u1', { ...baseInput, status: 'PENDING' });

    expect(getUserDataScope.execute).toHaveBeenCalledWith('u1');
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ scope: { storeIds: ['s1'] }, status: 'PENDING' }),
    );
  });

  it('đổi ngày lọc theo giờ Việt Nam, toDate tính trọn ngày', async () => {
    await useCase.execute('u1', { ...baseInput, fromDate: '2026-09-01', toDate: '2026-09-30' });

    const query = repository.findMany.mock.calls[0][0];
    expect(query.from?.toISOString()).toBe('2026-08-31T17:00:00.000Z');
    expect(query.to?.toISOString()).toBe('2026-09-30T17:00:00.000Z');
  });

  it('cho phép lọc trong đúng một ngày (fromDate = toDate)', async () => {
    await expect(
      useCase.execute('u1', { ...baseInput, fromDate: '2026-09-27', toDate: '2026-09-27' }),
    ).resolves.toEqual({ items: [], total: 0 });
  });

  it('fromDate sau toDate → 400, không truy vấn DB', async () => {
    await expect(
      useCase.execute('u1', { ...baseInput, fromDate: '2026-09-30', toDate: '2026-09-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findMany).not.toHaveBeenCalled();
  });
});
