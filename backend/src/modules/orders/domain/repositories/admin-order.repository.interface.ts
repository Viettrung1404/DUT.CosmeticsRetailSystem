export const ADMIN_ORDER_REPOSITORY = Symbol('IAdminOrderRepository');

export interface AdminOrderScopeFilter {
  storeIds?: string[];
  salesStaffId?: string;
}

export type AdminOrderSortField = 'createdAt' | 'totalAmount';

export interface AdminOrderListQuery {
  scope: AdminOrderScopeFilter;
  page: number;
  limit: number;
  sortBy: AdminOrderSortField;
  order: 'asc' | 'desc';
  status?: string;
  orderType?: string;
  storeId?: string;
  customerId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

export interface OrderCustomerSummary {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
}

export interface OrderStoreSummary {
  id: string;
  name: string;
  code: string;
}

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  customer: OrderCustomerSummary | null;
  store: OrderStoreSummary;
  createdAt: Date;
}

export interface IAdminOrderRepository {
  findMany(query: AdminOrderListQuery): Promise<{ items: AdminOrderListItem[]; total: number }>;
}
