import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EmployeeView } from '../../domain/entities/employee.entity';
import {
  EmployeeListFilter,
  EmployeePatch,
  IEmployeeRepository,
} from '../../domain/repositories/employee.repository.interface';
import { EMPLOYEE_INCLUDE, toEmployeeView } from '../mappers/employee.mapper';

@Injectable()
export class PrismaEmployeeRepository implements IEmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: EmployeeListFilter): Promise<{ items: EmployeeView[]; total: number }> {
    const and: Prisma.EmployeeWhereInput[] = [];
    if (filter.employeeId) and.push({ id: filter.employeeId });
    if (filter.storeIds) and.push({ storeId: { in: filter.storeIds } });
    if (filter.departmentId) and.push({ departmentId: filter.departmentId });
    if (filter.status) and.push({ status: filter.status });
    if (filter.search) {
      and.push({
        OR: [
          { employeeCode: { contains: filter.search, mode: 'insensitive' } },
          { user: { fullName: { contains: filter.search, mode: 'insensitive' } } },
          { user: { email: { contains: filter.search, mode: 'insensitive' } } },
        ],
      });
    }
    const where: Prisma.EmployeeWhereInput = { AND: and };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: EMPLOYEE_INCLUDE,
        orderBy: { createdAt: filter.order },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { items: rows.map(toEmployeeView), total };
  }

  async findById(id: string): Promise<EmployeeView | null> {
    const row = await this.prisma.employee.findUnique({ where: { id }, include: EMPLOYEE_INCLUDE });
    return row ? toEmployeeView(row) : null;
  }

  async findByUserId(userId: string): Promise<EmployeeView | null> {
    const row = await this.prisma.employee.findUnique({
      where: { userId },
      include: EMPLOYEE_INCLUDE,
    });
    return row ? toEmployeeView(row) : null;
  }

  async departmentExists(id: string): Promise<boolean> {
    return (await this.prisma.department.count({ where: { id } })) > 0;
  }

  async storeExists(id: string): Promise<boolean> {
    return (await this.prisma.store.count({ where: { id } })) > 0;
  }

  findPhoneOwner(phone: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({ where: { phone }, select: { id: true } });
  }

  async findMaxEmployeeNumber(): Promise<number> {
    const rows = await this.prisma.employee.findMany({
      where: { employeeCode: { startsWith: 'NV' } },
      select: { employeeCode: true },
    });
    return rows.reduce((max, r) => {
      const match = /^NV(\d+)$/.exec(r.employeeCode);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
  }

  async update(id: string, patch: EmployeePatch): Promise<EmployeeView> {
    await this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUniqueOrThrow({
        where: { id },
        select: { userId: true, status: true },
      });

      const { fullName, phone, status, ...profile } = patch;
      await tx.employee.update({
        where: { id },
        data: {
          ...profile,
          ...(status !== undefined ? { status } : {}),
        },
      });

      const userData: Prisma.UserUpdateInput = {};
      if (fullName !== undefined) userData.fullName = fullName;
      if (phone !== undefined) userData.phone = phone;
      if (status === 'RESIGNED' && employee.status !== 'RESIGNED') userData.status = 'INACTIVE';
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: employee.userId }, data: userData });
      }

      if (status === 'RESIGNED' && employee.status !== 'RESIGNED') {
        await tx.userSession.updateMany({
          where: { userId: employee.userId, isRevoked: false },
          data: { isRevoked: true },
        });
      }
      if (employee.status === 'RESIGNED' && status && status !== 'RESIGNED') {
        await tx.user.updateMany({
          where: { id: employee.userId, status: 'INACTIVE' },
          data: { status: 'ACTIVE' },
        });
      }

      if (profile.storeId) {
        await tx.userStore.upsert({
          where: { userId_storeId: { userId: employee.userId, storeId: profile.storeId } },
          create: { userId: employee.userId, storeId: profile.storeId },
          update: {},
        });
      }
    });
    return (await this.findById(id)) as EmployeeView;
  }
}
