import { axiosClient } from './axiosClient'
import type { AdminPermission, AdminRole, AdminUser, AdminUsersQuery, PageResult, UpdateUserInput, UserInput } from '../types/adminUsers'

// Global Nest interceptor wraps controller responses in { statusCode, success, data }.
function unwrap<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
    return (response as { data: T }).data
  }
  return response as T
}
export async function getUsers(params: AdminUsersQuery): Promise<PageResult<AdminUser>> {
  const res = await axiosClient.get('/admin/users', { params })
  return unwrap<PageResult<AdminUser>>(res.data)
}
export async function getUser(id: string): Promise<AdminUser> {
  const res = await axiosClient.get(`/admin/users/${id}`)
  return unwrap<AdminUser>(res.data)
}
export async function getRoles(): Promise<AdminRole[]> {
  const res = await axiosClient.get('/admin/roles')
  return unwrap<AdminRole[]>(res.data)
}
export async function getPermissions(): Promise<AdminPermission[]> {
  const res = await axiosClient.get('/admin/permissions')
  return unwrap<AdminPermission[]>(res.data)
}
export async function createUser(payload: UserInput): Promise<{ user: AdminUser; activationEmailSent: boolean }> {
  const res = await axiosClient.post('/admin/users', payload)
  return unwrap<{ user: AdminUser; activationEmailSent: boolean }>(res.data)
}
export async function updateUser(id: string, payload: UpdateUserInput): Promise<AdminUser> {
  const res = await axiosClient.put(`/admin/users/${id}`, payload)
  return unwrap<AdminUser>(res.data)
}
export async function setUserStores(id: string, storeIds: string[]): Promise<AdminUser> {
  const res = await axiosClient.put(`/admin/users/${id}/stores`, { storeIds })
  return unwrap<AdminUser>(res.data)
}
export async function setUserPermissions(
  id: string, extraPermissions: string, revokedPermissions: string,
): Promise<AdminUser> {
  const res = await axiosClient.put(`/admin/users/${id}/permissions`, { extraPermissions, revokedPermissions })
  return unwrap<AdminUser>(res.data)
}
