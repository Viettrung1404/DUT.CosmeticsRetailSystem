import { axiosClient } from './axiosClient'
import type {
  Category,
  CategoryPayload,
  ListQuery,
  PageResult,
} from '../types/catalog'

interface CategoryQuery extends ListQuery {
  parentId?: string
}

function unwrap<T>(payload: unknown): T {
  const body = payload as { data?: T }
  return body && typeof body === 'object' && 'data' in body
    ? (body.data as T)
    : (payload as T)
}

export async function getCategories(
  query: CategoryQuery = {},
): Promise<PageResult<Category>> {
  const response = await axiosClient.get('/admin/categories', { params: query })
  return unwrap<PageResult<Category>>(response.data)
}

export async function getCategoryTree(): Promise<Category[]> {
  const response = await axiosClient.get('/admin/categories/tree')
  return unwrap<Category[]>(response.data)
}

export async function createCategory(payload: CategoryPayload): Promise<Category> {
  const response = await axiosClient.post('/admin/categories', payload)
  return unwrap<{ data: Category } | Category>(response.data) as Category
}

export async function updateCategory(
  id: string,
  payload: Partial<CategoryPayload>,
): Promise<Category> {
  const response = await axiosClient.patch(`/admin/categories/${id}`, payload)
  const body = unwrap<{ data: Category } | Category>(response.data)
  return (body as { data?: Category }).data ?? (body as Category)
}

export async function deleteCategory(id: string): Promise<void> {
  await axiosClient.delete(`/admin/categories/${id}`)
}
