import { StockFailure } from './stock-movement.types';

export const TRANSFER_REPOSITORY = Symbol('ITransferRepository');

export const TRANSFER_STATUSES = [
  'DRAFT',
  'REQUESTED',
  'APPROVED',
  'SHIPPED',
  'RECEIVED',
  'CANCELLED',
] as const;

export interface TransferItemView {
  id: string;
  productVariantId: string;
  sku: string;
  productName: string;
  batchId: string | null;
  batchNumber: string | null;
  expiryDate: Date | null;
  quantityRequested: number;
  quantityApproved: number | null;
  quantityShipped: number;
  quantityReceived: number;
  lossQuantity: number;
  lossReason: string | null;
}

export interface TransferView {
  id: string;
  transferCode: string;
  fromStoreId: string;
  fromStoreName: string;
  toStoreId: string;
  toStoreName: string;
  status: string;
  note: string | null;
  requestedBy: string | null;
  requestedByName: string | null;
  approvedBy: string | null;
  shippedBy: string | null;
  receivedBy: string | null;
  shippedAt: Date | null;
  receivedAt: Date | null;
  createdAt: Date;
  items: TransferItemView[];
}

export interface TransferLineInput {
  productVariantId: string;
  quantity: number;
}

export interface TransferListFilter {
  skip: number;
  take: number;
  // Thấy phiếu khi địa điểm của mình là nơi xuất hoặc nơi nhận
  storeIds?: string[];
  status?: string;
}

export type TransferMoveResult =
  | { ok: true }
  | { ok: false; reason: StockFailure; available?: number; sku?: string };

export interface ITransferRepository {
  findMissingVariants(ids: string[]): Promise<string[]>;
  create(data: {
    fromStoreId: string;
    toStoreId: string;
    note: string | null;
    requestedBy: string;
    items: TransferLineInput[];
  }): Promise<string>;
  replaceDraft(id: string, note: string | null | undefined, items?: TransferLineInput[]): Promise<boolean>;
  // Đổi trạng thái có điều kiện (chỉ khi đang ở một trong các trạng thái from), trả false nếu người khác đã đổi trước
  changeStatus(
    id: string,
    from: string[],
    to: string,
    data?: { approvedBy?: string; approvedQuantities?: Map<string, number> },
  ): Promise<boolean>;
  // Xuất kho nơi gửi theo FEFO (bỏ lô khóa, lô hết hạn), tách dòng khi một biến thể lấy từ nhiều lô
  ship(id: string, shippedBy: string): Promise<TransferMoveResult>;
  // Nhập kho nơi nhận vào lô cùng số lô, cùng hạn dùng; phần thiếu là hao hụt
  receive(
    id: string,
    receivedBy: string,
    lines: Map<string, { quantityReceived: number; lossReason: string | null }>,
  ): Promise<TransferMoveResult>;
  findById(id: string): Promise<TransferView | null>;
  findMany(filter: TransferListFilter): Promise<{ items: TransferView[]; total: number }>;
}
