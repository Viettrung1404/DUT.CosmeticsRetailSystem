import { axiosClient } from './axiosClient'
import type {
  AdminCustomerListItem,
  AdminCustomerQuery,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderQuery,
  OrderStatus,
  PageResult,
} from '../types/orders'

function unwrap<T>(payload: unknown): T {
  const body = payload as { data?: T }
  return body && typeof body === 'object' && 'data' in body
    ? (body.data as T)
    : (payload as T)
}

export async function getAdminOrders(
  query: AdminOrderQuery = {},
): Promise<PageResult<AdminOrderListItem>> {
  const response = await axiosClient.get('/admin/orders', { params: query })
  return unwrap<PageResult<AdminOrderListItem>>(response.data)
}

export async function getAdminOrderDetail(id: string): Promise<AdminOrderDetail> {
  const response = await axiosClient.get(`/admin/orders/${id}`)
  return unwrap<AdminOrderDetail>(response.data)
}

export async function confirmAdminOrder(id: string, note?: string): Promise<AdminOrderDetail> {
  const response = await axiosClient.put(`/admin/orders/${id}/confirm`, { note })
  const body = unwrap<{ data?: AdminOrderDetail } | AdminOrderDetail>(response.data)
  return (body as { data?: AdminOrderDetail }).data ?? (body as AdminOrderDetail)
}

export async function updateAdminOrderStatus(
  id: string,
  status: OrderStatus,
  note?: string,
): Promise<AdminOrderDetail> {
  const response = await axiosClient.put(`/admin/orders/${id}/status`, { status, note })
  const body = unwrap<{ data?: AdminOrderDetail } | AdminOrderDetail>(response.data)
  return (body as { data?: AdminOrderDetail }).data ?? (body as AdminOrderDetail)
}

export async function cancelAdminOrder(id: string, reason: string): Promise<AdminOrderDetail> {
  const response = await axiosClient.put(`/admin/orders/${id}/cancel`, { reason })
  const body = unwrap<{ data?: AdminOrderDetail } | AdminOrderDetail>(response.data)
  return (body as { data?: AdminOrderDetail }).data ?? (body as AdminOrderDetail)
}

export async function getAdminCustomers(
  query: AdminCustomerQuery = {},
): Promise<PageResult<AdminCustomerListItem>> {
  const response = await axiosClient.get('/admin/customers', { params: query })
  return unwrap<PageResult<AdminCustomerListItem>>(response.data)
}
