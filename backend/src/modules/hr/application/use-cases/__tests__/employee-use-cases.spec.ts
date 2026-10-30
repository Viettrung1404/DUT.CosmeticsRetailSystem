import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateAdminUserUseCase } from '@modules/users/application/use-cases/create-admin-user.use-case';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { EmployeeView } from '../../../domain/entities/employee.entity';
import { IEmployeeRepository } from '../../../domain/repositories/employee.repository.interface';
import { CreateEmployeeUseCase } from '../create-employee.use-case';
import { GetEmployeesUseCase } from '../get-employees.use-case';
import { UpdateEmployeeUseCase } from '../update-employee.use-case';

const EID = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const UID = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const STORE = 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
const OTHER_STORE = 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
const ACTOR = 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';

const makeEmployee = (over: Partial<EmployeeView> = {}): EmployeeView => ({
  id: EID,
  userId: UID,
  employeeCode: 'NV003',
  fullName: 'An',
  email: 'an@glowup.local',
  phone: null,
  roleId: 3,
  roleName: 'sales_staff',
  userStatus: 'ACTIVE',
  position: 'Thu ngân',
  departmentId: null,
  departmentName: null,
  storeId: STORE,
  storeName: 'CH01',
  hireDate: new Date('2026-10-01'),
  salary: null,
  commissionRate: 0,
  status: 'ACTIVE',
  ...over,
});

describe('Employee use cases', () => {
  let repo: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      departmentExists: jest.fn().mockResolvedValue(true),
      storeExists: jest.fn().mockResolvedValue(true),
      findPhoneOwner: jest.fn().mockResolvedValue(null),
      findMaxEmployeeNumber: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
    };
  });

  describe('CreateEmployeeUseCase', () => {
    let createUser: jest.Mocked<Pick<CreateAdminUserUseCase, 'execute'>>;
    const input = {
      email: 'an@glowup.local',
      fullName: 'An',
      roleId: 3,
      position: ' Thu ngân ',
      hireDate: new Date('2026-10-01'),
      storeId: STORE,
    };

    beforeEach(() => {
      createUser = { execute: jest.fn().mockResolvedValue({ user: { id: UID }, activationEmailSent: true }) };
      repo.findByUserId.mockResolvedValue(makeEmployee());
    });

    const build = () => new CreateEmployeeUseCase(repo, createUser as unknown as CreateAdminUserUseCase);

    it('tự sinh mã NV theo số lớn nhất hiện có và truyền hồ sơ cho use case tạo tài khoản', async () => {
      repo.findMaxEmployeeNumber.mockResolvedValue(9);
      const result = await build().execute(input);

      const arg = createUser.execute.mock.calls[0][0];
      expect(arg.employee).toMatchObject({
        employeeCode: 'NV010',
        position: 'Thu ngân',
        storeId: STORE,
        commissionRate: 0,
      });
      expect(result.employee.userId).toBe(UID);
      expect(result.activationEmailSent).toBe(true);
    });

    it('dùng mã nhân viên do người gọi gửi, viết hoa', async () => {
      await build().execute({ ...input, employeeCode: 'vip-01' });
      expect(createUser.execute.mock.calls[0][0].employee?.employeeCode).toBe('VIP-01');
      expect(repo.findMaxEmployeeNumber).not.toHaveBeenCalled();
    });

    it('chặn phòng ban không tồn tại, không tạo tài khoản', async () => {
      repo.departmentExists.mockResolvedValue(false);
      await expect(build().execute({ ...input, departmentId: EID })).rejects.toThrow(
        BadRequestException,
      );
      expect(createUser.execute).not.toHaveBeenCalled();
    });
  });

  describe('UpdateEmployeeUseCase', () => {
    beforeEach(() => {
      repo.findById.mockResolvedValue(makeEmployee());
      repo.update.mockResolvedValue(makeEmployee());
    });

    it('ném NotFound khi không có nhân viên', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(new UpdateEmployeeUseCase(repo).execute(ACTOR, EID, {})).rejects.toThrow(NotFoundException);
    });

    it('cắt khoảng trắng và chuyển SĐT rỗng thành null', async () => {
      await new UpdateEmployeeUseCase(repo).execute(ACTOR, EID, { fullName: ' Bình ', phone: '' });
      expect(repo.update).toHaveBeenCalledWith(EID, { fullName: 'Bình', phone: null }, ACTOR);
    });

    it('chặn SĐT của người khác nhưng cho giữ SĐT của chính mình', async () => {
      const useCase = new UpdateEmployeeUseCase(repo);
      repo.findPhoneOwner.mockResolvedValue({ id: 'nguoi-khac' });
      await expect(useCase.execute(ACTOR, EID, { phone: '0905123456' })).rejects.toThrow(ConflictException);
      repo.findPhoneOwner.mockResolvedValue({ id: UID });
      await expect(useCase.execute(ACTOR, EID, { phone: '0905123456' })).resolves.toBeDefined();
    });

    it('chặn phòng ban, cửa hàng không tồn tại và trạng thái lạ', async () => {
      const useCase = new UpdateEmployeeUseCase(repo);
      repo.departmentExists.mockResolvedValue(false);
      await expect(useCase.execute(ACTOR, EID, { departmentId: OTHER_STORE })).rejects.toThrow(
        BadRequestException,
      );
      repo.storeExists.mockResolvedValue(false);
      await expect(useCase.execute(ACTOR, EID, { storeId: OTHER_STORE })).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(ACTOR, EID, { status: 'FIRED' })).rejects.toThrow(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('cho phép bỏ phòng ban và cửa hàng bằng null', async () => {
      await new UpdateEmployeeUseCase(repo).execute(ACTOR, EID, { departmentId: null, storeId: null });
      expect(repo.departmentExists).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(EID, { departmentId: null, storeId: null }, ACTOR);
    });
  });

  describe('GetEmployeesUseCase', () => {
    let scope: jest.Mocked<Pick<GetUserDataScopeUseCase, 'execute'>>;
    const query = { page: 2, limit: 10, order: 'ASC' as const };
    const build = () => new GetEmployeesUseCase(repo, scope as unknown as GetUserDataScopeUseCase);

    beforeEach(() => {
      scope = { execute: jest.fn() };
      repo.findAll.mockResolvedValue({ items: [], total: 0 });
    });

    it('phạm vi ALL: không giới hạn cửa hàng, lọc theo storeId khi có', async () => {
      scope.execute.mockResolvedValue({ type: 'ALL', storeIds: [], employeeId: null });
      await build().execute('u', { ...query, storeId: STORE });
      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10, order: 'asc', storeIds: [STORE] }),
      );
    });

    it('phạm vi STORE: chỉ các cửa hàng được gán; chặn cửa hàng ngoài phạm vi', async () => {
      scope.execute.mockResolvedValue({ type: 'STORE', storeIds: [STORE], employeeId: null });
      await build().execute('u', query);
      expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ storeIds: [STORE] }));
      await expect(build().execute('u', { ...query, storeId: OTHER_STORE })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('phạm vi SELF: chỉ chính mình, không có hồ sơ nhân viên thì rỗng', async () => {
      scope.execute.mockResolvedValue({ type: 'SELF', storeIds: [], employeeId: EID });
      await build().execute('u', query);
      expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ employeeId: EID }));

      repo.findAll.mockClear();
      scope.execute.mockResolvedValue({ type: 'SELF', storeIds: [], employeeId: null });
      await expect(build().execute('u', query)).resolves.toEqual({ items: [], total: 0 });
      expect(repo.findAll).not.toHaveBeenCalled();
    });
  });
});
