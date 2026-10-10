import { axiosClient } from './axiosClient'
import type {
  AdjustInventoryInput,
  ClosePosSessionInput,
  InventoryItem,
  InventoryQuery,
  OpenPosSessionInput,
  PageResult,
  PosSession,
  PosSessionQuery,
  ReceivePurchaseOrderInput,
} from '../types/operations'

function unwrap<T>(payload: unknown): T {
  const body = payload as { data?: T }
  return body && typeof body === 'object' && 'data' in body ? (body.data as T) : (payload as T)
}

export async function getAdminPosSessions(query: PosSessionQuery = {}): Promise<PageResult<PosSession>> {
  const response = await axiosClient.get('/admin/pos/sessions', { params: query })
  return unwrap<PageResult<PosSession>>(response.data)
}

export async function getCurrentPosSession(storeId: string): Promise<PosSession | null> {
  const response = await axiosClient.get('/pos/sessions/current', { params: { storeId } })
  return unwrap<PosSession | null>(response.data)
}

export async function openPosSession(input: OpenPosSessionInput): Promise<PosSession> {
  const response = await axiosClient.post('/pos/sessions/open', input)
  return unwrap<PosSession>(response.data)
}

export async function closePosSession(id: string, input: ClosePosSessionInput): Promise<PosSession> {
  const response = await axiosClient.post(`/pos/sessions/${id}/close`, input)
  return unwrap<PosSession>(response.data)
}

export async function reconcilePosSession(id: string, note?: string): Promise<PosSession> {
  const response = await axiosClient.post(`/pos/sessions/${id}/reconcile`, { note })
  return unwrap<PosSession>(response.data)
}

export async function getAdminInventory(query: InventoryQuery = {}): Promise<PageResult<InventoryItem>> {
  const response = await axiosClient.get('/admin/inventory', { params: query })
  return unwrap<PageResult<InventoryItem>>(response.data)
}

export async function receivePurchaseOrder(input: ReceivePurchaseOrderInput) {
  const response = await axiosClient.post('/admin/inventory/receive', input)
  return unwrap(response.data)
}

export async function adjustInventory(input: AdjustInventoryInput) {
  const response = await axiosClient.post('/admin/inventory/adjust', input)
  return unwrap(response.data)
}
