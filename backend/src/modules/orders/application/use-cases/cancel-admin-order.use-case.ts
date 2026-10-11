import { Inject, Injectable } from '@nestjs/common';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
import { OrderStateMachine } from '@core/domain/orders/order-state-machine';
import {
  ADMIN_ORDER_REPOSITORY,
  IAdminOrderRepository,
  OrderCancelResult,
} from '../../domain/repositories/admin-order.repository.interface';
import { AdminOrderAccessService } from '../services/admin-order-access.service';
import {
  AdminOrderDetailWithActions,
  GetAdminOrderDetailUseCase,
} from './get-admin-order-detail.use-case';

export interface CancelAdminOrderResult {
  detail: AdminOrderDetailWithActions;
  notes: string[];
}

const describeCancel = (result: OrderCancelResult): string[] => {
  const notes: string[] = [];
  if (result.reservationReleased) notes.push('Đã trả lại hàng đang giữ về tồn khả dụng.');
  if (result.couponReleased) notes.push('Đã hoàn lượt dùng mã giảm giá.');
  if (result.pointsRefunded > 0) notes.push(`Đã hoàn ${result.pointsRefunded} điểm cho khách.`);
  if (result.refundAmount > 0) notes.push(`Đã tạo phiếu hoàn tiền ${result.refundAmount}đ chờ xử lý.`);
  return notes;
};

@Injectable()
export class CancelAdminOrderUseCase {
  constructor(
    @Inject(ADMIN_ORDER_REPOSITORY)
    private readonly adminOrderRepository: IAdminOrderRepository,
    private readonly accessService: AdminOrderAccessService,
    private readonly getAdminOrderDetail: GetAdminOrderDetailUseCase,
  ) {}

  async execute(userId: string, orderId: string, reason: string): Promise<CancelAdminOrderResult> {
    const order = await this.accessService.getAccessibleOrder(userId, orderId);
    OrderStateMachine.assertValidTransition(
      order.status as OrderStatus,
      OrderStatus.CANCELLED,
      'ADMIN',
    );

    const result = await this.adminOrderRepository.cancelByAdmin({
      orderId,
      changedBy: userId,
      reason,
    });

    const detail = await this.getAdminOrderDetail.execute(userId, orderId);
    return { detail, notes: describeCancel(result) };
  }
}
