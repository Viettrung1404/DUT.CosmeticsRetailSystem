import { RefundMethod } from '../refund-rules';

export const REFUND_ADMIN_REPOSITORY = Symbol('IRefundAdminRepository');

export interface RefundAccessInfo {
  id: string;
  status: string;
  storeId: string;
  amount: number;
  paymentMethod: string | null;
}

export interface RefundListQuery {
  storeIds?: string[];
  page: number;
  limit: number;
  status?: string;
  orderId?: string;
  returnOrderId?: string;
  search?: string;
  from?: Date;
  to?: Date;
}

export interface RefundListItem {
  id: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  customerName: string | null;
  returnOrderId: string | null;
  returnCode: string | null;
  amount: number;
  status: string;
  paymentMethod: string | null;
  createdAt: Date;
  processedAt: Date | null;
  // Suy từ pos_session_id: có ca POS là tiền mặt tại quầy, không có là chuyển khoản
  refundMethod: RefundMethod | null;
  posSessionId: string | null;
  processedBy: string | null;
}

export interface RefundProcessingRecord {
  action: string;
  method: string | null;
  reference: string | null;
  note: string | null;
  userId: string | null;
  at: Date;
}

export interface RefundDetail extends RefundListItem {
  reason: string;
  refundTransactionId: string | null;
  payment: {
    id: string;
    paymentMethod: string;
    amount: number;
    transactionId: string | null;
    paidAt: Date | null;
  } | null;
  returnOrder: { id: string; returnCode: string; returnType: string; status: string } | null;
  processing: RefundProcessingRecord[];
}

export interface IRefundAdminRepository {
  findAccessInfo(id: string): Promise<RefundAccessInfo | null>;
  list(query: RefundListQuery): Promise<{ items: RefundListItem[]; total: number }>;
  findDetail(id: string): Promise<RefundDetail | null>;
  findOpenSessionId(cashierId: string, storeId: string): Promise<string | null>;
  findOpenSessionStoreIds(cashierId: string): Promise<string[]>;
  process(input: {
    id: string;
    actorId: string;
    method: RefundMethod;
    posSessionId: string | null;
    reference?: string;
    note?: string;
  }): Promise<void>;
  reject(input: { id: string; actorId: string; reason: string }): Promise<void>;
}
