export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED'
export interface AdminStore { id: string; code: string; name: string }
export interface AdminUser {
  id: string; email: string; fullName: string; phone: string | null
  roleId: number; roleName: string; roleDisplayName: string; status: UserStatus
  emailVerified: boolean; extraPermissions: string; revokedPermissions: string
  lastLoginAt: string | null; createdAt: string; stores: AdminStore[]; employeeId: string | null
}
export interface AdminRole {
  id: number; name: string; displayName: string; description: string | null
  permissions: string; dataScope: string; isSystem: boolean
}
export interface AdminPermission {
  bitPosition: number; permissionCode: string; permissionName: string; module: string
}
export interface AdminUsersQuery {
  page?: number; limit?: number; order?: 'ASC' | 'DESC'; search?: string
  roleId?: number; status?: UserStatus; storeId?: string
}
export interface PageResult<T> {
  data: T[]; meta: { itemCount: number; page: number; limit?: number; pageCount?: number }
}
export interface UserInput { email: string; fullName: string; phone?: string; roleId: number; storeIds?: string[] }
export interface UpdateUserInput { fullName?: string; phone?: string; roleId?: number; status?: UserStatus }
