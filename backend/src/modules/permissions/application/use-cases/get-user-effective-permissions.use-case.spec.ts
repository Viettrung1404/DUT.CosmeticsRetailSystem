import { NotFoundException } from '@nestjs/common';
import { GetUserEffectivePermissionsUseCase } from './get-user-effective-permissions.use-case';
import {
  IPermissionRepository,
  PermissionDefinition,
  UserPermissionMasks,
} from '../../domain/repositories/permission.repository.interface';

const mask = (bits: number[]): bigint =>
  bits.reduce((acc, bit) => acc | (1n << BigInt(bit)), 0n);

const DEFINITIONS: PermissionDefinition[] = [
  { bitPosition: 0, permissionCode: 'PRODUCT_VIEW' },
  { bitPosition: 11, permissionCode: 'ORDER_POS_CREATE' },
  { bitPosition: 13, permissionCode: 'ORDER_DISCOUNT_APPLY' },
  { bitPosition: 16, permissionCode: 'PAYMENT_COLLECT' },
  { bitPosition: 20, permissionCode: 'CUSTOMER_VIEW' },
  { bitPosition: 21, permissionCode: 'CUSTOMER_CREATE_UPDATE' },
  { bitPosition: 36, permissionCode: 'REPORT_REVENUE' },
  { bitPosition: 52, permissionCode: 'INVOICE_MANAGE' },
];

describe('GetUserEffectivePermissionsUseCase', () => {
  let repository: jest.Mocked<IPermissionRepository>;
  let useCase: GetUserEffectivePermissionsUseCase;

  const givenMasks = (masks: UserPermissionMasks | null) => {
    repository.findUserPermissionMasks.mockResolvedValue(masks);
  };

  beforeEach(() => {
    repository = {
      findUserPermissionMasks: jest.fn(),
      findAllDefinitions: jest.fn().mockResolvedValue(DEFINITIONS),
    };
    useCase = new GetUserEffectivePermissionsUseCase(repository);
  });

  it('trả đúng quyền của role khi không có cấp thêm / thu hồi', async () => {
    givenMasks({
      rolePermissions: mask([0, 11, 13, 16, 20, 21]),
      extraPermissions: 0n,
      revokedPermissions: 0n,
    });

    await expect(useCase.execute('u1')).resolves.toEqual([
      'PRODUCT_VIEW',
      'ORDER_POS_CREATE',
      'ORDER_DISCOUNT_APPLY',
      'PAYMENT_COLLECT',
      'CUSTOMER_VIEW',
      'CUSTOMER_CREATE_UPDATE',
    ]);
  });

  it('ví dụ chị Mai trong tài liệu: được cấp thêm bit 36, bị thu hồi bit 16', async () => {
    givenMasks({
      rolePermissions: 3221505n, // role Sales Staff: bit 0, 11, 13, 16, 20, 21
      extraPermissions: 68719476736n, // bit 36
      revokedPermissions: 65536n, // bit 16
    });

    const result = await useCase.execute('u1');

    expect(result).toContain('REPORT_REVENUE');
    expect(result).not.toContain('PAYMENT_COLLECT');
    expect(result).toHaveLength(6);
  });

  it('quyền bị thu hồi thắng quyền được cấp thêm', async () => {
    givenMasks({
      rolePermissions: 0n,
      extraPermissions: mask([36]),
      revokedPermissions: mask([36]),
    });

    await expect(useCase.execute('u1')).resolves.toEqual([]);
  });

  it('xử lý đúng bit lớn hơn 31 (vượt giới hạn số 32-bit)', async () => {
    givenMasks({
      rolePermissions: mask([52]),
      extraPermissions: 0n,
      revokedPermissions: 0n,
    });

    await expect(useCase.execute('u1')).resolves.toEqual(['INVOICE_MANAGE']);
  });

  it('báo lỗi 404 khi không tìm thấy người dùng', async () => {
    givenMasks(null);

    await expect(useCase.execute('khong-ton-tai')).rejects.toThrow(NotFoundException);
  });
});
