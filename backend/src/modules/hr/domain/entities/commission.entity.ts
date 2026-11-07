export const COMMISSION_STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const;

export interface CommissionView {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  storeId: string | null;
  orderId: string;
  orderNumber: string;
  amount: number;
  rate: number;
  periodMonth: number;
  periodYear: number;
  status: string;
  createdAt: Date;
}

export interface CommissionSummary {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  orderCount: number;
  totalAmount: number;
}
