import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  AdminCustomerListItem,
  AdminCustomerListQuery,
  IAdminCustomerRepository,
} from '../../domain/repositories/admin-customer.repository.interface';

@Injectable()
export class PrismaAdminCustomerRepository implements IAdminCustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    query: AdminCustomerListQuery,
  ): Promise<{ items: AdminCustomerListItem[]; total: number }> {
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ [query.sortBy]: query.order }, { id: 'asc' }],
        select: {
          id: true,
          userId: true,
          fullName: true,
          phone: true,
          totalPoints: true,
          totalSpent: true,
          totalOrders: true,
          createdAt: true,
          user: { select: { fullName: true, phone: true, email: true } },
          loyaltyTier: { select: { id: true, name: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      fullName: row.fullName ?? row.user?.fullName ?? null,
      phone: row.phone ?? row.user?.phone ?? null,
      email: row.user?.email ?? null,
      hasAccount: row.userId !== null,
      loyaltyTier: row.loyaltyTier,
      totalPoints: row.totalPoints,
      totalSpent: Number(row.totalSpent),
      totalOrders: row.totalOrders,
      createdAt: row.createdAt,
    }));

    return { items, total };
  }

  private buildWhere(query: AdminCustomerListQuery): Prisma.CustomerWhereInput {
    const conditions: Prisma.CustomerWhereInput[] = [];
    const { orderStoreIds, orderSalesStaffId } = query.scope;

    if (orderStoreIds) {
      conditions.push({ orders: { some: { storeId: { in: orderStoreIds } } } });
    }
    if (orderSalesStaffId) {
      conditions.push({ orders: { some: { salesStaffId: orderSalesStaffId } } });
    }
    if (query.storeId) {
      conditions.push({ orders: { some: { storeId: query.storeId } } });
    }
    if (query.loyaltyTierId) {
      conditions.push({ loyaltyTierId: query.loyaltyTierId });
    }
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      // Khách POS có thể chưa có tài khoản nên tìm cả trên hồ sơ khách lẫn tài khoản
      conditions.push({
        OR: [
          { fullName: contains },
          { phone: contains },
          { user: { fullName: contains } },
          { user: { phone: contains } },
          { user: { email: contains } },
        ],
      });
    }

    return { AND: conditions };
  }
}
