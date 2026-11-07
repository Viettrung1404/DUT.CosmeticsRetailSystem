import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdminUser } from '../../../domain/entities/admin-user.entity';
import { IAdminUserRepository } from '../../../domain/repositories/admin-user.repository.interface';
import { IStaffMailer } from '../../ports/staff-mailer.port';
import { CreateAdminUserUseCase } from '../create-admin-user.use-case';
import { GetAdminUsersUseCase } from '../get-admin-users.use-case';
import { GetAdminUserDetailUseCase } from '../get-admin-user-detail.use-case';
import { UpdateAdminUserUseCase } from '../update-admin-user.use-case';
import { SetUserPermissionsUseCase } from '../set-user-permissions.use-case';
import { SetUserStoresUseCase } from '../set-user-stores.use-case';
import { GetPermissionsUseCase, GetRolesUseCase } from '../get-roles-and-permissions.use-case';

const ID = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const ACTOR = { userId: 'admin-1', roleId: 1 };
const STORE = 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

const makeUser = (over: Partial<AdminUser> = {}): AdminUser => ({
  id: ID,
  email: 'nv@glowup.local',
  fullName: 'Nhân viên',
  phone: null,
  roleId: 3,
  roleName: 'sales_staff',
  roleDisplayName: 'Nhân viên bán hàng',
  status: 'ACTIVE',
  emailVerified: true,
  extraPermissions: 0n,
  revokedPermissions: 0n,
  lastLoginAt: null,
  createdAt: new Date('2026-10-01'),
  stores: [],
  employeeId: null,
  ...over,
});

describe('Admin user use cases', () => {
  let repo: jest.Mocked<IAdminUserRepository>;
  let mailer: jest.Mocked<IStaffMailer>;

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByPhone: jest.fn().mockResolvedValue(null),
      findEmployeeCodeOwner: jest.fn().mockResolvedValue(null),
      findExistingStoreIds: jest.fn(),
      findRoleById: jest.fn(),
      findRoles: jest.fn(),
      findPermissions: jest.fn(),
      createStaff: jest.fn(),
      update: jest.fn(),
      revokeSessions: jest.fn(),
      setPermissions: jest.fn(),
      setStores: jest.fn(),
    };
    mailer = { sendActivationEmail: jest.fn().mockResolvedValue(true) };
  });

  describe('GetAdminUsersUseCase', () => {
    it('đổi page/limit thành skip/take và bỏ search rỗng', async () => {
      repo.findAll.mockResolvedValue({ items: [], total: 0 });
      await new GetAdminUsersUseCase(repo).execute({ page: 3, limit: 10, order: 'ASC', search: '  ' });
      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10, order: 'asc', search: undefined }),
      );
    });
  });

  describe('GetAdminUserDetailUseCase', () => {
    it('ném NotFound khi không có người dùng', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(new GetAdminUserDetailUseCase(repo).execute(ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('CreateAdminUserUseCase', () => {
    const input = { email: ' NV@Glowup.local ', fullName: ' An ', roleId: 3, storeIds: [STORE] };

    beforeEach(() => {
      repo.findRoleById.mockResolvedValue({ id: 3 } as never);
      repo.findExistingStoreIds.mockResolvedValue([STORE]);
      repo.createStaff.mockResolvedValue(makeUser());
    });

    it('tạo tài khoản với email chữ thường, băm token và gửi thư kích hoạt', async () => {
      const result = await new CreateAdminUserUseCase(repo, mailer).execute(input);

      const data = repo.createStaff.mock.calls[0][0];
      expect(data.email).toBe('nv@glowup.local');
      expect(data.fullName).toBe('An');
      expect(data.tokenHash).toHaveLength(64);
      const rawToken = mailer.sendActivationEmail.mock.calls[0][2];
      expect(rawToken).toHaveLength(64);
      expect(rawToken).not.toBe(data.tokenHash);
      expect(result.activationEmailSent).toBe(true);
    });

    it('chưa cấu hình SMTP thì báo activationEmailSent=false', async () => {
      mailer.sendActivationEmail.mockResolvedValue(false);
      const result = await new CreateAdminUserUseCase(repo, mailer).execute(input);
      expect(result.activationEmailSent).toBe(false);
    });

    it('thư gửi lỗi thì vẫn tạo tài khoản và báo activationEmailSent=false', async () => {
      mailer.sendActivationEmail.mockRejectedValue(new Error('smtp'));
      const result = await new CreateAdminUserUseCase(repo, mailer).execute(input);
      expect(result.activationEmailSent).toBe(false);
      expect(result.user.id).toBe(ID);
    });

    it('chặn vai trò khách hàng', async () => {
      await expect(
        new CreateAdminUserUseCase(repo, mailer).execute({ ...input, roleId: 6 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('chặn email trùng và số điện thoại trùng', async () => {
      repo.findByEmail.mockResolvedValue({ id: 'x' });
      await expect(new CreateAdminUserUseCase(repo, mailer).execute(input)).rejects.toThrow(
        ConflictException,
      );
      repo.findByEmail.mockResolvedValue(null);
      repo.findByPhone.mockResolvedValue({ id: 'x' });
      await expect(
        new CreateAdminUserUseCase(repo, mailer).execute({ ...input, phone: '0905123456' }),
      ).rejects.toThrow(ConflictException);
      expect(repo.createStaff).not.toHaveBeenCalled();
    });

    it('chặn cửa hàng không tồn tại', async () => {
      repo.findExistingStoreIds.mockResolvedValue([]);
      await expect(new CreateAdminUserUseCase(repo, mailer).execute(input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('gộp cửa hàng chính của nhân viên vào danh sách cửa hàng và chặn trùng mã nhân viên', async () => {
      const employee = {
        employeeCode: 'NV009',
        position: 'Thu ngân',
        hireDate: new Date('2026-10-01'),
        storeId: STORE,
      };
      await new CreateAdminUserUseCase(repo, mailer).execute({ ...input, storeIds: [], employee });
      expect(repo.createStaff.mock.calls[0][0].storeIds).toEqual([STORE]);

      repo.findEmployeeCodeOwner.mockResolvedValue({ id: 'e' });
      await expect(
        new CreateAdminUserUseCase(repo, mailer).execute({ ...input, employee }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('UpdateAdminUserUseCase', () => {
    beforeEach(() => {
      repo.findById.mockResolvedValue(makeUser());
      repo.update.mockResolvedValue(makeUser());
      repo.findRoleById.mockResolvedValue({ id: 2 } as never);
    });

    it('khóa tài khoản thì thu hồi phiên và ghi nhật ký', async () => {
      await new UpdateAdminUserUseCase(repo).execute(ACTOR, ID, { status: 'BANNED' });
      expect(repo.update).toHaveBeenCalledWith(
        ID,
        { status: 'BANNED' },
        expect.objectContaining({ action: 'USER_UPDATE' }),
      );
      expect(repo.revokeSessions).toHaveBeenCalledWith(ID);
    });

    it('mở khóa thì không thu hồi phiên', async () => {
      repo.findById.mockResolvedValue(makeUser({ status: 'INACTIVE' }));
      await new UpdateAdminUserUseCase(repo).execute(ACTOR, ID, { status: 'ACTIVE' });
      expect(repo.revokeSessions).not.toHaveBeenCalled();
    });

    it('không cho tự đổi vai trò hoặc tự khóa chính mình', async () => {
      repo.findById.mockResolvedValue(makeUser({ id: ACTOR.userId, roleId: 1 }));
      const useCase = new UpdateAdminUserUseCase(repo);
      await expect(useCase.execute(ACTOR, ACTOR.userId, { roleId: 2 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(useCase.execute(ACTOR, ACTOR.userId, { status: 'INACTIVE' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('chỉ Admin mới gán vai trò Admin', async () => {
      await expect(
        new UpdateAdminUserUseCase(repo).execute({ userId: 'ql', roleId: 2 }, ID, { roleId: 1 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('chặn vai trò không tồn tại, trạng thái lạ và SĐT trùng', async () => {
      const useCase = new UpdateAdminUserUseCase(repo);
      repo.findRoleById.mockResolvedValue(null);
      await expect(useCase.execute(ACTOR, ID, { roleId: 9 })).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(ACTOR, ID, { status: 'LOCKED' })).rejects.toThrow(
        BadRequestException,
      );
      repo.findByPhone.mockResolvedValue({ id: 'khac' });
      await expect(useCase.execute(ACTOR, ID, { phone: '0905123456' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('không có gì đổi thì không ghi DB', async () => {
      await new UpdateAdminUserUseCase(repo).execute(ACTOR, ID, { roleId: 3 });
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('SetUserPermissionsUseCase', () => {
    beforeEach(() => {
      repo.findById.mockResolvedValue(makeUser());
      repo.findPermissions.mockResolvedValue(
        [0, 1, 2, 3].map((b) => ({ bitPosition: b, permissionCode: `P${b}`, permissionName: '', module: '' })),
      );
      repo.setPermissions.mockResolvedValue(makeUser());
    });

    it('lưu mặt nạ và ghi nhật ký cũ/mới', async () => {
      await new SetUserPermissionsUseCase(repo).execute('admin-1', ID, {
        extraPermissions: '4',
        revokedPermissions: '1',
      });
      expect(repo.setPermissions).toHaveBeenCalledWith(
        ID,
        4n,
        1n,
        expect.objectContaining({
          action: 'USER_PERMISSIONS_UPDATE',
          oldData: { extraPermissions: '0', revokedPermissions: '0' },
          newData: { extraPermissions: '4', revokedPermissions: '1' },
        }),
      );
    });

    it('chặn bit vừa cấp vừa thu, bit lạ, số âm và tự thu hồi quyền', async () => {
      const useCase = new SetUserPermissionsUseCase(repo);
      await expect(
        useCase.execute('admin-1', ID, { extraPermissions: '2', revokedPermissions: '2' }),
      ).rejects.toThrow(BadRequestException);
      await expect(useCase.execute('admin-1', ID, { extraPermissions: '16' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(useCase.execute('admin-1', ID, { extraPermissions: '-1' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(useCase.execute(ID, ID, { revokedPermissions: '1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ném NotFound khi không có người dùng', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(new SetUserPermissionsUseCase(repo).execute('a', ID, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('SetUserStoresUseCase', () => {
    it('loại trùng, kiểm tra tồn tại và ghi nhật ký', async () => {
      repo.findById.mockResolvedValue(makeUser());
      repo.findExistingStoreIds.mockResolvedValue([STORE]);
      repo.setStores.mockResolvedValue(makeUser());
      await new SetUserStoresUseCase(repo).execute('admin-1', ID, [STORE, STORE]);
      expect(repo.setStores).toHaveBeenCalledWith(
        ID,
        [STORE],
        expect.objectContaining({ action: 'USER_STORES_UPDATE' }),
      );
    });

    it('chặn cửa hàng không tồn tại', async () => {
      repo.findById.mockResolvedValue(makeUser());
      repo.findExistingStoreIds.mockResolvedValue([]);
      await expect(new SetUserStoresUseCase(repo).execute('a', ID, [STORE])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('mảng rỗng là gỡ hết cửa hàng', async () => {
      repo.findById.mockResolvedValue(makeUser());
      repo.setStores.mockResolvedValue(makeUser());
      await new SetUserStoresUseCase(repo).execute('a', ID, []);
      expect(repo.findExistingStoreIds).not.toHaveBeenCalled();
      expect(repo.setStores).toHaveBeenCalledWith(ID, [], expect.anything());
    });
  });

  describe('Roles và permissions', () => {
    it('trả danh sách từ repository', async () => {
      repo.findRoles.mockResolvedValue([]);
      repo.findPermissions.mockResolvedValue([]);
      await expect(new GetRolesUseCase(repo).execute()).resolves.toEqual([]);
      await expect(new GetPermissionsUseCase(repo).execute()).resolves.toEqual([]);
    });
  });
});
