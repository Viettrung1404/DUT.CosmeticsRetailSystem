import {
  AdminPermission,
  AdminRole,
  AdminUser,
  EmployeeProfileInput,
} from '../entities/admin-user.entity';

export const ADMIN_USER_REPOSITORY = Symbol('IAdminUserRepository');

export interface AdminUserListFilter {
  skip: number;
  take: number;
  order: 'asc' | 'desc';
  search?: string;
  roleId?: number;
  status?: string;
  storeId?: string;
}

export interface CreateStaffData {
  email: string;
  fullName: string;
  phone?: string | null;
  roleId: number;
  storeIds: string[];
  tokenHash: string;
  tokenExpiresAt: Date;
  employee?: EmployeeProfileInput;
}

export interface UserPatch {
  roleId?: number;
  status?: string;
  fullName?: string;
  phone?: string | null;
}

export interface AuditEntry {
  actorId: string;
  action: string;
  entityId: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}

export interface IAdminUserRepository {
  findAll(filter: AdminUserListFilter): Promise<{ items: AdminUser[]; total: number }>;
  findById(id: string): Promise<AdminUser | null>;
  findByEmail(email: string): Promise<{ id: string } | null>;
  findByPhone(phone: string): Promise<{ id: string } | null>;
  findEmployeeCodeOwner(code: string): Promise<{ id: string } | null>;
  findExistingStoreIds(ids: string[]): Promise<string[]>;
  findRoleById(id: number): Promise<AdminRole | null>;
  findRoles(): Promise<AdminRole[]>;
  findPermissions(): Promise<AdminPermission[]>;
  createStaff(data: CreateStaffData): Promise<AdminUser>;
  update(id: string, patch: UserPatch, audit?: AuditEntry): Promise<AdminUser>;
  revokeSessions(userId: string): Promise<void>;
  setPermissions(
    id: string,
    extra: bigint,
    revoked: bigint,
    audit: AuditEntry,
  ): Promise<AdminUser>;
  setStores(id: string, storeIds: string[], audit: AuditEntry): Promise<AdminUser>;
}
