import { axiosClient } from './axiosClient'

export type PurchaseOrderItem = {
  id: string
  productVariantId: string
  sku: string
  productName: string
  quantityOrdered: number
  quantityReceived: number
  unitCost: number
}
export type PurchaseOrder = {
  id: string
  poNumber: string
  supplierName: string
  storeName: string
  status: string
  items: PurchaseOrderItem[]
}

type Page<T> = { data: T[]; meta: { itemCount: number; page: number; limit: number } }
function unwrapPage<T>(input: unknown): Page<T> {
  const body = input as Page<T> | { data: Page<T> }
  return 'meta' in body ? body as Page<T> : body.data
}

export async function getReceivablePurchaseOrders(search = ''): Promise<PurchaseOrder[]> {
  const results = await Promise.all(['CONFIRMED', 'PARTIALLY_RECEIVED'].map(status =>
    axiosClient.get('/admin/purchase-orders', { params: { page: 1, limit: 100, status, search: search || undefined } })
  ))
  return results.flatMap(result => unwrapPage<PurchaseOrder>(result.data).data || [])
}

export async function getPurchaseOrderDetail(id: string): Promise<PurchaseOrder> {
  const response = await axiosClient.get('/admin/purchase-orders/' + encodeURIComponent(id))
  const body = response.data as PurchaseOrder | { data: PurchaseOrder }
  return 'id' in body ? body as PurchaseOrder : body.data
}
