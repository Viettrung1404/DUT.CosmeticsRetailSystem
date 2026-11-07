import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  DataScope,
  GetUserDataScopeUseCase,
} from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { isStoreInScope } from '@modules/permissions/application/utils/store-scope.util';
import { ReportFilter } from '../../domain/repositories/report.repository.interface';
import { DateRange, resolveRange } from '../utils/report-calculations';

export interface ReportScopeInput {
  from?: string;
  to?: string;
  storeId?: string;
  employeeId?: string;
}

// Cửa hàng người dùng được xem tồn kho / đơn chờ: ALL không giới hạn, còn lại theo cửa hàng được gán
export const visibleStores = (scope: DataScope): string[] | undefined =>
  scope.type === 'ALL' ? undefined : scope.storeIds;

@Injectable()
export class ReportScopeService {
  constructor(private readonly getUserDataScope: GetUserDataScopeUseCase) {}

  async stores(userId: string, storeId?: string): Promise<string[] | undefined> {
    const scope = await this.getUserDataScope.execute(userId);
    if (storeId) {
      if (!isStoreInScope(scope, storeId) && !(scope.type === 'SELF' && scope.storeIds.includes(storeId))) {
        throw new ForbiddenException('Cửa hàng ngoài phạm vi của bạn');
      }
      return [storeId];
    }
    return visibleStores(scope);
  }

  async filter(userId: string, input: ReportScopeInput, now = new Date()): Promise<ReportFilter & DateRange> {
    const scope = await this.getUserDataScope.execute(userId);
    const range = resolveRange(now, input.from, input.to);
    if (input.storeId && !isStoreInScope(scope, input.storeId)) {
      throw new ForbiddenException('Cửa hàng ngoài phạm vi của bạn');
    }
    let storeIds = input.storeId ? [input.storeId] : scope.type === 'ALL' ? undefined : scope.storeIds;
    let employeeId = input.employeeId;
    if (scope.type === 'SELF') {
      // Phạm vi cá nhân: chỉ đơn do chính nhân viên này bán
      employeeId = scope.employeeId ?? undefined;
      storeIds = scope.employeeId ? undefined : [];
    }
    return { ...range, storeIds, employeeId };
  }
}
