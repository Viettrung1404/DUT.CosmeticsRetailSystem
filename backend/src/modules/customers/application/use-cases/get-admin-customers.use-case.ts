import { Inject, Injectable } from '@nestjs/common';
import {
  DataScope,
  GetUserDataScopeUseCase,
} from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  ADMIN_CUSTOMER_REPOSITORY,
  AdminCustomerListItem,
  AdminCustomerListQuery,
  AdminCustomerScopeFilter,
  IAdminCustomerRepository,
} from '../../domain/repositories/admin-customer.repository.interface';

export type GetAdminCustomersInput = Omit<AdminCustomerListQuery, 'scope'>;

export const toCustomerScopeFilter = (scope: DataScope): AdminCustomerScopeFilter => {
  if (scope.type === 'ALL') {
    return {};
  }
  if (scope.type === 'STORE') {
    return { orderStoreIds: scope.storeIds };
  }
  return scope.employeeId ? { orderSalesStaffId: scope.employeeId } : { orderStoreIds: [] };
};

@Injectable()
export class GetAdminCustomersUseCase {
  constructor(
    @Inject(ADMIN_CUSTOMER_REPOSITORY)
    private readonly adminCustomerRepository: IAdminCustomerRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    input: GetAdminCustomersInput,
  ): Promise<{ items: AdminCustomerListItem[]; total: number }> {
    const scope = await this.getUserDataScope.execute(userId);
    return this.adminCustomerRepository.findMany({ ...input, scope: toCustomerScopeFilter(scope) });
  }
}
