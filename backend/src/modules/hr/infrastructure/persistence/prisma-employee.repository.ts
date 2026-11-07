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

  async update(id: string, patch: EmployeePatch, actorId: string): Promise<EmployeeView> {
    await this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUniqueOrThrow({
        where: { id },
        select: {
          userId: true,
          status: true,
          storeId: true,
          commissionRate: true,
          salary: true,
          user: { select: { status: true } },
        },
      });

      const { fullName, phone, status, ...profile } = patch;
      await tx.employee.update({
        where: { id },
        data: {
          ...profile,
          ...(status !== undefined ? { status } : {}),
        },
      });

      const resigning = status === 'RESIGNED' && employee.status !== 'RESIGNED';
      const returning = employee.status === 'RESIGNED' && !!status && status !== 'RESIGNED';
      const lockUser = resigning && employee.user.status === 'ACTIVE';

      const userData: Prisma.UserUpdateInput = {};
      if (fullName !== undefined) userData.fullName = fullName;
      if (phone !== undefined) userData.phone = phone;
      if (lockUser) userData.status = 'INACTIVE';
      if (returning && (await this.wasLockedByResign(tx, id, employee.userId))) {
        userData.status = 'ACTIVE';
      }
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: employee.userId }, data: userData });
      }

      if (resigning) {
        await tx.userSession.updateMany({
          where: { userId: employee.userId, isRevoked: false },
          data: { isRevoked: true },
        });
      }

      if (profile.storeId !== undefined && profile.storeId !== employee.storeId) {
        if (employee.storeId) {
          await tx.userStore.deleteMany({
            where: { userId: employee.userId, storeId: employee.storeId },
          });
        }
        if (profile.storeId) {
          await tx.userStore.upsert({
            where: { userId_storeId: { userId: employee.userId, storeId: profile.storeId } },
            create: { userId: employee.userId, storeId: profile.storeId },
            update: {},
          });
        }
      }

      const oldData: Record<string, unknown> = {};
      const newData: Record<string, unknown> = {};
      const track = (key: string, before: unknown, after: unknown) => {
        if (after === undefined) return;
        const oldValue = before === null ? null : String(before);
        const newValue = after === null ? null : String(after);
        const same =
          oldValue === newValue ||
          (oldValue !== null && newValue !== null && Number(oldValue) === Number(newValue));
        if (!same) {
          oldData[key] = oldValue;
          newData[key] = newValue;
        }
      };
      track('storeId', employee.storeId, profile.storeId);
      track('status', employee.status, status);
      track('commissionRate', employee.commissionRate, profile.commissionRate);
      track('salary', employee.salary, profile.salary);
      if (lockUser) newData.lockedUser = true;
      if (userData.status === 'ACTIVE') newData.reactivatedUser = true;

      if (Object.keys(newData).length > 0) {
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: resigning ? 'EMPLOYEE_RESIGN' : 'EMPLOYEE_UPDATE',
            entityType: 'employees',
            entityId: id,
            oldData: oldData as Prisma.InputJsonValue,
            newData: newData as Prisma.InputJsonValue,
          },
        });
      }
    });
    return (await this.findById(id)) as EmployeeView;
  }

  // Chỉ mở lại khi lần khóa gần nhất là do nghỉ việc, không phải Admin khóa tay sau đó
  private async wasLockedByResign(
    tx: Prisma.TransactionClient,
    employeeId: string,
    userId: string,
  ): Promise<boolean> {
    const rows = await tx.auditLog.findMany({
      where: {
        OR: [
          { entityType: 'employees', entityId: employeeId, action: 'EMPLOYEE_RESIGN' },
          { entityType: 'users', entityId: userId, action: 'USER_UPDATE' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { action: true, oldData: true, newData: true },
    });
    const last = rows.find((r) => {
      if (r.action === 'EMPLOYEE_RESIGN') return true;
      const before = (r.oldData as { status?: string } | null)?.status;
      const after = (r.newData as { status?: string } | null)?.status;
      return before !== after;
    });
    return (
      last?.action === 'EMPLOYEE_RESIGN' &&
      (last.newData as { lockedUser?: boolean } | null)?.lockedUser === true
    );
  }
}
