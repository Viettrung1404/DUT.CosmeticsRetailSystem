import { ConflictException, ForbiddenException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { GetUserEffectivePermissionsUseCase } from '@modules/permissions/application/use-cases/get-user-effective-permissions.use-case';
import { IFinanceRepository } from '../../../domain/repositories/finance.repository.interface';
import { FinanceUseCase } from '../finance.use-case';

const build = (permissions: string[], scope = { type: 'STORE', storeIds: ['s1'], employeeId: null }) => {
  const repo: jest.Mocked<IFinanceRepository> = {
    findPayments: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    summarize: jest.fn().mockResolvedValue([
      { storeId: 's1', storeName: 'CH01', channel: 'POS', paymentMethod: 'CASH', count: 2, amount: 100, reconciledCount: 0, unreconciledSessions: 1 },
      { storeId: 's1', storeName: 'CH01', channel: 'ONLINE', paymentMethod: 'VNPAY', count: 1, amount: 50, reconciledCount: 0, unreconciledSessions: 0 },
    ]),
    markReconciled: jest.fn().mockResolvedValue({ ok: false, unreconciledSessions: 1 }),
  };
  const uc = new FinanceUseCase(
    repo,
    { execute: jest.fn().mockResolvedValue(scope) } as unknown as GetUserDataScopeUseCase,
    { execute: jest.fn().mockResolvedValue(permissions) } as unknown as GetUserEffectivePermissionsUseCase,
  );
  return { repo, uc };
};

describe('FinanceUseCase', () => {
  it('V3: chỉ có quyền thu tiền → lọc giao dịch theo ca của chính mình', async () => {
    const { repo, uc } = build(['PAYMENT_COLLECT']);
    await uc.payments('nv', { page: 1, limit: 20 });
    expect(repo.findPayments.mock.calls[0][0]).toMatchObject({ cashierId: 'nv', storeIds: ['s1'] });
  });

  it('có quyền đối soát → thấy cả cửa hàng', async () => {
    const { repo, uc } = build(['PAYMENT_COLLECT', 'PAYMENT_RECONCILE']);
    await uc.payments('ql', { page: 1, limit: 20 });
    expect(repo.findPayments.mock.calls[0][0].cashierId).toBeUndefined();
  });

  it('ngày theo giờ VN: 30/10 bắt đầu 17:00 UTC ngày 29/10', async () => {
    const { repo, uc } = build(['PAYMENT_RECONCILE']);
    await uc.reconciliation('kt', { date: '2026-10-30' });
    expect(repo.summarize.mock.calls[0][0].toISOString()).toBe('2026-10-29T17:00:00.000Z');
  });

  it('T8: nhóm POS còn ca chưa chốt thì không đánh dấu được', async () => {
    const { uc } = build(['PAYMENT_RECONCILE']);
    const { groups } = await uc.reconciliation('kt', { date: '2026-10-30' });
    expect(groups.map((g) => g.canMark)).toEqual([false, true]);
    await expect(
      uc.mark('kt', { date: '2026-10-30', storeId: 's1', channel: 'POS', paymentMethod: 'CASH' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('cửa hàng ngoài phạm vi: 403', async () => {
    const { uc } = build(['PAYMENT_RECONCILE']);
    await expect(
      uc.mark('kt', { date: '2026-10-30', storeId: 's9', channel: 'ONLINE', paymentMethod: 'VNPAY' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
