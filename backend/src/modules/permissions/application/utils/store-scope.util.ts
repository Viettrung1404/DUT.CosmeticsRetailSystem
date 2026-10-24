import { DataScope } from '../use-cases/get-user-data-scope.use-case';

export const isStoreInScope = (scope: DataScope, storeId: string): boolean =>
  scope.type === 'ALL' || (scope.type === 'STORE' && scope.storeIds.includes(storeId));

// undefined = không giới hạn cửa hàng; mảng rỗng = không thấy cửa hàng nào
export const toStoreIdsFilter = (scope: DataScope): string[] | undefined =>
  scope.type === 'ALL' ? undefined : scope.type === 'STORE' ? scope.storeIds : [];
