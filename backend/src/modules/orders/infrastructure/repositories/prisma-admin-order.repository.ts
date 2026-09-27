import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  AdminOrderListItem,
  AdminOrderListQuery,
  AdminOrderScopeFilter,
  IAdminOrderRepository,
  OrderCustomerSummary,
} from '../../domain/repositories/admin-order.repository.interface';

const CUSTOMER_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  user: { select: { fullName: true, phone: true, email: true } },
} satisfies Prisma.CustomerSelect;

type CustomerRow = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_SELECT }>;

@Injectable()
export class PrismaAdminOrderRepository implements IAdminOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    query: AdminOrderListQuery,
  ): Promise<{ items: AdminOrderListItem[]; total: number }> {
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ [query.sortBy]: query.order }, { id: 'asc' }],
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customer: { select: CUSTOMER_SELECT },
          store: { select: { id: true, name: true, code: true } },
          payments: {
            select: { paymentMethod: true, status: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      orderType: row.orderType,
      status: row.status,
      totalAmount: Number(row.totalAmount),
      itemCount: row._count.items,
      paymentMethod: row.payments[0]?.paymentMethod ?? null,
      paymentStatus: row.payments[0]?.status ?? null,
      customer: this.toCustomerSummary(row.customer),
      store: row.store,
      createdAt: row.createdAt,
    }));

    return { items, total };
  }

  private buildWhere(query: AdminOrderListQuery): Prisma.OrderWhereInput {
    const conditions: Prisma.OrderWhereInput[] = [this.scopeWhere(query.scope)];

    if (query.status) conditions.push({ status: query.status });
    if (query.orderType) conditions.push({ orderType: query.orderType });
    if (query.storeId) conditions.push({ storeId: query.storeId });
    if (query.customerId) conditions.push({ customerId: query.customerId });
    if (query.from || query.to) {
      conditions.push({ createdAt: { gte: query.from, lt: query.to } });
    }
    if (query.search) {
      conditions.push({ orderNumber: { contains: query.search, mode: 'insensitive' } });
    }

    return { AND: conditions };
  }

  private scopeWhere(scope: AdminOrderScopeFilter): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (scope.storeIds) where.storeId = { in: scope.storeIds };
    if (scope.salesStaffId) where.salesStaffId = scope.salesStaffId;
    return where;
  }

  private toCustomerSummary(customer: CustomerRow | null): OrderCustomerSummary | null {
    if (!customer) {
      return null;
    }
    // Khách POS có thể chưa có tài khoản, nên ưu tiên thông tin trên hồ sơ khách rồi mới tới tài khoản
    return {
      id: customer.id,
      fullName: customer.fullName ?? customer.user?.fullName ?? null,
      phone: customer.phone ?? customer.user?.phone ?? null,
      email: customer.user?.email ?? null,
    };
  }
}
