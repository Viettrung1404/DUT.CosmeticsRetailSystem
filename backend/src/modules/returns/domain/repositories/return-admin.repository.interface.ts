import { ReturnCondition } from '../return-rules';

export const RETURN_ADMIN_REPOSITORY = Symbol('IReturnAdminRepository');

export interface ReturnAccessInfo {
  id: string;
  storeId: string;
  status: string;
  returnType: string;
}

export interface ReturnListQuery {
  storeIds?: string[];
  page: number;
  limit: number;
  status?: string;
  returnType?: string;
  search?: string;
  from?: Date;
  to?: Date;
}

export interface ReturnListItem {
  id: string;
  returnCode: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  customerName: string | null;
  customerPhone: string | null;
  returnType: string;
  status: string;
  reason: string;
  itemCount: number;
  refundAmount: number;
  createdAt: Date;
}

export interface ReturnDetailItem {
  id: string;
  orderItemId: string;
  productVariantId: string;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  refundAmount: number;
  condition: string | null;
  restockStoreId: string | null;
  restockBatchId: string | null;
  note: string | null;
}

export interface ReturnDetail {
  id: string;
  returnCode: string;
  returnType: string;
  status: string;
  reason: string;
  adminNote: string | null;
  refundAmount: number;
  handledBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  order: { id: string; orderNumber: string; totalAmount: number };
  store: { id: string; name: string; code: string };
  customer: { id: string; fullName: string | null; phone: string | null };
  items: ReturnDetailItem[];
  exchangeItems: { productVariantId: string; quantity: number }[];
  attachments: { id: string; mimeType: string | null; size: number | null }[];
  history: { status: string; note: string | null; changedBy: string; createdAt: Date }[];
  settlement: {
    status: string;
    replacementOrderId: string;
    returnCredit: number;
    replacementPayable: number;
    creditApplied: number;
    additionalDue: number;
    refundDue: number;
  } | null;
  refunds: { id: string; amount: number; status: string; processedAt: Date | null }[];
  quoteVersion: number;
  quoteExpiresAt: Date | null;
}

export interface InspectLineInput {
  returnOrderItemId: string;
  condition: ReturnCondition;
  restockBatchId?: string;
  note?: string;
}

export interface InspectResult {
  restockedQuantity: number;
  damagedQuantity: number;
  refundsReserved: boolean;
  quotePrepared: boolean;
}

export interface IReturnAdminRepository {
  findAccessInfo(id: string): Promise<ReturnAccessInfo | null>;
  list(query: ReturnListQuery): Promise<{ items: ReturnListItem[]; total: number }>;
  findDetail(id: string): Promise<ReturnDetail | null>;
  approve(input: { id: string; actorId: string; note?: string }): Promise<void>;
  reject(input: { id: string; actorId: string; reason: string }): Promise<void>;
  markReceived(input: { id: string; actorId: string; note?: string }): Promise<void>;
  inspect(input: {
    id: string;
    actorId: string;
    lines: InspectLineInput[];
    note?: string;
  }): Promise<InspectResult>;
  complete(input: { id: string; actorId: string }): Promise<void>;
}
