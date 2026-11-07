import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { IPosSessionRepository } from '../../../domain/repositories/pos-session.repository.interface';
import { PosStoreAccessService } from '../pos-store-access.service';

const STORE = { id: 's1', code: 'CH01', type: 'STORE', isActive: true };

describe('PosStoreAccessService', () => {
  let sessions: { findStore: jest.Mock };
  let scope: { execute: jest.Mock };
  let service: PosStoreAccessService;

  beforeEach(() => {
    sessions = { findStore: jest.fn().mockResolvedValue(STORE) };
    scope = {
      execute: jest.fn().mockResolvedValue({ type: 'STORE', storeIds: ['s1'], employeeId: null }),
    };
    service = new PosStoreAccessService(
      sessions as unknown as IPosSessionRepository,
      scope as unknown as GetUserDataScopeUseCase,
    );
  });

  it('được gán cửa hàng thì qua', async () => {
    await expect(service.assertCanSell('u1', 's1')).resolves.toBeUndefined();
  });

  it('không có cửa hàng thì 404', async () => {
    sessions.findStore.mockResolvedValue(null);
    await expect(service.assertCanSell('u1', 's1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('kho tổng thì 400', async () => {
    sessions.findStore.mockResolvedValue({ ...STORE, type: 'WAREHOUSE' });
    await expect(service.assertCanSell('u1', 's1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cửa hàng ngừng hoạt động thì 400', async () => {
    sessions.findStore.mockResolvedValue({ ...STORE, isActive: false });
    await expect(service.assertCanSell('u1', 's1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('chưa được gán thì 403, kể cả phạm vi ALL', async () => {
    scope.execute.mockResolvedValue({ type: 'ALL', storeIds: [], employeeId: null });
    await expect(service.assertCanSell('u1', 's1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
