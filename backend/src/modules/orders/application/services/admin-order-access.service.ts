import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  ADMIN_ORDER_REPOSITORY,
  IAdminOrderRepository,
  OrderAccessInfo,
} from '../../domain/repositories/admin-order.repository.interface';
import { isOrderInScope } from '../utils/order-scope.util';

@Injectable()
export class AdminOrderAccessService {
  constructor(
    @Inject(ADMIN_ORDER_REPOSITORY)
    private readonly adminOrderRepository: IAdminOrderRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async getAccessibleOrder(userId: string, orderId: string): Promise<OrderAccessInfo> {
    const order = await this.adminOrderRepository.findAccessInfo(orderId);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const scope = await this.getUserDataScope.execute(userId);
    if (!isOrderInScope(order, scope)) {
      throw new ForbiddenException('Đơn hàng không thuộc phạm vi cửa hàng bạn phụ trách');
    }

    return order;
  }
}
