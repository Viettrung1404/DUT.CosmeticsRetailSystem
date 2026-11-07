import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  AdminPermission,
  AdminRole,
  AdminUser,
} from '../../domain/entities/admin-user.entity';
import {
  AdminUserListFilter,
  AuditEntry,
  CreateStaffData,
  IAdminUserRepository,
  UserPatch,
} from '../../domain/repositories/admin-user.repository.interface';
import { ADMIN_USER_INCLUDE, toAdminUser } from '../mappers/admin-user.mapper';

@Injectable()
export class PrismaAdminUserRepository implements IAdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: AdminUserListFilter): Promise<{ items: AdminUser[]; total: number }> {
    const where: Prisma.UserWhereInput = {};
    if (filter.roleId !== undefined) where.roleId = filter.roleId;
    if (filter.status) where.status = filter.status;
    if (filter.storeId) {
      where.OR = [
        { userStores: { some: { storeId: filter.storeId } } },
        { employee: { storeId: filter.storeId } },
      ];
    }
    if (filter.search) {
      where.AND = [
        {
          OR: [
            { fullName: { contains: filter.search, mode: 'insensitive' } },
            { email: { contains: filter.search, mode: 'insensitive' } },
            { phone: { contains: filter.search } },
          ],
        },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: ADMIN_USER_INCLUDE,
        orderBy: { createdAt: filter.order },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: rows.map(toAdminUser), total };
  }

  async findById(id: string): Promise<AdminUser | null> {
    const row = await this.prisma.user.findUnique({ where: { id }, include: ADMIN_USER_INCLUDE });
    return row ? toAdminUser(row) : null;
  }

  findByEmail(email: string): Promise<{ id: string } | null> {
    return this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
  }

  findByPhone(phone: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({ where: { phone }, select: { id: true } });
  }

  findEmployeeCodeOwner(code: string): Promise<{ id: string } | null> {
    return this.prisma.employee.findUnique({ where: { employeeCode: code }, select: { id: true } });
  }

  async findExistingStoreIds(ids: string[]): Promise<string[]> {
    const rows = await this.prisma.store.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async findRoleById(id: number): Promise<AdminRole | null> {
    return this.prisma.role.findUnique({ where: { id } });
  }

  findRoles(): Promise<AdminRole[]> {
    return this.prisma.role.findMany({ orderBy: { id: 'asc' } });
  }

  findPermissions(): Promise<AdminPermission[]> {
    return this.prisma.permission.findMany({
      select: { bitPosition: true, permissionCode: true, permissionName: true, module: true },
      orderBy: { bitPosition: 'asc' },
    });
  }

  async createStaff(data: CreateStaffData): Promise<AdminUser> {
    const id = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          fullName: data.fullName,
          phone: data.phone ?? null,
          roleId: data.roleId,
          status: 'ACTIVE',
          emailVerified: true,
          userStores: { create: data.storeIds.map((storeId) => ({ storeId })) },
        },
        select: { id: true },
      });
      await tx.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: data.tokenHash,
          type: 'PASSWORD_RESET',
          expiresAt: data.tokenExpiresAt,
        },
      });
      if (data.employee) {
        await tx.employee.create({
          data: {
            userId: user.id,
            employeeCode: data.employee.employeeCode,
            position: data.employee.position,
            hireDate: data.employee.hireDate,
            departmentId: data.employee.departmentId ?? null,
            storeId: data.employee.storeId ?? null,
            salary: data.employee.salary ?? null,
            commissionRate: data.employee.commissionRate ?? 0,
          },
        });
      }
      return user.id;
    });
    return (await this.findById(id)) as AdminUser;
  }

  async update(id: string, patch: UserPatch, audit?: AuditEntry): Promise<AdminUser> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: patch });
      if (audit) await this.writeAudit(tx, audit);
    });
    return (await this.findById(id)) as AdminUser;
  }

  async revokeSessions(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async setPermissions(
    id: string,
    extra: bigint,
    revoked: bigint,
    audit: AuditEntry,
  ): Promise<AdminUser> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { extraPermissions: extra, revokedPermissions: revoked },
      });
      await this.writeAudit(tx, audit);
    });
    return (await this.findById(id)) as AdminUser;
  }

  async setStores(id: string, storeIds: string[], audit: AuditEntry): Promise<AdminUser> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userStore.deleteMany({ where: { userId: id } });
      if (storeIds.length > 0) {
        await tx.userStore.createMany({
          data: storeIds.map((storeId) => ({ userId: id, storeId })),
        });
      }
      await this.writeAudit(tx, audit);
    });
    return (await this.findById(id)) as AdminUser;
  }

  private writeAudit(tx: Prisma.TransactionClient, audit: AuditEntry) {
    return tx.auditLog.create({
      data: {
        userId: audit.actorId,
        action: audit.action,
        entityType: 'users',
        entityId: audit.entityId,
        oldData: (audit.oldData ?? undefined) as Prisma.InputJsonValue | undefined,
        newData: (audit.newData ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
