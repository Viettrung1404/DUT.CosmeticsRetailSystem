export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'BANNED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ADMIN_ROLE_ID = 1;

export interface AdminUserStore {
  id: string;
  code: string;
  name: string;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roleId: number;
  roleName: string;
  roleDisplayName: string;
  status: string;
  emailVerified: boolean;
  extraPermissions: bigint;
  revokedPermissions: bigint;
  lastLoginAt: Date | null;
  createdAt: Date;
  stores: AdminUserStore[];
  employeeId: string | null;
}

export interface AdminRole {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  permissions: bigint;
  dataScope: string;
  isSystem: boolean;
}

export interface AdminPermission {
  bitPosition: number;
  permissionCode: string;
  permissionName: string;
  module: string;
}

export interface EmployeeProfileInput {
  employeeCode: string;
  position: string;
  hireDate: Date;
  departmentId?: string | null;
  storeId?: string | null;
  salary?: number | null;
  commissionRate?: number;
}
