import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  isStoreInScope,
  toStoreIdsFilter,
} from '@modules/permissions/application/utils/store-scope.util';
import {
  INVENTORY_REPOSITORY,
  IInventoryRepository,
  StockConsistencyRow,
} from '../../domain/repositories/inventory.repository.interface';

export type ConsistencyIssueType =
  | 'BATCH_MISMATCH'
  | 'LEDGER_MISMATCH'
  | 'RESERVED_EXCEEDS_QUANTITY'
  | 'NEGATIVE_QUANTITY'
  | 'BATCH_WITHOUT_INVENTORY';

export interface ConsistencyIssue {
  type: ConsistencyIssueType;
  message: string;
  expected?: number;
  actual?: number;
}

export interface ConsistencyItem {
  store: StockConsistencyRow['store'];
  variant: StockConsistencyRow['variant'];
  quantity: number;
  reservedQuantity: number;
  activeBatchQuantity: number;
  inactiveBatchQuantity: number;
  ledgerQuantity: number;
  issues: ConsistencyIssue[];
}

export interface ConsistencyReport {
  summary: {
    checkedRows: number;
    mismatchedRows: number;
    byType: Record<ConsistencyIssueType, number>;
    rowsWithoutBatches: number;
    rowsWithoutLedger: number;
    notes: string[];
  };
  items: ConsistencyItem[];
}

const NOTES = [
  'Chỉ so với lô khi biến thể đã có lô; hàng nhập trước khi quản lý lô (chỉ có tồn tổng) được bỏ qua.',
  'Thẻ kho (inventory_transactions) có thể không ghi đủ từ đầu (dữ liệu mẫu, hàng nhập trước khi có thẻ kho); lệch thẻ kho chỉ là gợi ý cần đối chiếu, không chắc là lỗi.',
];

export const evaluateStockRow = (row: StockConsistencyRow): ConsistencyIssue[] => {
  const issues: ConsistencyIssue[] = [];
  if (!row.hasInventoryRow) {
    issues.push({
      type: 'BATCH_WITHOUT_INVENTORY',
      message: 'Có lô hàng nhưng không có dòng tồn kho tương ứng',
      expected: 0,
      actual: row.activeBatchQuantity + row.inactiveBatchQuantity,
    });
    return issues;
  }
  if (row.quantity < 0 || row.reservedQuantity < 0) {
    issues.push({
      type: 'NEGATIVE_QUANTITY',
      message: 'Tồn kho hoặc số giữ chỗ bị âm',
      actual: row.quantity,
    });
  }
  if (row.reservedQuantity > row.quantity) {
    issues.push({
      type: 'RESERVED_EXCEEDS_QUANTITY',
      message: 'Số đang giữ chỗ lớn hơn tồn thực tế',
      expected: row.quantity,
      actual: row.reservedQuantity,
    });
  }
  if (row.batchCount > 0 && row.quantity !== row.activeBatchQuantity) {
    issues.push({
      type: 'BATCH_MISMATCH',
      message:
        row.inactiveBatchQuantity > 0
          ? `Tồn kho khác tổng các lô đang hoạt động (còn ${row.inactiveBatchQuantity} nằm ở lô đã ngừng)`
          : 'Tồn kho khác tổng các lô đang hoạt động',
      expected: row.activeBatchQuantity,
      actual: row.quantity,
    });
  }
  if (row.ledgerCount > 0 && row.quantity !== row.ledgerQuantity) {
    issues.push({
      type: 'LEDGER_MISMATCH',
      message: 'Tồn kho khác tổng có dấu của thẻ kho',
      expected: row.ledgerQuantity,
      actual: row.quantity,
    });
  }
  return issues;
};

@Injectable()
export class CheckStockConsistencyUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: IInventoryRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string, storeId?: string): Promise<ConsistencyReport> {
    const scope = await this.getUserDataScope.execute(userId);
    if (storeId && !isStoreInScope(scope, storeId)) {
      throw new ForbiddenException('Bạn không kiểm tra được tồn kho của cửa hàng này');
    }

    const rows = await this.repository.findConsistencyRows(
      storeId ? [storeId] : toStoreIdsFilter(scope),
    );

    const byType: Record<ConsistencyIssueType, number> = {
      BATCH_MISMATCH: 0,
      LEDGER_MISMATCH: 0,
      RESERVED_EXCEEDS_QUANTITY: 0,
      NEGATIVE_QUANTITY: 0,
      BATCH_WITHOUT_INVENTORY: 0,
    };
    const items: ConsistencyItem[] = [];
    for (const row of rows) {
      const issues = evaluateStockRow(row);
      if (issues.length === 0) continue;
      issues.forEach((i) => (byType[i.type] += 1));
      items.push({
        store: row.store,
        variant: row.variant,
        quantity: row.quantity,
        reservedQuantity: row.reservedQuantity,
        activeBatchQuantity: row.activeBatchQuantity,
        inactiveBatchQuantity: row.inactiveBatchQuantity,
        ledgerQuantity: row.ledgerQuantity,
        issues,
      });
    }

    return {
      summary: {
        checkedRows: rows.length,
        mismatchedRows: items.length,
        byType,
        rowsWithoutBatches: rows.filter((r) => r.batchCount === 0).length,
        rowsWithoutLedger: rows.filter((r) => r.ledgerCount === 0).length,
        notes: NOTES,
      },
      items,
    };
  }
}
