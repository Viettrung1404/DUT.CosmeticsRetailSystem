import { NewBatchInfo, StockFailure } from './stock-movement.types';

export const ADJUSTMENT_REPOSITORY = Symbol('IAdjustmentRepository');

export const ADJUSTMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

export interface AdjustmentLineInput {
  productVariantId: string;
  quantity: number;
  batchId?: string | null;
  newBatch?: NewBatchInfo | null;
}

export interface AdjustmentView {
  id: string;
  adjustmentCode: string;
  storeId: string;
  storeName: string;
  status: string;
  reason: string;
  reviewNote: string | null;
  createdBy: string | null;
  createdByName: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  items: {
    id: string;
    productVariantId: string;
    sku: string;
    productName: string;
    batchId: string | null;
    batchNumber: string | null;
    expiryDate: Date | null;
    quantity: number;
  }[];
}

export interface AdjustmentListFilter {
  skip: number;
  take: number;
  storeIds?: string[];
  status?: string;
}

export type ApplyAdjustmentResult =
  | { ok: true; adjustment: AdjustmentView }
  | { ok: false; reason: StockFailure; available?: number };

export interface IAdjustmentRepository {
  // Tăng tồn: tạo phiếu APPROVED và cộng tồn ngay; giảm tồn: tạo phiếu PENDING
  create(data: {
    storeId: string;
    reason: string;
    createdBy: string;
    applyNow: boolean;
    lines: AdjustmentLineInput[];
  }): Promise<ApplyAdjustmentResult>;
  // Duyệt phiếu PENDING: trừ tồn trong cùng giao dịch, khóa dòng phiếu để không duyệt hai lần
  approve(id: string, approvedBy: string, note: string | null): Promise<ApplyAdjustmentResult>;
  close(id: string, status: 'REJECTED' | 'CANCELLED', userId: string, note: string | null): Promise<boolean>;
  findById(id: string): Promise<AdjustmentView | null>;
  findMany(filter: AdjustmentListFilter): Promise<{ items: AdjustmentView[]; total: number }>;
  currentStock(storeId: string, productVariantId: string): Promise<{ quantity: number; reserved: number }>;
}
