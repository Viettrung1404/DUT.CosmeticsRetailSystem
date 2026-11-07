import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CommissionSummary, CommissionView } from '../../domain/entities/commission.entity';
import {
  CommissionFilter,
  ICommissionRepository,
} from '../../domain/repositories/commission.repository.interface';

const INCLUDE = {
  employee: { select: { employeeCode: true, storeId: true, user: { select: { fullName: true } } } },
  order: { select: { orderNumber: true } },
} satisfies Prisma.CommissionInclude;
type Row = Prisma.CommissionGetPayload<{ include: typeof INCLUDE }>;

const toView = (row: Row): CommissionView => ({
  id: row.id,
  employeeId: row.employeeId,
  employeeCode: row.employee.employeeCode,
  employeeName: row.employee.user.fullName,
  storeId: row.employee.storeId,
  orderId: row.orderId,
  orderNumber: row.order.orderNumber,
  amount: Number(row.amount),
  rate: Number(row.rate),
  periodMonth: row.periodMonth,
  periodYear: row.periodYear,
  status: row.status,
  createdAt: row.createdAt,
});

const toWhere = (filter: CommissionFilter): Prisma.CommissionWhereInput => {
  const and: Prisma.CommissionWhereInput[] = [];
  if (filter.employeeId) and.push({ employeeId: filter.employeeId });
  if (filter.storeIds) and.push({ employee: { storeId: { in: filter.storeIds } } });
  if (filter.month !== undefined) and.push({ periodMonth: filter.month });
  if (filter.year !== undefined) and.push({ periodYear: filter.year });
  if (filter.status) and.push({ status: filter.status });
  return { AND: and };
};

@Injectable()
export class PrismaCommissionRepository implements ICommissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filter: CommissionFilter,
    page: { skip: number; take: number; order: 'asc' | 'desc' },
  ): Promise<{ items: CommissionView[]; total: number }> {
    const where = toWhere(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.commission.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: page.order },
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.commission.count({ where }),
    ]);
    return { items: rows.map(toView), total };
  }

  // Tổng theo nhân viên trên toàn bộ kết quả lọc (không theo trang); dòng CANCELLED không tính vào tổng
  async summarize(filter: CommissionFilter): Promise<CommissionSummary[]> {
    const where: Prisma.CommissionWhereInput = {
      AND: [toWhere(filter), { status: { not: 'CANCELLED' } }],
    };
    const groups = await this.prisma.commission.groupBy({
      by: ['employeeId'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });
    if (groups.length === 0) return [];

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: groups.map((g) => g.employeeId) } },
      select: { id: true, employeeCode: true, user: { select: { fullName: true } } },
    });
    const byId = new Map(employees.map((e) => [e.id, e]));
    return groups
      .map((g) => ({
        employeeId: g.employeeId,
        employeeCode: byId.get(g.employeeId)?.employeeCode ?? '',
        employeeName: byId.get(g.employeeId)?.user.fullName ?? '',
        orderCount: g._count._all,
        totalAmount: Number(g._sum.amount ?? 0),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  async countByStatus(month: number, year: number): Promise<{ pending: number; paid: number }> {
    const base = { periodMonth: month, periodYear: year };
    const [pending, paid] = await Promise.all([
      this.prisma.commission.count({ where: { ...base, status: 'PENDING' } }),
      this.prisma.commission.count({ where: { ...base, status: 'PAID' } }),
    ]);
    return { pending, paid };
  }

  async finalize(month: number, year: number): Promise<number> {
    const result = await this.prisma.commission.updateMany({
      where: { periodMonth: month, periodYear: year, status: 'PENDING' },
      data: { status: 'PAID' },
    });
    return result.count;
  }
}
