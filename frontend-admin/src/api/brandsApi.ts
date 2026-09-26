import { axiosClient } from './axiosClient'
import type {
  Brand,
  BrandPayload,
  ListQuery,
  PageResult,
} from '../types/catalog'

function unwrap<T>(payload: unknown): T {
  const body = payload as { data?: T }
  return body && typeof body === 'object' && 'data' in body
    ? (body.data as T)
    : (payload as T)
}

export async function getBrands(
  query: ListQuery = {},
): Promise<PageResult<Brand>> {
  const response = await axiosClient.get('/admin/brands', { params: query })
  return unwrap<PageResult<Brand>>(response.data)
}

export async function createBrand(payload: BrandPayload): Promise<Brand> {
  const response = await axiosClient.post('/admin/brands', payload)
  const body = unwrap<{ data: Brand } | Brand>(response.data)
  return (body as { data?: Brand }).data ?? (body as Brand)
}

export async function updateBrand(
  id: string,
  payload: Partial<BrandPayload>,
): Promise<Brand> {
  const response = await axiosClient.patch(`/admin/brands/${id}`, payload)
  const body = unwrap<{ data: Brand } | Brand>(response.data)
  return (body as { data?: Brand }).data ?? (body as Brand)
}

export async function deleteBrand(id: string): Promise<void> {
  await axiosClient.delete(`/admin/brands/${id}`)
}
