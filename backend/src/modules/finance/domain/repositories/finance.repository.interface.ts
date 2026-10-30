export const FINANCE_REPOSITORY = Symbol('IFinanceRepository');

export interface PaymentHistoryItem {
  id: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  channel: 'POS' | 'ONLINE';
  posSessionId: string | null;
  posSessionCode: string | null;
  paymentMethod: string;
  amount: number;
  status: string;
  transactionId: string | null;
  paidAt: Date | null;
  reconciledAt: Date | null;
  createdAt: Date;
}

export interface PaymentHistoryFilter {
  skip: number;
  take: number;
  storeIds?: string[];
  cashierId?: string;
  from?: Date;
  to?: Date;
  paymentMethod?: string;
  status?: string;
}

export interface ReconciliationGroup {
  storeId: string;
  storeName: string;
  channel: 'POS' | 'ONLINE';
  paymentMethod: string;
  count: number;
  amount: number;
  reconciledCount: number;
  // POS: số ca có giao dịch trong nhóm mà chưa RECONCILED (T8: còn ca chưa chốt thì chưa đánh dấu được)
  unreconciledSessions: number;
}

export interface IFinanceRepository {
  findPayments(filter: PaymentHistoryFilter): Promise<{ items: PaymentHistoryItem[]; total: number }>;
  // Gom giao dịch COMPLETED theo ngày VN (paid_at) + cửa hàng + kênh + phương thức
  summarize(dayStart: Date, dayEnd: Date, storeIds?: string[]): Promise<ReconciliationGroup[]>;
  markReconciled(input: {
    dayStart: Date;
    dayEnd: Date;
    storeId: string;
    channel: 'POS' | 'ONLINE';
    paymentMethod: string;
  }): Promise<{ ok: true; marked: number } | { ok: false; unreconciledSessions: number }>;
}
