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

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Chỉ có thể hủy đơn hàng khi đơn đang ở trạng thái Chờ xử lý (PENDING)',
      );
    }

    return this.orderRepo.cancelOrderWithTransaction(orderId, customerId, reason);
  }
}
