import { Inject, Injectable } from '@nestjs/common';
import {
  IRefundAdminRepository,
  REFUND_ADMIN_REPOSITORY,
} from '../../domain/repositories/refund-admin.repository.interface';
import {
  RefundMethod,
  assertRefundMethodAllowed,
  assertRefundProcessable,
} from '../../domain/refund-rules';
import { RefundAccessService } from '../services/refund-access.service';
import { AdminRefundDetail, GetAdminRefundDetailUseCase } from './get-admin-refund-detail.use-case';

@Injectable()
export class ProcessAdminRefundUseCase {
  constructor(
    @Inject(REFUND_ADMIN_REPOSITORY) private readonly repository: IRefundAdminRepository,
    private readonly access: RefundAccessService,
    private readonly getDetail: GetAdminRefundDetailUseCase,
  ) {}

  async execute(
    userId: string,
    refundId: string,
    input: { method: RefundMethod; reference?: string; note?: string },
  ): Promise<AdminRefundDetail> {
    const { info, scope } = await this.access.getAccessibleRefund(userId, refundId);
    assertRefundProcessable(info.status);
    const posSessionId =
      input.method === 'CASH' ? await this.repository.findOpenSessionId(userId, info.storeId) : null;
    assertRefundMethodAllowed({
      scopeType: scope.type,
      originalPaymentMethod: info.paymentMethod,
      method: input.method,
      hasOpenSessionAtStore: !!posSessionId,
      reference: input.reference,
    });
    await this.repository.process({ id: refundId, actorId: userId, posSessionId, ...input });
    return this.getDetail.execute(userId, refundId);
  }
}
