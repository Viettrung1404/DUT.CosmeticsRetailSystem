import { ForbiddenException } from '@nestjs/common';
import {
  CheckStockConsistencyUseCase,
  evaluateStockRow,
} from '../check-stock-consistency.use-case';
import { StockConsistencyRow } from '../../../domain/repositories/inventory.repository.interface';

const makeRow = (overrides: Partial<StockConsistencyRow> = {}): StockConsistencyRow => ({
  store: { id: 's1', code: 'CH01', name: 'Cửa hàng 1' },
  variant: { id: 'v1', sku: 'SKU1', productName: 'Sản phẩm 1' },
  quantity: 10,
  reservedQuantity: 0,
  hasInventoryRow: true,
  batchCount: 2,
  activeBatchQuantity: 10,
  inactiveBatchQuantity: 0,
  negativeBatchCount: 0,
  ledgerCount: 3,
  ledgerQuantity: 10,
  ...overrides,
});

describe('evaluateStockRow', () => {
  it('khớp hết thì không có lỗi', () => {
    expect(evaluateStockRow(makeRow())).toEqual([]);
  });

  it('tồn khác tổng lô đang hoạt động', () => {
    const issues = evaluateStockRow(makeRow({ activeBatchQuantity: 8, inactiveBatchQuantity: 2 }));
    expect(issues.map((i) => i.type)).toEqual(['BATCH_MISMATCH']);
    expect(issues[0]).toMatchObject({ expected: 8, actual: 10 });
  });

  it('chưa có lô thì bỏ qua so lô', () => {
    expect(evaluateStockRow(makeRow({ batchCount: 0, activeBatchQuantity: 0 }))).toEqual([]);
  });

  it('chưa có thẻ kho thì bỏ qua so thẻ kho', () => {
    expect(evaluateStockRow(makeRow({ ledgerCount: 0, ledgerQuantity: 0 }))).toEqual([]);
  });

  it('tồn khác tổng thẻ kho', () => {
    const issues = evaluateStockRow(makeRow({ ledgerQuantity: 12 }));
    expect(issues.map((i) => i.type)).toEqual(['LEDGER_MISMATCH']);
  });

  it('giữ chỗ vượt tồn', () => {
    const issues = evaluateStockRow(makeRow({ reservedQuantity: 11 }));
    expect(issues.map((i) => i.type)).toEqual(['RESERVED_EXCEEDS_QUANTITY']);
  });

  it('lô hàng nhưng không có dòng tồn', () => {
    const issues = evaluateStockRow(
      makeRow({ hasInventoryRow: false, quantity: 0, activeBatchQuantity: 4 }),
    );
    expect(issues.map((i) => i.type)).toEqual(['BATCH_WITHOUT_INVENTORY']);
  });
});

describe('CheckStockConsistencyUseCase', () => {
  const repo = { findConsistencyRows: jest.fn() };
  const build = (scope: unknown) =>
    new CheckStockConsistencyUseCase(
      repo as never,
      { execute: jest.fn().mockResolvedValue(scope) } as never,
    );

  beforeEach(() => repo.findConsistencyRows.mockReset());

  it('gom tổng kết và chỉ trả dòng lệch', async () => {
    repo.findConsistencyRows.mockResolvedValue([makeRow(), makeRow({ ledgerQuantity: 99 })]);
    const report = await build({ type: 'ALL', storeIds: [] }).execute('u1');
    expect(repo.findConsistencyRows).toHaveBeenCalledWith(undefined);
    expect(report.summary).toMatchObject({ checkedRows: 2, mismatchedRows: 1 });
    expect(report.summary.byType.LEDGER_MISMATCH).toBe(1);
    expect(report.items).toHaveLength(1);
  });

  it('phạm vi cửa hàng thì chỉ lọc cửa hàng được gán', async () => {
    repo.findConsistencyRows.mockResolvedValue([]);
    await build({ type: 'STORE', storeIds: ['s1'] }).execute('u1');
    expect(repo.findConsistencyRows).toHaveBeenCalledWith(['s1']);
  });

  it('cửa hàng ngoài phạm vi bị chặn', async () => {
    await expect(
      build({ type: 'STORE', storeIds: ['s1'] }).execute('u1', 's2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
