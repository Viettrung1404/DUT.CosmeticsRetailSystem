import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ORDER_REPOSITORY,
  IOrderRepository,
} from '../../domain/repositories/order.repository.interface';
import { OrderEntity } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../../../core/domain/orders/order-status.enum';
import { OrderStateMachine } from '../../../../core/domain/orders/order-state-machine';

export interface CancelOrderInput {
  orderId: string;
  customerId: string;
  reason?: string;
}

@Injectable()
export class CancelOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: CancelOrderInput): Promise<OrderEntity> {
    const { orderId, customerId, reason } = input;

    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.customerId !== customerId) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn hàng này');
    }

    // Single Source of Truth: OrderStateMachine validates transition for CUSTOMER actor
    OrderStateMachine.assertValidTransition(
      order.status as OrderStatus,
      OrderStatus.CANCELLED,
      'CUSTOMER',
    );

    return this.orderRepo.cancelOrderWithTransaction(orderId, customerId, reason);
  }
}
