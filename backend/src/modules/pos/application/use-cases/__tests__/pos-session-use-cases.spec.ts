import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { IPosSessionRepository } from '../../../domain/repositories/pos-session.repository.interface';
import { PosSessionEntity, PosSessionProps } from '../../../domain/entities/pos-session.entity';
import { OpenPosSessionUseCase } from '../open-pos-session.use-case';
import { ClosePosSessionUseCase } from '../close-pos-session.use-case';
import { ReconcilePosSessionUseCase } from '../reconcile-pos-session.use-case';
import { GetPosSessionsUseCase } from '../get-pos-sessions.use-case';
import { GetCurrentPosSessionUseCase } from '../get-current-pos-session.use-case';

const STORE = { id: 's1', code: 'STORE-01', type: 'STORE', isActive: true };

const makeSession = (overrides: Partial<PosSessionProps> = {}) =>
  new PosSessionEntity({
    id: 'p1',
    sessionCode: 'POS-STORE-01-20261007-01',
    storeId: 's1',
    storeCode: 'STORE-01',
    storeName: 'GlowUp Hai Bà Trưng',
    cashierId: 'cashier',
    cashierName: 'Thu Ngân',
    openedAt: new Date(),
    closedAt: null,
    openingCash: 2_000_000,
    systemCash: 0,
    countedCash: null,
    difference: null,
    status: 'OPEN',
    note: null,
    approvedBy: null,
    approverName: null,
    ...overrides,
  });

describe('POS session use cases', () => {
  let repo: jest.Mocked<IPosSessionRepository>;
  let scope: { execute: jest.Mock };

  const givenScope = (type: 'ALL' | 'STORE' | 'SELF', storeIds: string[] = []) =>
    scope.execute.mockResolvedValue({ type, storeIds, employeeId: null });

  beforeEach(() => {
    repo = {
      findStore: jest.fn().mockResolvedValue(STORE),
      findById: jest.fn(),
      findOpenByStore: jest.fn().mockResolvedValue(null),
      findOpenByCashier: jest.fn().mockResolvedValue(null),
      countOpenedBetween: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      sumCompletedCash: jest.fn().mockResolvedValue(0),
      saveClosed: jest.fn().mockResolvedValue(true),
      saveReconciled: jest.fn().mockResolvedValue(true),
      findMany: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    scope = { execute: jest.fn() };
    givenScope('STORE', ['s1']);
  });

  const scopeUseCase = () => scope as unknown as GetUserDataScopeUseCase;

  describe('OpenPosSessionUseCase', () => {
    const open = () =>
      new OpenPosSessionUseCase(repo, scopeUseCase()).execute('cashier', {
        storeId: 's1',
        openingCash: 2_000_000,
      });

    it('mở ca với mã POS-<mã cửa hàng>-<ngày>-<số thứ tự>', async () => {
      repo.countOpenedBetween.mockResolvedValue(1);
      repo.create.mockImplementation(async (data) => makeSession({ sessionCode: data.sessionCode }));

      await open();

      const data = repo.create.mock.calls[0][0];
      expect(data.sessionCode).toMatch(/^POS-STORE-01-\d{8}-02$/);
      expect(data).toMatchObject({ storeId: 's1', cashierId: 'cashier', openingCash: 2_000_000 });
    });

    it('không mở ca tại kho tổng', async () => {
      repo.findStore.mockResolvedValue({ ...STORE, type: 'WAREHOUSE' });
      await expect(open()).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cửa hàng ngoài phạm vi → 403', async () => {
      givenScope('STORE', ['s2']);
      await expect(open()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('Admin phạm vi ALL nhưng không được gán cửa hàng → 403', async () => {
      givenScope('ALL');
      await expect(open()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('cửa hàng đang có ca mở → 409', async () => {
      repo.findOpenByStore.mockResolvedValue(makeSession({ cashierId: 'other' }));
      await expect(open()).rejects.toBeInstanceOf(ConflictException);
    });

    it('thu ngân đang mở ca ở nơi khác → 409', async () => {
      repo.findOpenByCashier.mockResolvedValue(makeSession({ storeId: 's9' }));
      await expect(open()).rejects.toBeInstanceOf(ConflictException);
    });

    it('hai người mở cùng lúc, DB chặn trùng → 409', async () => {
      repo.create.mockResolvedValue(null);
      await expect(open()).rejects.toBeInstanceOf(ConflictException);
    });

    it('không tìm thấy cửa hàng → 404', async () => {
      repo.findStore.mockResolvedValue(null);
      await expect(open()).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('ClosePosSessionUseCase', () => {
    it('tính chênh lệch = đếm được - (đầu ca + tiền mặt hệ thống)', async () => {
      repo.findById.mockResolvedValue(makeSession());
      repo.sumCompletedCash.mockResolvedValue(3_500_000);

      const session = await new ClosePosSessionUseCase(repo, scopeUseCase()).execute(
        'cashier',
        [],
        'p1',
        { countedCash: 5_450_000 },
      );

      expect(session.status).toBe('CLOSED');
      expect(session.systemCash).toBe(3_500_000);
      expect(session.difference).toBe(-50_000);
      expect(repo.saveClosed).toHaveBeenCalledWith(session);
    });

    it('người khác không có quyền chốt ca thì không đóng hộ được', async () => {
      repo.findById.mockResolvedValue(makeSession());
      await expect(
        new ClosePosSessionUseCase(repo, scopeUseCase()).execute('other', ['PAYMENT_COLLECT'], 'p1', {
          countedCash: 0,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('quản lý cùng cửa hàng có quyền chốt ca thì đóng hộ được', async () => {
      repo.findById.mockResolvedValue(makeSession());
      const session = await new ClosePosSessionUseCase(repo, scopeUseCase()).execute(
        'manager',
        ['PAYMENT_RECONCILE'],
        'p1',
        { countedCash: 2_000_000 },
      );
      expect(session.difference).toBe(0);
    });

    it('ca đã đóng → 409', async () => {
      repo.findById.mockResolvedValue(makeSession({ status: 'CLOSED' }));
      await expect(
        new ClosePosSessionUseCase(repo, scopeUseCase()).execute('cashier', [], 'p1', {
          countedCash: 0,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('bấm đóng hai lần cùng lúc, lần sau không ghi đè → 409', async () => {
      repo.findById.mockResolvedValue(makeSession());
      repo.saveClosed.mockResolvedValue(false);
      await expect(
        new ClosePosSessionUseCase(repo, scopeUseCase()).execute('cashier', [], 'p1', {
          countedCash: 0,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('ReconcilePosSessionUseCase', () => {
    const reconcile = (userId = 'manager', note?: string) =>
      new ReconcilePosSessionUseCase(repo, scopeUseCase()).execute(userId, 'p1', note);

    it('chốt ca đã đóng, ghi người duyệt', async () => {
      repo.findById.mockResolvedValue(makeSession({ status: 'CLOSED', difference: 0 }));
      const session = await reconcile();
      expect(session.status).toBe('RECONCILED');
      expect(session.approvedBy).toBe('manager');
      expect(repo.saveReconciled).toHaveBeenCalled();
    });

    it('không tự chốt ca mình đứng quầy', async () => {
      repo.findById.mockResolvedValue(makeSession({ status: 'CLOSED' }));
      await expect(reconcile('cashier')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('ca chưa đóng → 409', async () => {
      repo.findById.mockResolvedValue(makeSession());
      await expect(reconcile()).rejects.toBeInstanceOf(ConflictException);
    });

    it('hai người chốt cùng lúc, người sau → 409', async () => {
      repo.findById.mockResolvedValue(makeSession({ status: 'CLOSED', difference: 0 }));
      repo.saveReconciled.mockResolvedValue(false);
      await expect(reconcile()).rejects.toBeInstanceOf(ConflictException);
    });

    it('ca lệch tiền mà chưa ai giải trình → 400', async () => {
      repo.findById.mockResolvedValue(makeSession({ status: 'CLOSED', difference: -50_000 }));
      await expect(reconcile()).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ca lệch tiền có ghi chú của người chốt thì chốt được', async () => {
      repo.findById.mockResolvedValue(makeSession({ status: 'CLOSED', difference: -50_000 }));
      const session = await reconcile('manager', 'Thu ngân thối nhầm, đã trừ lương');
      expect(session.note).toContain('thối nhầm');
    });

    it('ca của cửa hàng khác → 403', async () => {
      givenScope('STORE', ['s2']);
      repo.findById.mockResolvedValue(makeSession({ status: 'CLOSED' }));
      await expect(reconcile()).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('GetPosSessionsUseCase', () => {
    const list = (input: Record<string, unknown> = {}) =>
      new GetPosSessionsUseCase(repo, scopeUseCase()).execute('u1', {
        page: 1,
        limit: 20,
        order: 'desc',
        ...input,
      });

    it('STORE: chỉ lấy cửa hàng trong phạm vi, lọc storeId ngoài phạm vi ra rỗng', async () => {
      givenScope('STORE', ['s1', 's2']);
      await list({ storeId: 's9' });
      expect(repo.findMany.mock.calls[0][0].storeIds).toEqual([]);
    });

    it('ALL: không giới hạn cửa hàng', async () => {
      givenScope('ALL');
      await list();
      expect(repo.findMany.mock.calls[0][0].storeIds).toBeUndefined();
    });

    it('SELF: chỉ ca của chính mình', async () => {
      givenScope('SELF');
      await list({ cashierId: 'someone-else' });
      expect(repo.findMany.mock.calls[0][0].cashierId).toBe('u1');
    });

    it('khoảng ngày ngược → 400', async () => {
      await expect(list({ fromDate: '2026-10-10', toDate: '2026-10-01' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('GetCurrentPosSessionUseCase', () => {
    it('cửa hàng ngoài phạm vi → 403', async () => {
      givenScope('STORE', ['s2']);
      await expect(
        new GetCurrentPosSessionUseCase(repo, scopeUseCase()).execute('u1', 's1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
