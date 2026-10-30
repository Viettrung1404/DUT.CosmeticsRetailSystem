import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { AttendanceRecord } from '../../../domain/entities/attendance.entity';
import { IAttendanceRepository } from '../../../domain/repositories/attendance.repository.interface';
import { CheckInUseCase } from '../check-in.use-case';
import { CheckOutUseCase } from '../check-out.use-case';
import { GetAttendanceUseCase } from '../get-attendance.use-case';

const EID = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const STORE = 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
const OTHER = 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

// 01:30 UTC = 08:30 giờ Việt Nam, 23/10/2026
const at = (vnHHmm: string): Date => {
  const [h, m] = vnHHmm.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, 23, h - 7, m));
};

const record = (over: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  id: 'row1',
  shiftStart: '08:00',
  checkInAt: null,
  checkOutAt: null,
  ...over,
});

const makeRepo = (): jest.Mocked<IAttendanceRepository> => ({
  findEmployeeByUserId: jest.fn().mockResolvedValue({ id: EID, storeId: STORE, status: 'ACTIVE' }),
  findRecordsOfDay: jest.fn().mockResolvedValue([]),
  fillCheckIn: jest.fn().mockResolvedValue(true),
  createCheckedIn: jest.fn().mockResolvedValue('new1'),
  fillCheckOut: jest.fn().mockResolvedValue(true),
  findById: jest.fn().mockResolvedValue({ id: 'x' }),
  findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
});

describe('CheckInUseCase', () => {
  let repo: jest.Mocked<IAttendanceRepository>;
  let uc: CheckInUseCase;
  beforeEach(() => {
    repo = makeRepo();
    uc = new CheckInUseCase(repo);
  });

  it('tài khoản không có hồ sơ nhân viên: 403', async () => {
    repo.findEmployeeByUserId.mockResolvedValue(null);
    await expect(uc.execute('u')).rejects.toThrow(ForbiddenException);
  });

  it('nhân viên đã nghỉ việc: 403', async () => {
    repo.findEmployeeByUserId.mockResolvedValue({ id: EID, storeId: STORE, status: 'RESIGNED' });
    await expect(uc.execute('u')).rejects.toThrow(ForbiddenException);
  });

  it('có ca đã phân, vào đúng giờ: PRESENT', async () => {
    repo.findRecordsOfDay.mockResolvedValue([record()]);
    await uc.execute('u', at('08:10'));
    expect(repo.fillCheckIn).toHaveBeenCalledWith('row1', at('08:10'), 'PRESENT');
  });

  it('trễ đúng 15 phút vẫn PRESENT, quá 15 phút là LATE', async () => {
    repo.findRecordsOfDay.mockResolvedValue([record()]);
    await uc.execute('u', at('08:15'));
    expect(repo.fillCheckIn).toHaveBeenLastCalledWith('row1', at('08:15'), 'PRESENT');
    await uc.execute('u', at('08:16'));
    expect(repo.fillCheckIn).toHaveBeenLastCalledWith('row1', at('08:16'), 'LATE');
  });

  it('hai ca trong ngày: chọn ca có giờ bắt đầu gần nhất', async () => {
    repo.findRecordsOfDay.mockResolvedValue([
      record({ id: 'sang', shiftStart: '08:00' }),
      record({ id: 'chieu', shiftStart: '13:00' }),
    ]);
    await uc.execute('u', at('12:55'));
    expect(repo.fillCheckIn).toHaveBeenCalledWith('chieu', at('12:55'), 'PRESENT');
  });

  it('không có lịch phân ca: tạo dòng mới PRESENT', async () => {
    await uc.execute('u', at('09:00'));
    expect(repo.createCheckedIn).toHaveBeenCalledWith(EID, expect.any(Date), at('09:00'), 'PRESENT');
  });

  it('đang trong ca chưa chấm ra: 409', async () => {
    repo.findRecordsOfDay.mockResolvedValue([record({ checkInAt: at('08:00') })]);
    await expect(uc.execute('u', at('09:00'))).rejects.toThrow(ConflictException);
  });

  it('đã chấm vào và ra hết các dòng của ngày, không còn lịch: 409', async () => {
    repo.findRecordsOfDay.mockResolvedValue([record({ checkInAt: at('08:00'), checkOutAt: at('12:00') })]);
    await expect(uc.execute('u', at('13:00'))).rejects.toThrow(ConflictException);
    expect(repo.createCheckedIn).not.toHaveBeenCalled();
  });

  it('hai lần bấm đồng thời (cập nhật có điều kiện trả false): 409', async () => {
    repo.findRecordsOfDay.mockResolvedValue([record()]);
    repo.fillCheckIn.mockResolvedValue(false);
    await expect(uc.execute('u', at('08:00'))).rejects.toThrow(ConflictException);
  });
});

describe('CheckOutUseCase', () => {
  it('chưa chấm vào: 409', async () => {
    const repo = makeRepo();
    await expect(new CheckOutUseCase(repo).execute('u', at('17:00'))).rejects.toThrow(ConflictException);
  });

  it('đã chấm vào: ghi giờ ra', async () => {
    const repo = makeRepo();
    repo.findRecordsOfDay.mockResolvedValue([record({ checkInAt: at('08:00') })]);
    await new CheckOutUseCase(repo).execute('u', at('17:00'));
    expect(repo.fillCheckOut).toHaveBeenCalledWith('row1', at('17:00'));
  });

  it('đã chấm ra rồi: 409', async () => {
    const repo = makeRepo();
    repo.findRecordsOfDay.mockResolvedValue([record({ checkInAt: at('08:00'), checkOutAt: at('12:00') })]);
    await expect(new CheckOutUseCase(repo).execute('u', at('17:00'))).rejects.toThrow(ConflictException);
  });
});

describe('GetAttendanceUseCase', () => {
  const base = { page: 1, limit: 20, order: 'DESC' as const };
  const build = (scope: object) => {
    const repo = makeRepo();
    const getScope = { execute: jest.fn().mockResolvedValue(scope) } as unknown as GetUserDataScopeUseCase;
    return { repo, uc: new GetAttendanceUseCase(repo, getScope) };
  };

  it('ALL: không giới hạn, lọc cửa hàng nếu có', async () => {
    const { repo, uc } = build({ type: 'ALL', storeIds: [], employeeId: null });
    await uc.execute('u', { ...base, storeId: STORE, from: '2026-10-01', to: '2026-10-31' });
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        storeIds: [STORE],
        from: new Date('2026-10-01T00:00:00.000Z'),
        to: new Date('2026-10-31T00:00:00.000Z'),
      }),
    );
  });

  it('STORE: mặc định các cửa hàng được gán; cửa hàng ngoài phạm vi: 403', async () => {
    const { repo, uc } = build({ type: 'STORE', storeIds: [STORE], employeeId: null });
    await uc.execute('u', base);
    expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ storeIds: [STORE] }));
    await expect(uc.execute('u', { ...base, storeId: OTHER })).rejects.toThrow(ForbiddenException);
  });

  it('SELF: ép lọc theo chính mình, bỏ qua employeeId gửi lên', async () => {
    const { repo, uc } = build({ type: 'SELF', storeIds: [], employeeId: EID });
    await uc.execute('u', { ...base, employeeId: 'ai-do-khac' });
    expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ employeeId: EID }));
  });

  it('khoảng ngày ngược: 400', async () => {
    const { uc } = build({ type: 'ALL', storeIds: [], employeeId: null });
    await expect(uc.execute('u', { ...base, from: '2026-10-31', to: '2026-10-01' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
