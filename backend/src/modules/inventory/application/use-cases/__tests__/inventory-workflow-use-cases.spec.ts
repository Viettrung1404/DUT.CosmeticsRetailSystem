import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { IAdjustmentRepository } from '../../../domain/repositories/adjustment.repository.interface';
import { IInventoryRepository } from '../../../domain/repositories/inventory.repository.interface';
import {
  ITransferRepository,
  TransferView,
} from '../../../domain/repositories/transfer.repository.interface';
import {
  IStocktakeRepository,
  StocktakeView,
} from '../../../domain/repositories/stocktake.repository.interface';
import { IBatchRepository } from '../../../domain/repositories/batch.repository.interface';
import { IInventoryAlertRepository } from '../../../domain/repositories/inventory-alert.repository.interface';
import { ReviewAdjustmentUseCase } from '../review-adjustment.use-case';
import { CancelAdjustmentUseCase } from '../cancel-adjustment.use-case';
import { UpdateInventoryThresholdsUseCase } from '../update-inventory-thresholds.use-case';
import { TransferAccessService } from '../../services/transfer-access.service';
import { CreateTransferUseCase } from '../create-transfer.use-case';
import { ApproveTransferUseCase } from '../approve-transfer.use-case';
import { ReceiveTransferUseCase } from '../receive-transfer.use-case';
import { ShipTransferUseCase } from '../ship-transfer.use-case';
import { ChangeTransferStatusUseCase } from '../change-transfer-status.use-case';
import { StocktakeWorkflowUseCase } from '../stocktake-workflow.use-case';
import { ManageBatchesUseCase } from '../manage-batches.use-case';
import { SendInventoryAlertsUseCase } from '../send-inventory-alerts.use-case';

const WH = 'wh';
const STORE = 's1';

const scopeOf = (type: 'ALL' | 'STORE', storeIds: string[] = []) =>
  ({
    execute: jest.fn().mockResolvedValue({ type, storeIds, employeeId: null }),
  }) as unknown as GetUserDataScopeUseCase;

const inventoryRepo = (): jest.Mocked<IInventoryRepository> => ({
  findStore: jest.fn(async (id: string) => ({
    id,
    code: id.toUpperCase(),
    name: id,
    type: id === WH ? 'WAREHOUSE' : 'STORE',
    isActive: true,
  })),
  variantExists: jest.fn().mockResolvedValue(true),
  findMany: jest.fn(),
  findPurchaseOrder: jest.fn(),
  applyReceipt: jest.fn(),
  findInventoryRow: jest.fn().mockResolvedValue({ id: 'inv1', storeId: STORE, maxQuantity: 50 }),
  updateThresholds: jest.fn().mockResolvedValue({ id: 'inv1', minQuantity: 5, maxQuantity: 50 }),
});

describe('Phiếu điều chỉnh (T4)', () => {
  const pending = { id: 'a1', storeId: STORE, status: 'PENDING', createdBy: 'creator', adjustmentCode: 'ADJ1' };
  const repo = (): jest.Mocked<IAdjustmentRepository> => ({
    create: jest.fn(),
    approve: jest.fn().mockResolvedValue({ ok: true, adjustment: { ...pending, status: 'APPROVED' } }),
    close: jest.fn().mockResolvedValue(true),
    findById: jest.fn().mockResolvedValue(pending),
    findMany: jest.fn(),
    currentStock: jest.fn(),
  });

  it('người lập không tự duyệt phiếu của mình: 403', async () => {
    const r = repo();
    const uc = new ReviewAdjustmentUseCase(r, scopeOf('STORE', [STORE]));
    await expect(uc.execute('creator', 'a1', 'APPROVE')).rejects.toBeInstanceOf(ForbiddenException);
    expect(r.approve).not.toHaveBeenCalled();
  });

  it('người khác duyệt: trừ tồn qua repository', async () => {
    const r = repo();
    await new ReviewAdjustmentUseCase(r, scopeOf('STORE', [STORE])).execute('manager', 'a1', 'APPROVE', ' ok ');
    expect(r.approve).toHaveBeenCalledWith('a1', 'manager', 'ok');
  });

  it('duyệt lúc tồn đã bị bán bớt: báo lỗi của sổ kho', async () => {
    const r = repo();
    r.approve.mockResolvedValue({ ok: false, reason: 'RESERVED_CONFLICT', available: 1 });
    await expect(
      new ReviewAdjustmentUseCase(r, scopeOf('ALL')).execute('manager', 'a1', 'APPROVE'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('phiếu ngoài phạm vi: 403; phiếu đã xử lý: 409', async () => {
    const r = repo();
    await expect(
      new ReviewAdjustmentUseCase(r, scopeOf('STORE', ['khac'])).execute('manager', 'a1', 'REJECT'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    r.findById.mockResolvedValue({ ...pending, status: 'APPROVED' } as never);
    await expect(
      new ReviewAdjustmentUseCase(r, scopeOf('ALL')).execute('manager', 'a1', 'REJECT'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('chỉ người lập được hủy phiếu', async () => {
    const r = repo();
    await expect(new CancelAdjustmentUseCase(r).execute('other', 'a1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await new CancelAdjustmentUseCase(r).execute('creator', 'a1');
    expect(r.close).toHaveBeenCalledWith('a1', 'CANCELLED', 'creator', null);
  });
});

describe('Ngưỡng tồn', () => {
  it('min lớn hơn max: 400', async () => {
    const uc = new UpdateInventoryThresholdsUseCase(inventoryRepo(), scopeOf('ALL'));
    await expect(uc.execute('u', 'inv1', { minQuantity: 60 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bỏ mức tối đa (null) thì min tùy ý', async () => {
    const repo = inventoryRepo();
    await new UpdateInventoryThresholdsUseCase(repo, scopeOf('ALL')).execute('u', 'inv1', {
      minQuantity: 60,
      maxQuantity: null,
    });
    expect(repo.updateThresholds).toHaveBeenCalledWith('inv1', 60, null);
  });
});

describe('Chuyển kho (T2, V11)', () => {
  const transfer = (over: Partial<TransferView> = {}): TransferView => ({
    id: 't1',
    transferCode: 'TRF202610001',
    fromStoreId: WH,
    fromStoreName: 'Kho tổng',
    toStoreId: STORE,
    toStoreName: 'CH01',
    status: 'REQUESTED',
    note: null,
    requestedBy: 'ql',
    requestedByName: null,
    approvedBy: null,
    shippedBy: null,
    receivedBy: null,
    shippedAt: null,
    receivedAt: null,
    createdAt: new Date(),
    items: [
      {
        id: 'i1',
        productVariantId: 'v1',
        sku: 'SKU1',
        productName: 'P',
        batchId: null,
        batchNumber: null,
        expiryDate: null,
        quantityRequested: 10,
        quantityApproved: null,
        quantityShipped: 0,
        quantityReceived: 0,
        lossQuantity: 0,
        lossReason: null,
      },
    ],
    ...over,
  });
  const repo = (t = transfer()): jest.Mocked<ITransferRepository> => ({
    findMissingVariants: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue('t1'),
    replaceDraft: jest.fn().mockResolvedValue(true),
    changeStatus: jest.fn().mockResolvedValue(true),
    ship: jest.fn().mockResolvedValue({ ok: true }),
    receive: jest.fn().mockResolvedValue({ ok: true }),
    findById: jest.fn().mockResolvedValue(t),
    findMany: jest.fn(),
  });
  const access = (r: ITransferRepository, scope: GetUserDataScopeUseCase) =>
    new TransferAccessService(r, scope);
  const line = [{ productVariantId: 'v1', quantity: 5 }];

  it('QL lập phiếu cho cửa hàng mình từ kho tổng', async () => {
    const r = repo();
    await new CreateTransferUseCase(inventoryRepo(), access(r, scopeOf('STORE', [STORE]))).execute('ql', {
      fromStoreId: WH,
      toStoreId: STORE,
      items: line,
    });
    expect(r.create).toHaveBeenCalledWith(expect.objectContaining({ fromStoreId: WH, toStoreId: STORE }));
  });

  it('không chuyển từ cửa hàng, không nhận về kho tổng, không lập cho cửa hàng khác', async () => {
    const uc = new CreateTransferUseCase(inventoryRepo(), access(repo(), scopeOf('STORE', [STORE])));
    await expect(uc.execute('ql', { fromStoreId: 's2', toStoreId: STORE, items: line })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(uc.execute('ql', { fromStoreId: WH, toStoreId: WH, items: line })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(uc.execute('ql', { fromStoreId: WH, toStoreId: 's2', items: line })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('trùng sản phẩm trên phiếu: 400', async () => {
    const uc = new CreateTransferUseCase(inventoryRepo(), access(repo(), scopeOf('ALL')));
    await expect(
      uc.execute('ql', { fromStoreId: WH, toStoreId: STORE, items: [...line, ...line] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('chỉ kho xuất duyệt được; số duyệt không vượt số yêu cầu', async () => {
    const r = repo();
    await expect(
      new ApproveTransferUseCase(access(r, scopeOf('STORE', [STORE]))).execute('ql', 't1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const kho = new ApproveTransferUseCase(access(r, scopeOf('STORE', [WH])));
    await expect(kho.execute('kho', 't1', [{ itemId: 'i1', quantityApproved: 11 }])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await kho.execute('kho', 't1', [{ itemId: 'i1', quantityApproved: 8 }]);
    expect(r.changeStatus.mock.calls[0][3]?.approvedQuantities?.get('i1')).toBe(8);
  });

  it('duyệt 0 cho mọi dòng: 400 (nên hủy phiếu)', async () => {
    const uc = new ApproveTransferUseCase(access(repo(), scopeOf('ALL')));
    await expect(uc.execute('kho', 't1', [{ itemId: 'i1', quantityApproved: 0 }])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('xuất kho thiếu hàng: báo theo SKU', async () => {
    const r = repo(transfer({ status: 'APPROVED' }));
    r.ship.mockResolvedValue({ ok: false, reason: 'BATCH_SHORTAGE', available: 3, sku: 'SKU1' });
    await expect(new ShipTransferUseCase(access(r, scopeOf('STORE', [WH]))).execute('kho', 't1')).rejects.toThrow(
      'SKU1',
    );
  });

  it('nhận thiếu phải ghi lý do; nhận vượt số xuất: 400', async () => {
    const shipped = transfer({
      status: 'SHIPPED',
      items: [{ ...transfer().items[0], quantityShipped: 10 }],
    });
    const r = repo(shipped);
    const uc = new ReceiveTransferUseCase(access(r, scopeOf('STORE', [STORE])));
    await expect(uc.execute('ql', 't1', [{ itemId: 'i1', quantityReceived: 9 }])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(uc.execute('ql', 't1', [{ itemId: 'i1', quantityReceived: 11 }])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await uc.execute('ql', 't1', [{ itemId: 'i1', quantityReceived: 9, lossReason: 'Vỡ 1 chai' }]);
    expect(r.receive.mock.calls[0][2].get('i1')).toEqual({ quantityReceived: 9, lossReason: 'Vỡ 1 chai' });
  });

  it('kho tổng không nhận hộ cửa hàng: 403', async () => {
    const r = repo(transfer({ status: 'SHIPPED' }));
    await expect(
      new ReceiveTransferUseCase(access(r, scopeOf('STORE', [WH]))).execute('kho', 't1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('đã xuất kho thì không hủy được: 409', async () => {
    const r = repo(transfer({ status: 'SHIPPED' }));
    await expect(
      new ChangeTransferStatusUseCase(access(r, scopeOf('ALL'))).cancel('ql', 't1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('Kiểm kê (T3)', () => {
  const stocktake = (over: Partial<StocktakeView> = {}): StocktakeView => ({
    id: 'k1',
    stocktakeCode: 'STK20261030001',
    storeId: STORE,
    storeName: 'CH01',
    status: 'IN_PROGRESS',
    totalVarianceValue: 0,
    note: null,
    createdBy: 'ql',
    createdByName: null,
    completedBy: null,
    completedByName: null,
    completedAt: null,
    createdAt: new Date(),
    items: [],
    ...over,
  });
  const repo = (s = stocktake()): jest.Mocked<IStocktakeRepository> => ({
    create: jest.fn(),
    recordCounts: jest.fn().mockResolvedValue({ ok: true }),
    complete: jest.fn().mockResolvedValue({ ok: true }),
    cancel: jest.fn().mockResolvedValue(true),
    findById: jest.fn().mockResolvedValue(s),
    findMany: jest.fn(),
  });
  const item = (variance: number) => ({
    id: 'x',
    productVariantId: 'v1',
    sku: 'SKU1',
    productName: 'P',
    batchId: 'b1',
    batchNumber: 'L1',
    systemQuantity: 10,
    actualQuantity: 10 + variance,
    varianceQuantity: variance,
    unitCost: 1000,
    varianceReason: null,
    note: null,
  });

  it('có chênh lệch: người lập không tự chốt', async () => {
    const r = repo(stocktake({ items: [item(-2)] }));
    const uc = new StocktakeWorkflowUseCase(r, inventoryRepo(), scopeOf('STORE', [STORE]));
    await expect(uc.complete('ql', 'k1')).rejects.toBeInstanceOf(ForbiddenException);
    await uc.complete('admin', 'k1');
    expect(r.complete).toHaveBeenCalledWith('k1', 'admin');
  });

  it('không chênh lệch: người lập tự chốt được', async () => {
    const r = repo(stocktake({ items: [item(0)] }));
    await new StocktakeWorkflowUseCase(r, inventoryRepo(), scopeOf('ALL')).complete('ql', 'k1');
    expect(r.complete).toHaveBeenCalled();
  });

  it('sản phẩm quản lý theo lô mà không chọn lô: 400', async () => {
    const r = repo(stocktake({ status: 'DRAFT' }));
    r.recordCounts.mockResolvedValue({ ok: false, reason: 'BATCH_REQUIRED', sku: 'SKU1' });
    const uc = new StocktakeWorkflowUseCase(r, inventoryRepo(), scopeOf('ALL'));
    await expect(uc.recordCounts('ql', 'k1', [{ productVariantId: 'v1', actualQuantity: 3 }])).rejects.toThrow(
      'SKU1',
    );
  });

  it('phiếu đã chốt không nhập thêm số đếm: 409', async () => {
    const r = repo(stocktake({ status: 'COMPLETED' }));
    const uc = new StocktakeWorkflowUseCase(r, inventoryRepo(), scopeOf('ALL'));
    await expect(
      uc.recordCounts('ql', 'k1', [{ productVariantId: 'v1', actualQuantity: 3 }]),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('Lô hàng (T9)', () => {
  const batch = {
    id: 'b1',
    storeId: STORE,
    storeName: 'CH01',
    productVariantId: 'v1',
    sku: 'SKU1',
    productName: 'P',
    batchNumber: 'L1',
    quantity: 5,
    manufactureDate: null,
    expiryDate: new Date('2026-11-15T00:00:00Z'),
    isActive: true,
  };
  const repo = (): jest.Mocked<IBatchRepository> => ({
    findMany: jest.fn().mockResolvedValue({ items: [batch], total: 1 }),
    findById: jest.fn().mockResolvedValue(batch),
    setActive: jest.fn().mockResolvedValue({ ...batch, isActive: false }),
  });

  it('lọc sắp hết hạn 30 ngày: từ mai đến hết ngày thứ 30', async () => {
    const r = repo();
    const result = await new ManageBatchesUseCase(r, scopeOf('ALL')).list('u', {
      page: 1,
      limit: 20,
      expiringWithinDays: 30,
    });
    const f = r.findMany.mock.calls[0][0];
    expect((f.expiryBefore!.getTime() - f.expiryFrom!.getTime()) / 86_400_000).toBe(30);
    expect(['NEAR_EXPIRY', 'EXPIRED']).toContain(result.items[0].expiryStatus);
  });

  it('khóa lô phải có lý do; khóa lô đã khóa: 409', async () => {
    const r = repo();
    const uc = new ManageBatchesUseCase(r, scopeOf('ALL'));
    await expect(uc.setActive('u', 'b1', false)).rejects.toBeInstanceOf(BadRequestException);
    await uc.setActive('u', 'b1', false, 'Lỗi bao bì');
    expect(r.setActive).toHaveBeenCalledWith('b1', false, 'u', 'Lỗi bao bì');
    r.findById.mockResolvedValue({ ...batch, isActive: false });
    await expect(uc.setActive('u', 'b1', false, 'x')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('Cảnh báo kho (T10)', () => {
  it('mỗi người phụ trách nhận một thông báo/ngày/địa điểm, event_key theo ngày VN', async () => {
    const repo: jest.Mocked<IInventoryAlertRepository> = {
      summarize: jest.fn().mockResolvedValue([
        {
          storeId: STORE,
          storeName: 'CH01',
          lowStock: [{ sku: 'SKU1', available: 1, minQuantity: 5 }],
          nearExpiryBatches: 2,
          expiredBatches: 0,
        },
      ]),
      findRecipients: jest.fn().mockResolvedValue([
        { userId: 'ql', storeId: STORE },
        { userId: 'khac', storeId: 'other' },
      ]),
      createNotifications: jest.fn().mockResolvedValue(1),
    };
    // 23:30 UTC 29/10 = 06:30 sáng 30/10 giờ VN
    await new SendInventoryAlertsUseCase(repo).execute(new Date('2026-10-29T23:30:00Z'));
    const rows = repo.createNotifications.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0].eventKey).toBe(`INVENTORY_ALERT:${STORE}:ql:2026-10-30`);
    expect(rows[0].message).toContain('1 sản phẩm dưới mức tồn tối thiểu');
    expect(rows[0].message).toContain('2 lô cận date');
  });
});
