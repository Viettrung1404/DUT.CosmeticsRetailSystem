export const ADMIN_CUSTOMER_REPOSITORY = Symbol('IAdminCustomerRepository');

// Khách không gắn cửa hàng; phạm vi STORE/SELF hiểu là "khách từng có đơn tại cửa hàng / do mình bán"
export interface AdminCustomerScopeFilter {
  orderStoreIds?: string[];
  orderSalesStaffId?: string;
}

export type AdminCustomerSortField = 'createdAt' | 'totalSpent' | 'totalPoints';

export interface AdminCustomerListQuery {
  scope: AdminCustomerScopeFilter;
  page: number;
  limit: number;
  sortBy: AdminCustomerSortField;
  order: 'asc' | 'desc';
  search?: string;
  loyaltyTierId?: string;
  storeId?: string;
}

export interface AdminCustomerListItem {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  hasAccount: boolean;
  loyaltyTier: { id: string; name: string } | null;
  totalPoints: number;
  totalSpent: number;
  totalOrders: number;
  createdAt: Date;
}

export interface IAdminCustomerRepository {
  findMany(query: AdminCustomerListQuery): Promise<{ items: AdminCustomerListItem[]; total: number }>;
}
