import { Prisma } from '@prisma/client';
import { AdminUser } from '../../domain/entities/admin-user.entity';

export const ADMIN_USER_INCLUDE = {
  role: { select: { name: true, displayName: true } },
  userStores: { select: { store: { select: { id: true, code: true, name: true } } } },
  employee: { select: { id: true } },
} satisfies Prisma.UserInclude;

export type AdminUserRow = Prisma.UserGetPayload<{ include: typeof ADMIN_USER_INCLUDE }>;

export const toAdminUser = (row: AdminUserRow): AdminUser => ({
  id: row.id,
  email: row.email,
  fullName: row.fullName,
  phone: row.phone,
  roleId: row.roleId,
  roleName: row.role.name,
  roleDisplayName: row.role.displayName,
  status: row.status,
  emailVerified: row.emailVerified,
  extraPermissions: row.extraPermissions,
  revokedPermissions: row.revokedPermissions,
  lastLoginAt: row.lastLoginAt,
  createdAt: row.createdAt,
  stores: row.userStores.map((us) => us.store),
  employeeId: row.employee?.id ?? null,
});
