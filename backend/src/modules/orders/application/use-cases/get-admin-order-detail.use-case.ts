import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ADMIN_ORDER_REPOSITORY,
  AdminOrderDetail,
  IAdminOrderRepository,
} from '../../domain/repositories/admin-order.repository.interface';
import { AdminOrderAccessService } from '../services/admin-order-access.service';
import { AdminOrderActions, getAdminOrderActions } from '../utils/order-actions.util';

export type AdminOrderDetailWithActions = AdminOrderDetail & { actions: AdminOrderActions };

@Injectable()
export class GetAdminOrderDetailUseCase {
  constructor(
    @Inject(ADMIN_ORDER_REPOSITORY)
    private readonly adminOrderRepository: IAdminOrderRepository,
    private readonly accessService: AdminOrderAccessService,
  ) {}

  async execute(userId: string, orderId: string): Promise<AdminOrderDetailWithActions> {
    await this.accessService.getAccessibleOrder(userId, orderId);

    const detail = await this.adminOrderRepository.findDetail(orderId);
    if (!detail) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return { ...detail, actions: getAdminOrderActions(detail.status) };
  }
}
