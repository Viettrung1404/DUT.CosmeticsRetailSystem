import { DataScope } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { AdminOrderScopeFilter } from '../../domain/repositories/admin-order.repository.interface';

export const toOrderScopeFilter = (scope: DataScope): AdminOrderScopeFilter => {
  if (scope.type === 'ALL') {
    return {};
  }
  if (scope.type === 'STORE') {
    return { storeIds: scope.storeIds };
  }
  // SELF mà không phải nhân viên thì không thấy đơn nào (lọc salesStaffId = null sẽ lộ toàn bộ đơn online)
  return scope.employeeId ? { salesStaffId: scope.employeeId } : { storeIds: [] };
};

export const isOrderInScope = (
  order: { storeId: string; salesStaffId: string | null },
  scope: DataScope,
): boolean => {
  if (scope.type === 'ALL') {
    return true;
  }
  if (scope.type === 'STORE') {
    return scope.storeIds.includes(order.storeId);
  }
  return scope.employeeId !== null && order.salesStaffId === scope.employeeId;
};
