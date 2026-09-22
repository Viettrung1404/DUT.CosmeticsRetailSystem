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

export interface IPermissionRepository {
  findUserPermissionMasks(userId: string): Promise<UserPermissionMasks | null>;
  findAllDefinitions(): Promise<PermissionDefinition[]>;
}
