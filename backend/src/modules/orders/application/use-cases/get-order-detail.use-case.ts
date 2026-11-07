import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ORDER_REPOSITORY,
  IOrderRepository,
} from '../../domain/repositories/order.repository.interface';
import { OrderEntity } from '../../domain/entities/order.entity';

@Injectable()
export class GetOrderDetailUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(orderId: string, customerId: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.customerId !== customerId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem thông tin đơn hàng này',
      );
    }

    return order;
  }
}
