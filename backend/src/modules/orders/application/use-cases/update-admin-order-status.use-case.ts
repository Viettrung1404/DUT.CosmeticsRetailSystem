import { Inject, Injectable } from '@nestjs/common';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
import { OrderStateMachine } from '@core/domain/orders/order-state-machine';
import {
  ADMIN_ORDER_REPOSITORY,
  IAdminOrderRepository,
  OrderStatusChangeResult,
} from '../../domain/repositories/admin-order.repository.interface';
import { AdminOrderAccessService } from '../services/admin-order-access.service';
import {
  AdminOrderDetailWithActions,
  GetAdminOrderDetailUseCase,
} from './get-admin-order-detail.use-case';

export interface UpdateAdminOrderStatusResult {
  detail: AdminOrderDetailWithActions;
  notes: string[];
}

const describeSideEffects = (result: OrderStatusChangeResult): string[] => {
  const notes: string[] = [];
  if (result.stockDeducted) notes.push('Đã trừ tồn kho xuất giao.');
  if (result.codPaymentsCompleted > 0) notes.push('Đã ghi nhận thu tiền COD.');
  if (result.loyalty) {
    if (!result.loyalty.configured) {
      notes.push('Chưa cấu hình tỷ lệ tích điểm (settings: loyalty_config) nên chưa cộng điểm.');
    } else {
      notes.push(`Đã cộng ${result.loyalty.pointsEarned} điểm cho khách.`);
    }
    if (result.loyalty.newTierName) notes.push(`Khách lên hạng ${result.loyalty.newTierName}.`);
  }
  if (result.commissionAmount !== null) notes.push(`Đã ghi hoa hồng ${result.commissionAmount}đ cho nhân viên bán.`);
  return notes;
};

@Injectable()
export class UpdateAdminOrderStatusUseCase {
  constructor(
    @Inject(ADMIN_ORDER_REPOSITORY)
    private readonly adminOrderRepository: IAdminOrderRepository,
    private readonly accessService: AdminOrderAccessService,
    private readonly getAdminOrderDetail: GetAdminOrderDetailUseCase,
  ) {}

  async execute(
    userId: string,
    orderId: string,
    target: OrderStatus,
    note?: string,
  ): Promise<UpdateAdminOrderStatusResult> {
    const order = await this.accessService.getAccessibleOrder(userId, orderId);
    OrderStateMachine.assertValidTransition(order.status as OrderStatus, target, 'ADMIN');

    const result = await this.adminOrderRepository.updateStatus({
      orderId,
      target,
      changedBy: userId,
      note,
    });

    const detail = await this.getAdminOrderDetail.execute(userId, orderId);
    return { detail, notes: describeSideEffects(result) };
  }
}
