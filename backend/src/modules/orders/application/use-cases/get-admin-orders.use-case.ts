import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  ADMIN_ORDER_REPOSITORY,
  AdminOrderListItem,
  AdminOrderListQuery,
  IAdminOrderRepository,
} from '../../domain/repositories/admin-order.repository.interface';
import { toOrderScopeFilter } from '../utils/order-scope.util';

export interface GetAdminOrdersInput extends Omit<AdminOrderListQuery, 'scope' | 'from' | 'to'> {
  fromDate?: string;
  toDate?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Ngày lọc hiểu theo giờ Việt Nam; toDate tính trọn ngày nên cận trên là 0h ngày hôm sau
const startOfVnDay = (date: string): Date => new Date(`${date}T00:00:00+07:00`);

@Injectable()
export class GetAdminOrdersUseCase {
  constructor(
    @Inject(ADMIN_ORDER_REPOSITORY)
    private readonly adminOrderRepository: IAdminOrderRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    input: GetAdminOrdersInput,
  ): Promise<{ items: AdminOrderListItem[]; total: number }> {
    const { fromDate, toDate, ...filters } = input;
    const from = fromDate ? startOfVnDay(fromDate) : undefined;
    const to = toDate ? new Date(startOfVnDay(toDate).getTime() + DAY_MS) : undefined;

    if (from && to && from >= to) {
      throw new BadRequestException('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
    }

    const scope = await this.getUserDataScope.execute(userId);

    return this.adminOrderRepository.findMany({
      ...filters,
      scope: toOrderScopeFilter(scope),
      from,
      to,
    });
  }
}
