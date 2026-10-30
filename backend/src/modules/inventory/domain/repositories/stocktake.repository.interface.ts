import { StockFailure } from './stock-movement.types';

export const STOCKTAKE_REPOSITORY = Symbol('IStocktakeRepository');

export const VARIANCE_REASONS = ['DAMAGED', 'EXPIRED', 'THEFT', 'MISPLACED'] as const;

export interface StocktakeItemView {
  id: string;
  productVariantId: string;
  sku: string;
  productName: string;
  batchId: string | null;
  batchNumber: string | null;
  systemQuantity: number;
  actualQuantity: number;
  varianceQuantity: number;
  unitCost: number;
  varianceReason: string | null;
  note: string | null;
}

export interface StocktakeView {
  id: string;
  stocktakeCode: string;
  storeId: string;
  storeName: string;
  status: string;
  totalVarianceValue: number;
  note: string | null;
  createdBy: string | null;
  createdByName: string | null;
  completedBy: string | null;
  completedByName: string | null;
  completedAt: Date | null;
  createdAt: Date;
  items: StocktakeItemView[];
}

export interface StocktakeCountInput {
  productVariantId: string;
  batchId?: string | null;
  actualQuantity: number;
  varianceReason?: string | null;
  note?: string | null;
}

export type StocktakeWriteResult =
  | { ok: true }
  | {
      ok: false;
      reason: StockFailure | 'BATCH_REQUIRED' | 'VARIANT_NOT_FOUND';
      available?: number;
      sku?: string;
    };

export interface IStocktakeRepository {
  create(data: { storeId: string; note: string | null; createdBy: string }): Promise<string>;
  // Ghi số đếm: chụp tồn sổ ở lần nhập đầu của dòng; nhập lại chỉ sửa số thực đếm
  recordCounts(id: string, storeId: string, items: StocktakeCountInput[]): Promise<StocktakeWriteResult>;
  // Điều chỉnh tồn theo chênh lệch (cộng/trừ vào tồn hiện tại), chốt tổng giá trị chênh lệch
  complete(id: string, completedBy: string): Promise<StocktakeWriteResult>;
  cancel(id: string): Promise<boolean>;
  findById(id: string): Promise<StocktakeView | null>;
  findMany(filter: {
    skip: number;
    take: number;
    storeIds?: string[];
    status?: string;
  }): Promise<{ items: StocktakeView[]; total: number }>;
}
