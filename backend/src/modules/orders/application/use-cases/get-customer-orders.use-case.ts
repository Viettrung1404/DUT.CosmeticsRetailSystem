import { Injectable, Inject } from '@nestjs/common';
import {
  ORDER_REPOSITORY,
  IOrderRepository,
} from '../../domain/repositories/order.repository.interface';
import { OrderEntity } from '../../domain/entities/order.entity';

export interface GetCustomerOrdersInput {
  customerId: string;
  page?: number;
  limit?: number;
  status?: string;
}

export interface GetCustomerOrdersResult {
  orders: OrderEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class GetCustomerOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: GetCustomerOrdersInput): Promise<GetCustomerOrdersResult> {
    const { customerId, page = 1, limit = 10, status } = input;

    const { orders, total } = await this.orderRepo.findCustomerOrders(
      customerId,
      {
        page,
        limit,
        status,
      },
    );

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
