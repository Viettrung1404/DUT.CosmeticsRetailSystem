import { axiosClient } from './axiosClient'
import type {
  PageResult,
  Product,
  ProductListQuery,
  ProductPayload,
  ProductUpdatePayload,
  ProductVariant,
  ProductVariantPayload,
} from '../types/catalog'

function unwrapEnvelope<T>(payload: unknown): T {
  const body = payload as {
    statusCode?: number
    success?: boolean
    timestamp?: string
    data?: T
  }

  if (
    body &&
    typeof body === 'object' &&
    'data' in body &&
    ('statusCode' in body || 'success' in body || 'timestamp' in body)
  ) {
    return body.data as T
  }

  return payload as T
}

function unwrapAction<T>(payload: unknown): T {
  const body = unwrapEnvelope<unknown>(payload) as
    | { message?: string; data?: T }
    | T

  if (
    body &&
    typeof body === 'object' &&
    'data' in body &&
    ('message' in body || Object.keys(body).length <= 2)
  ) {
    return (body as { data: T }).data
  }

  return body as T
}

export async function getProducts(
  query: ProductListQuery = {},
): Promise<PageResult<Product>> {
  const response = await axiosClient.get('/admin/products', { params: query })
  return unwrapEnvelope<PageResult<Product>>(response.data)
}

export async function getProduct(id: string): Promise<Product> {
  const response = await axiosClient.get(`/admin/products/${id}`)
  return unwrapEnvelope<Product>(response.data)
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const response = await axiosClient.post('/admin/products', payload)
  return unwrapAction<Product>(response.data)
}

export async function updateProduct(
  id: string,
  payload: ProductUpdatePayload,
): Promise<Product> {
  const response = await axiosClient.patch(`/admin/products/${id}`, payload)
  return unwrapAction<Product>(response.data)
}

export async function deleteProduct(id: string): Promise<void> {
  await axiosClient.delete(`/admin/products/${id}`)
}

export async function getProductVariants(
  productId: string,
): Promise<ProductVariant[]> {
  const response = await axiosClient.get(
    `/admin/products/${productId}/variants`,
  )
  return unwrapEnvelope<ProductVariant[]>(response.data)
}

export async function createProductVariant(
  productId: string,
  payload: ProductVariantPayload,
): Promise<ProductVariant> {
  const response = await axiosClient.post(
    `/admin/products/${productId}/variants`,
    payload,
  )
  return unwrapAction<ProductVariant>(response.data)
}

export async function updateProductVariant(
  id: string,
  payload: Partial<ProductVariantPayload>,
): Promise<ProductVariant> {
  const response = await axiosClient.patch(`/admin/variants/${id}`, payload)
  return unwrapAction<ProductVariant>(response.data)
}

export async function deleteProductVariant(id: string): Promise<void> {
  await axiosClient.delete(`/admin/variants/${id}`)
}
