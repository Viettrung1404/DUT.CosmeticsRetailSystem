import { axiosClient } from './axiosClient'
import type {
  PosCustomer, PosOrderCreated, PosOrderInput, PosPayment, PosPreview,
  PosProduct, PosReceipt, PosSearchResult, PosStore,
} from '../types/posSales'

// API wrapper của NestJS trả { data: ... } đối với một số endpoint.
function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export async function getPosMyStores(): Promise<PosStore[]> {
  const response = await axiosClient.get('/pos/my-stores')
  return unwrap<PosStore[]>(response.data)
}

export async function searchPosProducts(storeId: string, q: string, page = 1, limit = 20): Promise<PosSearchResult> {
  const response = await axiosClient.get('/pos/products/search', { params: { storeId, q, page, limit } })
  return unwrap<PosSearchResult>(response.data)
}

export async function scanPosProduct(storeId: string, barcode: string): Promise<PosProduct> {
  const response = await axiosClient.get('/pos/products/scan', { params: { storeId, barcode } })
  return unwrap<PosProduct>(response.data)
}

export async function lookupPosCustomer(phone: string): Promise<PosCustomer> {
  const response = await axiosClient.get('/pos/customers/lookup', { params: { phone } })
  return unwrap<PosCustomer>(response.data)
}

export async function createPosCustomer(phone: string, fullName: string): Promise<PosCustomer> {
  const response = await axiosClient.post('/pos/customers', { phone, fullName })
  return unwrap<PosCustomer>(response.data)
}

export async function previewPosOrder(input: PosOrderInput): Promise<PosPreview> {
  const response = await axiosClient.post('/pos/orders/preview', input)
  return unwrap<PosPreview>(response.data)
}

export async function createPosOrder(input: PosOrderInput & { payments: PosPayment[]; note?: string }): Promise<PosOrderCreated> {
  const response = await axiosClient.post('/pos/orders', input)
  return unwrap<PosOrderCreated>(response.data)
}

export async function getPosReceipt(orderId: string): Promise<PosReceipt> {
  const response = await axiosClient.get('/pos/orders/' + encodeURIComponent(orderId) + '/receipt')
  return unwrap<PosReceipt>(response.data)
}
