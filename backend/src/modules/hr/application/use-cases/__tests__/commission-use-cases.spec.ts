import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { ICommissionRepository } from '../../../domain/repositories/commission.repository.interface';
import { FinalizeCommissionsUseCase } from '../finalize-commissions.use-case';
import { GetCommissionsUseCase } from '../get-commissions.use-case';

const EID = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const STORE = 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
const OTHER = 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

const makeRepo = (): jest.Mocked<ICommissionRepository> => ({
  findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  summarize: jest.fn().mockResolvedValue([]),
  countByStatus: jest.fn().mockResolvedValue({ pending: 5, paid: 0 }),
  finalize: jest.fn().mockResolvedValue(5),
});
const scopeUc = (scope: object) =>
  ({ execute: jest.fn().mockResolvedValue(scope) }) as unknown as GetUserDataScopeUseCase;

describe('GetCommissionsUseCase', () => {
  const base = { page: 2, limit: 10, order: 'ASC' as const };

  it('trả danh sách kèm tổng; phân trang đúng', async () => {
    const repo = makeRepo();
    const uc = new GetCommissionsUseCase(repo, scopeUc({ type: 'ALL', storeIds: [], employeeId: null }));
    await uc.execute('u', { ...base, month: 9, year: 2026, status: 'PENDING' });
    expect(repo.findAll).toHaveBeenCalledWith(
      { employeeId: undefined, month: 9, year: 2026, status: 'PENDING' },
      { skip: 10, take: 10, order: 'asc' },
    );
    expect(repo.summarize).toHaveBeenCalled();
  });

  it('lọc tháng mà thiếu năm: 400', async () => {
    const uc = new GetCommissionsUseCase(makeRepo(), scopeUc({ type: 'ALL', storeIds: [], employeeId: null }));
    await expect(uc.execute('u', { ...base, month: 9 })).rejects.toThrow(BadRequestException);
  });

  it('STORE: giới hạn theo cửa hàng được gán; ngoài phạm vi: 403', async () => {
    const repo = makeRepo();
    const uc = new GetCommissionsUseCase(repo, scopeUc({ type: 'STORE', storeIds: [STORE], employeeId: null }));
    await uc.execute('u', base);
    expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ storeIds: [STORE] }), expect.anything());
    await expect(uc.execute('u', { ...base, storeId: OTHER })).rejects.toThrow(ForbiddenException);
  });

  it('SELF không có hồ sơ nhân viên: rỗng; có thì ép theo chính mình', async () => {
    const repo = makeRepo();
    const none = new GetCommissionsUseCase(repo, scopeUc({ type: 'SELF', storeIds: [], employeeId: null }));
    expect(await none.execute('u', base)).toEqual({ items: [], total: 0, summary: [] });
    const self = new GetCommissionsUseCase(repo, scopeUc({ type: 'SELF', storeIds: [], employeeId: EID }));
    await self.execute('u', { ...base, employeeId: 'khac' });
    expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ employeeId: EID }), expect.anything());
  });
});

describe('FinalizeCommissionsUseCase', () => {
  // 23/10/2026 giờ Việt Nam
  const now = new Date('2026-10-23T03:00:00Z');
  const all = scopeUc({ type: 'ALL', storeIds: [], employeeId: null });

  it('chốt tháng đã kết thúc: đổi trạng thái và trả số dòng', async () => {
    const repo = makeRepo();
    const result = await new FinalizeCommissionsUseCase(repo, all).execute('u', 9, 2026, now);
    expect(repo.finalize).toHaveBeenCalledWith(9, 2026);
    expect(result).toEqual({ month: 9, year: 2026, finalizedCount: 5 });
  });

  it('phạm vi không phải ALL: 403', async () => {
    const repo = makeRepo();
    const uc = new FinalizeCommissionsUseCase(repo, scopeUc({ type: 'STORE', storeIds: [STORE], employeeId: null }));
    await expect(uc.execute('u', 9, 2026, now)).rejects.toThrow(ForbiddenException);
    expect(repo.finalize).not.toHaveBeenCalled();
  });

  it('tháng hiện tại hoặc tương lai: 400', async () => {
    const uc = new FinalizeCommissionsUseCase(makeRepo(), all);
    await expect(uc.execute('u', 10, 2026, now)).rejects.toThrow(BadRequestException);
    await expect(uc.execute('u', 1, 2027, now)).rejects.toThrow(BadRequestException);
  });

  it('tháng cuối năm trước vẫn chốt được khi đang ở tháng 1', async () => {
    const repo = makeRepo();
    await new FinalizeCommissionsUseCase(repo, all).execute('u', 12, 2026, new Date('2027-01-05T03:00:00Z'));
    expect(repo.finalize).toHaveBeenCalledWith(12, 2026);
  });

  it('đã chốt rồi: 409, không chốt lại', async () => {
    const repo = makeRepo();
    repo.countByStatus.mockResolvedValue({ pending: 0, paid: 4 });
    await expect(new FinalizeCommissionsUseCase(repo, all).execute('u', 9, 2026, now)).rejects.toThrow(
      ConflictException,
    );
    expect(repo.finalize).not.toHaveBeenCalled();
  });

  it('không có dòng chờ chốt: 409', async () => {
    const repo = makeRepo();
    repo.countByStatus.mockResolvedValue({ pending: 0, paid: 0 });
    await expect(new FinalizeCommissionsUseCase(repo, all).execute('u', 9, 2026, now)).rejects.toThrow(
      ConflictException,
    );
  });
});
