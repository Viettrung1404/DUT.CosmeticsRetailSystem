import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DataScope,
  GetUserDataScopeUseCase,
} from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  IRefundAdminRepository,
  REFUND_ADMIN_REPOSITORY,
  RefundAccessInfo,
} from '../../domain/repositories/refund-admin.repository.interface';
import { assertStoreInScope } from '../utils/scope.util';

@Injectable()
export class RefundAccessService {
  constructor(
    @Inject(REFUND_ADMIN_REPOSITORY) private readonly repository: IRefundAdminRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async getAccessibleRefund(
    userId: string,
    refundId: string,
  ): Promise<{ info: RefundAccessInfo; scope: DataScope }> {
    const info = await this.repository.findAccessInfo(refundId);
    if (!info) throw new NotFoundException('Không tìm thấy phiếu hoàn tiền');
    const scope = await this.getUserDataScope.execute(userId);
    assertStoreInScope(scope, info.storeId, 'Phiếu hoàn tiền');
    return { info, scope };
  }
}
