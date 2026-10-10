import { NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from './get-user-data-scope.use-case';
import {
  IPermissionRepository,
  UserScopeInfo,
} from '../../domain/repositories/permission.repository.interface';

describe('GetUserDataScopeUseCase', () => {
  let repository: jest.Mocked<IPermissionRepository>;
  let useCase: GetUserDataScopeUseCase;

  const givenInfo = (info: Partial<UserScopeInfo> | null) => {
    repository.findUserScopeInfo.mockResolvedValue(
      info && {
        dataScope: 'SELF',
        assignedStoreIds: [],
        employeeId: null,
        employeeStoreId: null,
        ...info,
      },
    );
  };

  beforeEach(() => {
    repository = {
      findUserPermissionMasks: jest.fn(),
      findAllDefinitions: jest.fn(),
      findUserScopeInfo: jest.fn(),
    };
    useCase = new GetUserDataScopeUseCase(repository);
  });

  it('ALL: trả phạm vi toàn chuỗi', async () => {
    givenInfo({ dataScope: 'ALL' });
    await expect(useCase.execute('u1')).resolves.toEqual({
      type: 'ALL',
      storeIds: [],
      employeeId: null,
    });
  });

  it('STORE: gộp cửa hàng được giao (user_stores) và cửa hàng công tác, không trùng lặp', async () => {
    givenInfo({
      dataScope: 'STORE',
      assignedStoreIds: ['s1', 's2'],
      employeeId: 'e1',
      employeeStoreId: 's2',
    });
    const scope = await useCase.execute('u1');
    expect(scope.type).toBe('STORE');
    expect(scope.storeIds.sort()).toEqual(['s1', 's2']);
    expect(scope.employeeId).toBe('e1');
  });

  it('STORE: có cửa hàng công tác nhưng chưa được giao user_stores vẫn tính', async () => {
    givenInfo({ dataScope: 'STORE', employeeStoreId: 's3' });
    await expect(useCase.execute('u1')).resolves.toMatchObject({ storeIds: ['s3'] });
  });

  it('giá trị data_scope lạ bị hạ về SELF', async () => {
    givenInfo({ dataScope: 'REGION', employeeId: 'e9' });
    await expect(useCase.execute('u1')).resolves.toMatchObject({
      type: 'SELF',
      employeeId: 'e9',
    });
  });

  it('không tìm thấy người dùng → 404', async () => {
    givenInfo(null);
    await expect(useCase.execute('u404')).rejects.toBeInstanceOf(NotFoundException);
  });
});
