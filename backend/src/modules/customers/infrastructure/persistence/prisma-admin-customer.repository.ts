import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  AdminCustomerListItem,
  AdminCustomerListQuery,
  AdminCustomerScopeFilter,
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
          tags: { select: { tag: true }, orderBy: { tag: 'asc' } },
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
      tags: row.tags.map((t) => t.tag),
      createdAt: row.createdAt,
    }));

    return { items, total };
  }

  async exists(id: string) {
    return (await this.prisma.customer.count({ where: { id } })) > 0;
  }

  async isVisible(id: string, scope: AdminCustomerScopeFilter) {
    const where = { AND: [{ id }, ...this.scopeConditions(scope)] };
    return (await this.prisma.customer.count({ where })) > 0;
  }

  async listTags() {
    const rows = await this.prisma.customerTag.groupBy({
      by: ['tag'],
      _count: { customerId: true },
      orderBy: { tag: 'asc' },
    });
    return rows.map((r) => ({ tag: r.tag, customers: r._count.customerId }));
  }

  async replaceTags(customerId: string, tags: string[]) {
    await this.prisma.$transaction([
      this.prisma.customerTag.deleteMany({ where: { customerId, tag: { notIn: tags } } }),
      this.prisma.customerTag.createMany({
        data: tags.map((tag) => ({ customerId, tag })),
        skipDuplicates: true,
      }),
    ]);
  }

  private scopeConditions(scope: AdminCustomerScopeFilter): Prisma.CustomerWhereInput[] {
    const conditions: Prisma.CustomerWhereInput[] = [];
    if (scope.orderStoreIds) {
      conditions.push({ orders: { some: { storeId: { in: scope.orderStoreIds } } } });
    }
    if (scope.orderSalesStaffId) {
      conditions.push({ orders: { some: { salesStaffId: scope.orderSalesStaffId } } });
    }
    return conditions;
  }

  private buildWhere(query: AdminCustomerListQuery): Prisma.CustomerWhereInput {
    const conditions = this.scopeConditions(query.scope);

    if (query.tag) {
      conditions.push({ tags: { some: { tag: query.tag } } });
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
