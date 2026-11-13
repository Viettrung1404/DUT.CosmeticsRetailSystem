import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataScope } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { ReturnAccessService } from '../../services/return-access.service';
import { ListAdminReturnsUseCase } from '../list-admin-returns.use-case';
import { GetAdminReturnDetailUseCase } from '../get-admin-return-detail.use-case';
import { ApproveAdminReturnUseCase } from '../approve-admin-return.use-case';
import { InspectAdminReturnUseCase } from '../inspect-admin-return.use-case';
import { CompleteAdminReturnUseCase } from '../complete-admin-return.use-case';
import { storeIdsForList } from '../../utils/scope.util';

const ALL: DataScope = { type: 'ALL', storeIds: [], employeeId: null };
const store = (...ids: string[]): DataScope => ({ type: 'STORE', storeIds: ids, employeeId: 'e1' });
const SELF: DataScope = { type: 'SELF', storeIds: [], employeeId: 'e1' };

function setup(scope: DataScope, info: Record<string, string> | null = { id: 'r1', storeId: 'S1', status: 'REQUESTED', returnType: 'REFUND' }) {
  const repository = {
    findAccessInfo: jest.fn().mockResolvedValue(info),
    list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    findDetail: jest.fn().mockResolvedValue({ id: 'r1', status: info?.status ?? 'REQUESTED', items: [] }),
    approve: jest.fn(),
    inspect: jest.fn().mockResolvedValue({ restockedQuantity: 1, damagedQuantity: 0, refundsReserved: true, quotePrepared: false }),
    complete: jest.fn(),
  };
  const scopeUc = { execute: jest.fn().mockResolvedValue(scope) };
  const access = new ReturnAccessService(repository as never, scopeUc as never);
  const getDetail = new GetAdminReturnDetailUseCase(repository as never, access);
  return { repository, scopeUc, access, getDetail };
}

describe('storeIdsForList', () => {
  it('ALL: không giới hạn, hoặc đúng cửa hàng được lọc', () => {
    expect(storeIdsForList(ALL)).toBeUndefined();
    expect(storeIdsForList(ALL, 'S9')).toEqual(['S9']);
  });
  it('STORE: mặc định các cửa hàng của mình; lọc cửa hàng ngoài phạm vi ra rỗng', () => {
    expect(storeIdsForList(store('S1', 'S2'))).toEqual(['S1', 'S2']);
    expect(storeIdsForList(store('S1'), 'S1')).toEqual(['S1']);
    expect(storeIdsForList(store('S1'), 'S9')).toEqual([]);
  });
  it('SELF: không thấy gì', () => {
    expect(storeIdsForList(SELF)).toEqual([]);
  });
});

describe('ListAdminReturnsUseCase', () => {
  it('Quản lý chỉ truy vấn cửa hàng của mình', async () => {
    const { repository, scopeUc } = setup(store('S1'));
    await new ListAdminReturnsUseCase(repository as never, scopeUc as never).execute('u', { page: 1, limit: 20 });
    expect(repository.list).toHaveBeenCalledWith(expect.objectContaining({ storeIds: ['S1'] }));
  });
  it('Quản lý lọc cửa hàng khác: trả rỗng, không chạm DB', async () => {
    const { repository, scopeUc } = setup(store('S1'));
    const res = await new ListAdminReturnsUseCase(repository as never, scopeUc as never).execute('u', {
      page: 1,
      limit: 20,
      storeId: 'S2',
    });
    expect(res).toEqual({ items: [], total: 0 });
    expect(repository.list).not.toHaveBeenCalled();
  });
  it('Admin xem toàn chuỗi (storeIds undefined)', async () => {
    const { repository, scopeUc } = setup(ALL);
    await new ListAdminReturnsUseCase(repository as never, scopeUc as never).execute('u', { page: 1, limit: 20, status: 'REQUESTED' });
    expect(repository.list).toHaveBeenCalledWith(expect.objectContaining({ storeIds: undefined, status: 'REQUESTED' }));
  });
});

describe('phạm vi cửa hàng khi xử lý', () => {
  it('Quản lý cửa hàng khác xem chi tiết -> 403', async () => {
    const { getDetail } = setup(store('S2'));
    await expect(getDetail.execute('u', 'r1')).rejects.toThrow(ForbiddenException);
  });
  it('không có yêu cầu -> 404', async () => {
    const { getDetail } = setup(ALL, null);
    await expect(getDetail.execute('u', 'r1')).rejects.toThrow(NotFoundException);
  });
  it('duyệt yêu cầu của cửa hàng khác -> 403, không gọi repository', async () => {
    const { repository, access, getDetail } = setup(store('S2'));
    await expect(new ApproveAdminReturnUseCase(repository as never, access, getDetail).execute('u', 'r1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(repository.approve).not.toHaveBeenCalled();
  });
  it('SELF không xử lý được', async () => {
    const { repository, access, getDetail } = setup(SELF);
    await expect(new ApproveAdminReturnUseCase(repository as never, access, getDetail).execute('u', 'r1')).rejects.toThrow(
      ForbiddenException,
    );
  });
  it('Quản lý đúng cửa hàng duyệt được và nhận chi tiết kèm actions', async () => {
    const { repository, access, getDetail } = setup(store('S1'));
    const res = await new ApproveAdminReturnUseCase(repository as never, access, getDetail).execute('u', 'r1', 'ok');
    expect(repository.approve).toHaveBeenCalledWith({ id: 'r1', actorId: 'u', note: 'ok' });
    expect(res.actions.canApprove).toBe(true);
  });
  it('Admin duyệt được yêu cầu bất kỳ cửa hàng', async () => {
    const { repository, access, getDetail } = setup(ALL, { id: 'r1', storeId: 'S9', status: 'REQUESTED', returnType: 'REFUND' });
    await new ApproveAdminReturnUseCase(repository as never, access, getDetail).execute('u', 'r1');
    expect(repository.approve).toHaveBeenCalled();
  });
});

describe('chặn sai trạng thái ngay ở use case', () => {
  it('kiểm định khi mới ở REQUESTED -> 409, repository không được gọi', async () => {
    const { repository, access, getDetail } = setup(ALL);
    await expect(
      new InspectAdminReturnUseCase(repository as never, access, getDetail).execute('u', 'r1', [
        { returnOrderItemId: 'i', condition: 'DAMAGED' },
      ]),
    ).rejects.toThrow(/Không thể chuyển/);
    expect(repository.inspect).not.toHaveBeenCalled();
  });
  it('kiểm định không có dòng nào -> 400', async () => {
    const { repository, access, getDetail } = setup(ALL, { id: 'r1', storeId: 'S1', status: 'RECEIVED', returnType: 'REFUND' });
    await expect(new InspectAdminReturnUseCase(repository as never, access, getDetail).execute('u', 'r1', [])).rejects.toThrow(
      /ít nhất một dòng/,
    );
  });
  it('hoàn tất khi chưa kiểm định -> 409; đã kiểm định thì gọi repository', async () => {
    const early = setup(ALL, { id: 'r1', storeId: 'S1', status: 'RECEIVED', returnType: 'REFUND' });
    await expect(
      new CompleteAdminReturnUseCase(early.repository as never, early.access, early.getDetail).execute('u', 'r1'),
    ).rejects.toThrow(/Không thể chuyển/);
    expect(early.repository.complete).not.toHaveBeenCalled();

    const ok = setup(ALL, { id: 'r1', storeId: 'S1', status: 'INSPECTED', returnType: 'REFUND' });
    await new CompleteAdminReturnUseCase(ok.repository as never, ok.access, ok.getDetail).execute('u', 'r1');
    expect(ok.repository.complete).toHaveBeenCalledWith({ id: 'r1', actorId: 'u' });
  });
});
