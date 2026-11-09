import { Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  IRefundAdminRepository,
  REFUND_ADMIN_REPOSITORY,
  RefundListItem,
} from '../../domain/repositories/refund-admin.repository.interface';
import { RefundMethod, allowedRefundMethods, assertRefundProcessable } from '../../domain/refund-rules';
import { storeIdsForList } from '../utils/scope.util';

export interface ListAdminRefundsInput {
  page: number;
  limit: number;
  status?: string;
  storeId?: string;
  orderId?: string;
  returnOrderId?: string;
  search?: string;
  from?: Date;
  to?: Date;
}

export type AdminRefundListItem = RefundListItem & {
  allowedMethods: RefundMethod[];
  canProcess: boolean;
};

export function refundPermissionsFor(
  scopeType: 'ALL' | 'STORE' | 'SELF',
  item: { status: string; paymentMethod: string | null },
) {
  const allowedMethods = allowedRefundMethods(scopeType, item.paymentMethod);
  let processable = true;
  try {
    assertRefundProcessable(item.status);
  } catch {
    processable = false;
  }
  return { allowedMethods, canProcess: processable && allowedMethods.length > 0 };
}

@Injectable()
export class ListAdminRefundsUseCase {
  constructor(
    @Inject(REFUND_ADMIN_REPOSITORY) private readonly repository: IRefundAdminRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    input: ListAdminRefundsInput,
  ): Promise<{ items: AdminRefundListItem[]; total: number }> {
    const scope = await this.getUserDataScope.execute(userId);
    const storeIds = storeIdsForList(scope, input.storeId);
    if (storeIds && storeIds.length === 0) return { items: [], total: 0 };
    const { items, total } = await this.repository.list({
      storeIds,
      page: input.page,
      limit: input.limit,
      status: input.status,
      orderId: input.orderId,
      returnOrderId: input.returnOrderId,
      search: input.search,
      from: input.from,
      to: input.to,
    });
    return {
      total,
      items: items.map((i) => ({ ...i, ...refundPermissionsFor(scope.type, i) })),
    };
  }
}
