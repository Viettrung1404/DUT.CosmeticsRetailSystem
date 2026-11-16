import { axiosClient } from './axiosClient'
export { apiGet, apiPost, apiPut, apiDelete, errorText, money } from './sprint4Api'
export type { Page } from './sprint4Api'
export async function exportReport(type: 'revenue'|'products', format: 'pdf'|'xlsx', params: Record<string,unknown>) {
  const response = await axiosClient.get('/admin/reports/export', {params: {...params, type, format}, responseType:'blob'})
  const url = URL.createObjectURL(response.data as Blob)
  const a = document.createElement('a'); a.href=url; a.download=`glowup-${type}.${format}`; a.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
