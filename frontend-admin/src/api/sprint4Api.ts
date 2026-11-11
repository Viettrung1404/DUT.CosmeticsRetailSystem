import { axiosClient } from './axiosClient'

export interface Page<T> { data: T[]; meta: { itemCount: number; page?: number } }
export function unbox<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) return (payload as { data: T }).data
  return payload as T
}
export async function apiGet<T>(url: string, params?: object): Promise<T> {
  const response = await axiosClient.get(url, { params }); return unbox<T>(response.data)
}
export async function apiPost<T>(url: string, body?: object): Promise<T> {
  const response = await axiosClient.post(url, body); return unbox<T>(response.data)
}
export async function apiPut<T>(url: string, body?: object): Promise<T> {
  const response = await axiosClient.put(url, body); return unbox<T>(response.data)
}
export async function apiDelete<T>(url: string): Promise<T> {
  const response = await axiosClient.delete(url); return unbox<T>(response.data)
}
export function errorText(error: unknown): string {
  const e = error as { response?: { status?: number; data?: { message?: string | string[] } } }
  const value = e.response?.data?.message
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string') return value
  if (e.response?.status === 403) return 'Tài khoản thiếu quyền hoặc dữ liệu ngoài phạm vi cửa hàng'
  return 'Không tải được dữ liệu. Kiểm tra kết nối Backend.'
}
export const money = (n: number | string | null | undefined) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n ?? 0))
export const uuidRule = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
