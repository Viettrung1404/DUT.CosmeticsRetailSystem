import { axiosClient } from './axiosClient'

export type UploadFolder = 'products' | 'brands' | 'categories'

interface UploadResponse {
  url: string
}

function unwrapUrl(payload: unknown): string {
  let body = payload as unknown

  if (
    body &&
    typeof body === 'object' &&
    'data' in body &&
    ('statusCode' in body || 'success' in body || 'timestamp' in body)
  ) {
    body = (body as { data: unknown }).data
  }

  if (
    body &&
    typeof body === 'object' &&
    'data' in body &&
    'message' in body
  ) {
    body = (body as { data: unknown }).data
  }

  const result = body as UploadResponse
  if (!result?.url) throw new Error('API upload không trả về URL ảnh')
  return result.url
}

export async function uploadImage(
  file: File,
  folder: UploadFolder,
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  const response = await axiosClient.post('/admin/uploads/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return unwrapUrl(response.data)
}
