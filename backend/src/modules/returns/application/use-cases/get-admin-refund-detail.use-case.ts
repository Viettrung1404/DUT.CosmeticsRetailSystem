import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IRefundAdminRepository,
  REFUND_ADMIN_REPOSITORY,
  RefundDetail,
} from '../../domain/repositories/refund-admin.repository.interface';
import { RefundMethod } from '../../domain/refund-rules';
import { RefundAccessService } from '../services/refund-access.service';
import { refundPermissionsFor } from './list-admin-refunds.use-case';

export type AdminRefundDetail = RefundDetail & { allowedMethods: RefundMethod[]; canProcess: boolean };

@Injectable()
export class GetAdminRefundDetailUseCase {
  constructor(
    @Inject(REFUND_ADMIN_REPOSITORY) private readonly repository: IRefundAdminRepository,
    private readonly access: RefundAccessService,
  ) {}

  async execute(userId: string, refundId: string): Promise<AdminRefundDetail> {
    const { scope } = await this.access.getAccessibleRefund(userId, refundId);
    const detail = await this.repository.findDetail(refundId);
    if (!detail) throw new NotFoundException('Không tìm thấy phiếu hoàn tiền');
    const openStores = await this.repository.findOpenSessionStoreIds(userId);
    return { ...detail, ...refundPermissionsFor(scope.type, detail, openStores) };
  }
}
