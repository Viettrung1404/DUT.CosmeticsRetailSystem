import { ForbiddenException } from '@nestjs/common';
import { DataScope } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';

// undefined = không giới hạn cửa hàng; mảng rỗng = không thấy gì
export function storeIdsForList(scope: DataScope, requested?: string): string[] | undefined {
  if (scope.type === 'ALL') return requested ? [requested] : undefined;
  if (scope.type === 'STORE') {
    if (!requested) return scope.storeIds;
    return scope.storeIds.includes(requested) ? [requested] : [];
  }
  return [];
}

export function assertStoreInScope(scope: DataScope, storeId: string, what: string): void {
  const ok =
    scope.type === 'ALL' || (scope.type === 'STORE' && scope.storeIds.includes(storeId));
  if (!ok) throw new ForbiddenException(`${what} không thuộc phạm vi cửa hàng bạn phụ trách`);
}
