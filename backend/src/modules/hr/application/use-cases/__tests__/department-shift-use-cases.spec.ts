import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataScope, GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { DepartmentView } from '../../../domain/entities/department.entity';
import { ShiftView } from '../../../domain/entities/shift.entity';
import { IDepartmentRepository } from '../../../domain/repositories/department.repository.interface';
import { IShiftRepository } from '../../../domain/repositories/shift.repository.interface';
import { CreateDepartmentUseCase } from '../create-department.use-case';
import { CreateShiftUseCase } from '../create-shift.use-case';
import { DeleteDepartmentUseCase } from '../delete-department.use-case';
import { DeleteShiftUseCase } from '../delete-shift.use-case';
import { GetShiftsUseCase } from '../get-shifts.use-case';
import { UpdateDepartmentUseCase } from '../update-department.use-case';
import { UpdateShiftUseCase } from '../update-shift.use-case';

const ID = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const STORE = 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
const OTHER = 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

const dept = (over: Partial<DepartmentView> = {}): DepartmentView => ({
  id: ID,
  name: 'Bán hàng',
  description: null,
  employeeCount: 0,
  createdAt: new Date(),
  ...over,
});
const shift = (over: Partial<ShiftView> = {}): ShiftView => ({
  id: ID,
  storeId: STORE,
  storeName: 'CH01',
  name: 'Ca sáng',
  startTime: '08:00',
  endTime: '12:00',
  ...over,
});
const scopeOf = (over: Partial<DataScope>): jest.Mocked<Pick<GetUserDataScopeUseCase, 'execute'>> => ({
  execute: jest.fn().mockResolvedValue({ type: 'STORE', storeIds: [STORE], employeeId: null, ...over }),
});

describe('Department use cases', () => {
  let repo: jest.Mocked<IDepartmentRepository>;
  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(dept()),
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (d) => dept(d)),
      update: jest.fn().mockImplementation(async (_id, d) => dept(d)),
      countEmployees: jest.fn().mockResolvedValue(0),
      delete: jest.fn(),
    };
  });

  it('tạo phòng ban: cắt khoảng trắng', async () => {
    await new CreateDepartmentUseCase(repo).execute({ name: '  Kho  ' });
    expect(repo.create).toHaveBeenCalledWith({ name: 'Kho', description: null });
  });

  it('tạo phòng ban trùng tên: 409', async () => {
    repo.findByName.mockResolvedValue({ id: 'x' });
    await expect(new CreateDepartmentUseCase(repo).execute({ name: 'Kho' })).rejects.toThrow(ConflictException);
  });

  it('sửa phòng ban: đổi sang tên của phòng khác bị 409, giữ tên của chính nó thì được', async () => {
    const uc = new UpdateDepartmentUseCase(repo);
    repo.findByName.mockResolvedValue({ id: 'khac' });
    await expect(uc.execute(ID, { name: 'Kho' })).rejects.toThrow(ConflictException);
    repo.findByName.mockResolvedValue({ id: ID });
    await expect(uc.execute(ID, { name: 'Kho' })).resolves.toBeDefined();
  });

  it('sửa phòng ban không tồn tại: 404', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(new UpdateDepartmentUseCase(repo).execute(ID, {})).rejects.toThrow(NotFoundException);
  });

  it('xóa phòng ban còn nhân viên: 409, không xóa', async () => {
    repo.countEmployees.mockResolvedValue(3);
    await expect(new DeleteDepartmentUseCase(repo).execute(ID)).rejects.toThrow(ConflictException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('xóa phòng ban trống: xóa', async () => {
    await new DeleteDepartmentUseCase(repo).execute(ID);
    expect(repo.delete).toHaveBeenCalledWith(ID);
  });
});

describe('Shift use cases', () => {
  let repo: jest.Mocked<IShiftRepository>;
  beforeEach(() => {
    repo = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(shift()),
      storeExists: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockImplementation(async (d) => shift(d)),
      update: jest.fn().mockImplementation(async (_id, d) => shift(d)),
      countAttendance: jest.fn().mockResolvedValue(0),
      delete: jest.fn(),
    };
  });
  const input = { storeId: STORE, name: ' Ca sáng ', startTime: '08:00', endTime: '12:00' };

  it('tạo ca trong cửa hàng được gán', async () => {
    await new CreateShiftUseCase(repo, scopeOf({}) as never).execute('u', input);
    expect(repo.create).toHaveBeenCalledWith({ ...input, name: 'Ca sáng' });
  });

  it('giờ kết thúc không sau giờ bắt đầu: 400', async () => {
    const uc = new CreateShiftUseCase(repo, scopeOf({}) as never);
    await expect(uc.execute('u', { ...input, endTime: '08:00' })).rejects.toThrow(BadRequestException);
  });

  it('tạo ca ở cửa hàng ngoài phạm vi: 403', async () => {
    const uc = new CreateShiftUseCase(repo, scopeOf({}) as never);
    await expect(uc.execute('u', { ...input, storeId: OTHER })).rejects.toThrow(ForbiddenException);
  });

  it('ca dùng chung (không storeId) chỉ phạm vi ALL được tạo', async () => {
    const dto = { ...input, storeId: undefined };
    await expect(new CreateShiftUseCase(repo, scopeOf({}) as never).execute('u', dto)).rejects.toThrow(
      ForbiddenException,
    );
    await new CreateShiftUseCase(repo, scopeOf({ type: 'ALL' }) as never).execute('u', dto);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ storeId: null }));
  });

  it('cửa hàng không tồn tại: 404', async () => {
    repo.storeExists.mockResolvedValue(false);
    await expect(new CreateShiftUseCase(repo, scopeOf({ type: 'ALL' }) as never).execute('u', input)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('sửa ca: kiểm tra giờ trên giá trị gộp với giá trị cũ', async () => {
    const uc = new UpdateShiftUseCase(repo, scopeOf({}) as never);
    await expect(uc.execute('u', ID, { endTime: '07:00' })).rejects.toThrow(BadRequestException);
    await expect(uc.execute('u', ID, { endTime: '13:00' })).resolves.toBeDefined();
  });

  it('sửa / xóa ca của cửa hàng khác: 403', async () => {
    repo.findById.mockResolvedValue(shift({ storeId: OTHER }));
    await expect(new UpdateShiftUseCase(repo, scopeOf({}) as never).execute('u', ID, {})).rejects.toThrow(
      ForbiddenException,
    );
    await expect(new DeleteShiftUseCase(repo, scopeOf({}) as never).execute('u', ID)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('xóa ca đã có chấm công: 409; chưa có thì xóa', async () => {
    const uc = new DeleteShiftUseCase(repo, scopeOf({}) as never);
    repo.countAttendance.mockResolvedValue(2);
    await expect(uc.execute('u', ID)).rejects.toThrow(ConflictException);
    repo.countAttendance.mockResolvedValue(0);
    await uc.execute('u', ID);
    expect(repo.delete).toHaveBeenCalledWith(ID);
  });

  it('danh sách ca: STORE lọc theo cửa hàng được gán; lọc cửa hàng ngoài phạm vi: 403', async () => {
    const uc = new GetShiftsUseCase(repo, scopeOf({}) as never);
    await uc.execute('u');
    expect(repo.findAll).toHaveBeenCalledWith({ storeIds: [STORE], storeId: undefined });
    await expect(uc.execute('u', OTHER)).rejects.toThrow(ForbiddenException);
  });

  it('danh sách ca: ALL không giới hạn cửa hàng', async () => {
    await new GetShiftsUseCase(repo, scopeOf({ type: 'ALL' }) as never).execute('u');
    expect(repo.findAll).toHaveBeenCalledWith({ storeIds: undefined, storeId: undefined });
  });
});
