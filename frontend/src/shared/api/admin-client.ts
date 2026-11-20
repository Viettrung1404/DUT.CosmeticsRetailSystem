/**
 * Admin Client cho Admin Operations Portal
 * GlowUp Omnichannel - Phase 5 (FE-05)
 */

export interface AdminRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  storeId?: string;
}

const STORE_SCOPE_STORAGE_KEY = 'glowup_admin_store_scope';

export function getStoredStoreScope(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORE_SCOPE_STORAGE_KEY);
}

export function setStoredStoreScope(storeId: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (storeId) {
    localStorage.setItem(STORE_SCOPE_STORAGE_KEY, storeId);
  } else {
    localStorage.removeItem(STORE_SCOPE_STORAGE_KEY);
  }
}

export async function requestAdminApi<T>(
  endpoint: string,
  options: AdminRequestOptions = {}
): Promise<T> {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Endpoint must target the BFF admin route: /api/admin/...
  const bffPath = cleanPath.startsWith('/api/admin')
    ? cleanPath
    : cleanPath.startsWith('/admin')
    ? `/api${cleanPath}`
    : `/api/admin${cleanPath}`;

  const url = new URL(bffPath, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

  const activeStoreId = options.storeId || getStoredStoreScope();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (activeStoreId) {
    headers['x-store-id'] = activeStoreId;
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body:
      options.body !== undefined
        ? options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
    signal: options.signal,
    credentials: 'same-origin',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      window.location.href = `/login?returnTo=${encodeURIComponent(currentPath)}`;
    }
    interface AdminApiError extends Error {
      status?: number;
      data?: unknown;
    }
    const err: AdminApiError = new Error(data?.message || `Lỗi hệ thống (${response.status})`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  // Bóc tách envelope NestJS data nếu có
  return data?.data !== undefined ? data.data : data;
}

export const adminClient = {
  get: <T>(endpoint: string, options?: Omit<AdminRequestOptions, 'method'>) =>
    requestAdminApi<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<AdminRequestOptions, 'method' | 'body'>) =>
    requestAdminApi<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<AdminRequestOptions, 'method' | 'body'>) =>
    requestAdminApi<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<AdminRequestOptions, 'method' | 'body'>) =>
    requestAdminApi<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: Omit<AdminRequestOptions, 'method'>) =>
    requestAdminApi<T>(endpoint, { ...options, method: 'DELETE' }),
};
