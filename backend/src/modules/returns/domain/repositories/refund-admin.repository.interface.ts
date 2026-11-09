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
  process(input: {
    id: string;
    actorId: string;
    method: RefundMethod;
    reference?: string;
    note?: string;
  }): Promise<void>;
  reject(input: { id: string; actorId: string; reason: string }): Promise<void>;
}
