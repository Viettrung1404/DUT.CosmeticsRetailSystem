import { Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  IReturnAdminRepository,
  RETURN_ADMIN_REPOSITORY,
  ReturnListItem,
} from '../../domain/repositories/return-admin.repository.interface';
import { storeIdsForList } from '../utils/scope.util';

export interface ListAdminReturnsInput {
  page: number;
  limit: number;
  status?: string;
  storeId?: string;
  returnType?: string;
  search?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class ListAdminReturnsUseCase {
  constructor(
    @Inject(RETURN_ADMIN_REPOSITORY) private readonly repository: IReturnAdminRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    input: ListAdminReturnsInput,
  ): Promise<{ items: ReturnListItem[]; total: number }> {
    const scope = await this.getUserDataScope.execute(userId);
    const storeIds = storeIdsForList(scope, input.storeId);
    if (storeIds && storeIds.length === 0) return { items: [], total: 0 };
    return this.repository.list({
      storeIds,
      page: input.page,
      limit: input.limit,
      status: input.status,
      returnType: input.returnType,
      search: input.search,
      from: input.from,
      to: input.to,
    });
  }
}
