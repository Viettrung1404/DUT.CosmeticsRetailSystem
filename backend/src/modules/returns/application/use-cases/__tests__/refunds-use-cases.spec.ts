import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DataScope } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { RefundAccessService } from '../../services/refund-access.service';
import { GetAdminRefundDetailUseCase } from '../get-admin-refund-detail.use-case';
import { ListAdminRefundsUseCase } from '../list-admin-refunds.use-case';
import { ProcessAdminRefundUseCase } from '../process-admin-refund.use-case';
import { RejectAdminRefundUseCase } from '../reject-admin-refund.use-case';

const ALL: DataScope = { type: 'ALL', storeIds: [], employeeId: null };
const store = (...ids: string[]): DataScope => ({ type: 'STORE', storeIds: ids, employeeId: 'e1' });

function setup(
  scope: DataScope,
  info: { status?: string; paymentMethod?: string | null; storeId?: string } = {},
  openSessionStores: string[] = ['S1'],
) {
  const access_info = {
    id: 'rf1',
    status: info.status ?? 'PENDING',
    storeId: info.storeId ?? 'S1',
    amount: 100000,
    paymentMethod: info.paymentMethod === undefined ? 'COD' : info.paymentMethod,
  };
  const repository = {
    findAccessInfo: jest.fn().mockResolvedValue(access_info),
    findDetail: jest.fn().mockResolvedValue({ ...access_info, processing: [] }),
    list: jest.fn().mockResolvedValue({
      items: [
        { id: 'a', status: 'PENDING', paymentMethod: 'COD', storeId: 'S1' },
        { id: 'b', status: 'PENDING', paymentMethod: 'SEPAY', storeId: 'S1' },
        { id: 'c', status: 'COMPLETED', paymentMethod: 'COD', storeId: 'S1' },
      ],
      total: 3,
    }),
    process: jest.fn(),
    reject: jest.fn(),
    findOpenSessionId: jest.fn(async (_u: string, storeId: string) =>
      openSessionStores.includes(storeId) ? `ses-${storeId}` : null,
    ),
    findOpenSessionStoreIds: jest.fn().mockResolvedValue(openSessionStores),
  };
  const scopeUc = { execute: jest.fn().mockResolvedValue(scope) };
  const access = new RefundAccessService(repository as never, scopeUc as never);
  const getDetail = new GetAdminRefundDetailUseCase(repository as never, access);
  return { repository, scopeUc, access, getDetail };
}

describe('ProcessAdminRefundUseCase', () => {
  it('Quản lý hoàn tiền mặt khoản COD tại cửa hàng mình, đang mở ca -> ghi vào ca', async () => {
    const { repository, access, getDetail } = setup(store('S1'));
    await new ProcessAdminRefundUseCase(repository as never, access, getDetail).execute('u', 'rf1', { method: 'CASH' });
    expect(repository.process).toHaveBeenCalledWith({
      id: 'rf1',
      actorId: 'u',
      method: 'CASH',
      posSessionId: 'ses-S1',
    });
  });

  it('Quản lý chưa mở ca tại cửa hàng của đơn -> 400, không ghi', async () => {
    const { repository, access, getDetail } = setup(store('S1'), {}, []);
    await expect(
      new ProcessAdminRefundUseCase(repository as never, access, getDetail).execute('u', 'rf1', { method: 'CASH' }),
    ).rejects.toThrow(/mở ca POS/);
    expect(repository.process).not.toHaveBeenCalled();
  });

  it('Quản lý hoàn khoản khách đã trả qua cổng -> 403, không ghi', async () => {
    const { repository, access, getDetail } = setup(store('S1'), { paymentMethod: 'SEPAY' });
    await expect(
      new ProcessAdminRefundUseCase(repository as never, access, getDetail).execute('u', 'rf1', { method: 'CASH' }),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.process).not.toHaveBeenCalled();
  });

  it('Quản lý hoàn phiếu của cửa hàng khác -> 403', async () => {
    const { repository, access, getDetail } = setup(store('S2'));
    await expect(
      new ProcessAdminRefundUseCase(repository as never, access, getDetail).execute('u', 'rf1', { method: 'CASH' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Kế toán (ALL) chuyển khoản phải có mã tham chiếu', async () => {
    const { repository, access, getDetail } = setup(ALL, { paymentMethod: 'SEPAY' });
    const uc = new ProcessAdminRefundUseCase(repository as never, access, getDetail);
    await expect(uc.execute('u', 'rf1', { method: 'BANK_TRANSFER' })).rejects.toThrow(BadRequestException);
    await uc.execute('u', 'rf1', { method: 'BANK_TRANSFER', reference: 'FT999', note: 'đã chuyển' });
    expect(repository.findOpenSessionId).not.toHaveBeenCalled();
    expect(repository.process).toHaveBeenCalledWith({
      id: 'rf1',
      actorId: 'u',
      method: 'BANK_TRANSFER',
      posSessionId: null,
      reference: 'FT999',
      note: 'đã chuyển',
    });
  });

  it('phiếu đã hoàn -> 409 trước khi kiểm quyền phương thức', async () => {
    const { repository, access, getDetail } = setup(ALL, { status: 'COMPLETED' });
    await expect(
      new ProcessAdminRefundUseCase(repository as never, access, getDetail).execute('u', 'rf1', { method: 'CASH' }),
    ).rejects.toThrow(ConflictException);
    expect(repository.process).not.toHaveBeenCalled();
  });
});

describe('RejectAdminRefundUseCase', () => {
  it('Quản lý từ chối được phiếu tiền mặt của cửa hàng mình', async () => {
    const { repository, access, getDetail } = setup(store('S1'));
    await new RejectAdminRefundUseCase(repository as never, access, getDetail).execute('u', 'rf1', 'Thiếu thông tin');
    expect(repository.reject).toHaveBeenCalledWith({ id: 'rf1', actorId: 'u', reason: 'Thiếu thông tin' });
  });
  it('Quản lý không từ chối được phiếu qua cổng (việc của Kế toán)', async () => {
    const { repository, access, getDetail } = setup(store('S1'), { paymentMethod: 'VNPAY' });
    await expect(
      new RejectAdminRefundUseCase(repository as never, access, getDetail).execute('u', 'rf1', 'x'),
    ).rejects.toThrow(ForbiddenException);
  });
  it('phiếu đã hoàn không từ chối được', async () => {
    const { repository, access, getDetail } = setup(ALL, { status: 'COMPLETED' });
    await expect(
      new RejectAdminRefundUseCase(repository as never, access, getDetail).execute('u', 'rf1', 'x'),
    ).rejects.toThrow(ConflictException);
  });
});

describe('danh sách / chi tiết báo khả năng xử lý theo người đăng nhập', () => {
  it('Quản lý: chỉ phiếu tiền mặt còn chờ là canProcess', async () => {
    const { repository, scopeUc } = setup(store('S1'));
    const res = await new ListAdminRefundsUseCase(repository as never, scopeUc as never).execute('u', { page: 1, limit: 20 });
    expect(repository.list).toHaveBeenCalledWith(expect.objectContaining({ storeIds: ['S1'] }));
    expect(res.items.map((i) => i.canProcess)).toEqual([true, false, false]);
    expect(res.items[0].allowedMethods).toEqual(['CASH']);
  });
  it('Kế toán/Admin: phiếu COD và SEPAY còn chờ đều xử lý được với cách hoàn khác nhau', async () => {
    const { repository, scopeUc } = setup(ALL);
    const res = await new ListAdminRefundsUseCase(repository as never, scopeUc as never).execute('u', { page: 1, limit: 20 });
    expect(res.items.map((i) => i.canProcess)).toEqual([true, true, false]);
    expect(res.items[0].allowedMethods).toEqual(['CASH', 'BANK_TRANSFER']);
    expect(res.items[1].allowedMethods).toEqual(['BANK_TRANSFER']);
  });
  it('Quản lý chưa mở ca: phiếu tiền mặt chưa xử lý được', async () => {
    const { repository, scopeUc } = setup(store('S1'), {}, []);
    const res = await new ListAdminRefundsUseCase(repository as never, scopeUc as never).execute('u', { page: 1, limit: 20 });
    expect(res.items.map((i) => i.canProcess)).toEqual([false, false, false]);
  });
  it('chi tiết phiếu cửa hàng khác -> 403', async () => {
    const { getDetail } = setup(store('S2'));
    await expect(getDetail.execute('u', 'rf1')).rejects.toThrow(ForbiddenException);
  });
});
