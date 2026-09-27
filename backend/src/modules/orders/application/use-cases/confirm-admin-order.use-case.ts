import { Inject, Injectable } from '@nestjs/common';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
import { OrderStateMachine } from '@core/domain/orders/order-state-machine';
import {
  ADMIN_ORDER_REPOSITORY,
  IAdminOrderRepository,
} from '../../domain/repositories/admin-order.repository.interface';
import { AdminOrderAccessService } from '../services/admin-order-access.service';
import {
  AdminOrderDetailWithActions,
  GetAdminOrderDetailUseCase,
} from './get-admin-order-detail.use-case';

@Injectable()
export class ConfirmAdminOrderUseCase {
  constructor(
    @Inject(ADMIN_ORDER_REPOSITORY)
    private readonly adminOrderRepository: IAdminOrderRepository,
    private readonly accessService: AdminOrderAccessService,
    private readonly getAdminOrderDetail: GetAdminOrderDetailUseCase,
  ) {}

  async execute(userId: string, orderId: string, note?: string): Promise<AdminOrderDetailWithActions> {
    const order = await this.accessService.getAccessibleOrder(userId, orderId);

    // Kiểm tra sớm để báo lỗi nhanh; repository kiểm tra lại sau khi khóa dòng đơn
    OrderStateMachine.assertValidTransition(
      order.status as OrderStatus,
      OrderStatus.CONFIRMED,
      'ADMIN',
    );

    await this.adminOrderRepository.confirm({ orderId, changedBy: userId, note });

    return this.getAdminOrderDetail.execute(userId, orderId);
  }
}
