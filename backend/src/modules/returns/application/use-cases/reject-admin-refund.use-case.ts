import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  IRefundAdminRepository,
  REFUND_ADMIN_REPOSITORY,
} from '../../domain/repositories/refund-admin.repository.interface';
import { allowedRefundMethods, assertRefundRejectable } from '../../domain/refund-rules';
import { RefundAccessService } from '../services/refund-access.service';
import { AdminRefundDetail, GetAdminRefundDetailUseCase } from './get-admin-refund-detail.use-case';

@Injectable()
export class RejectAdminRefundUseCase {
  constructor(
    @Inject(REFUND_ADMIN_REPOSITORY) private readonly repository: IRefundAdminRepository,
    private readonly access: RefundAccessService,
    private readonly getDetail: GetAdminRefundDetailUseCase,
  ) {}

  async execute(userId: string, refundId: string, reason: string): Promise<AdminRefundDetail> {
    const { info, scope } = await this.access.getAccessibleRefund(userId, refundId);
    assertRefundRejectable(info.status);
    if (allowedRefundMethods(scope.type, info.paymentMethod).length === 0) {
      throw new ForbiddenException('Bạn không có quyền từ chối phiếu hoàn tiền này');
    }
    await this.repository.reject({ id: refundId, actorId: userId, reason });
    return this.getDetail.execute(userId, refundId);
  }
}
