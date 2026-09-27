export const PERMISSION_REPOSITORY = Symbol('IPermissionRepository');

export interface UserPermissionMasks {
  rolePermissions: bigint;
  extraPermissions: bigint;
  revokedPermissions: bigint;
}

export interface PermissionDefinition {
  bitPosition: number;
  permissionCode: string;
}

export interface UserScopeInfo {
  dataScope: string;
  assignedStoreIds: string[];
  employeeId: string | null;
  employeeStoreId: string | null;
}

export interface IPermissionRepository {
  findUserPermissionMasks(userId: string): Promise<UserPermissionMasks | null>;
  findAllDefinitions(): Promise<PermissionDefinition[]>;
  findUserScopeInfo(userId: string): Promise<UserScopeInfo | null>;
}
