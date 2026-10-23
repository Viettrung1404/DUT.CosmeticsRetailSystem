import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { refreshTokenRequest } from './authApi'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

const ACCESS_TOKEN_KEY = 'glowup_access_token'
const REFRESH_TOKEN_KEY = 'glowup_refresh_token'
const USER_KEY = 'glowup_user'

type RetryableRequest = InternalAxiosRequestConfig & {
  _retry?: boolean
}

type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Concurrent 401 responses share the same refresh operation.
let refreshPromise: Promise<AuthTokens> | null = null

function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  if (!refreshPromise) {
    refreshPromise = refreshTokenRequest(refreshToken)
      .then((tokens) => {
        // Do not restore a session that was logged out or replaced while refreshing.
        if (localStorage.getItem(REFRESH_TOKEN_KEY) !== refreshToken) {
          throw new Error('Authentication session changed during token refresh')
        }
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
        return tokens
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) return Promise.reject(error)

    originalRequest._retry = true

    try {
      const tokens = await refreshAccessToken(refreshToken)
      // A logout/new login may have occurred after the shared refresh resolved.
      if (localStorage.getItem(ACCESS_TOKEN_KEY) !== tokens.accessToken) {
        return Promise.reject(new Error('Authentication session changed'))
      }
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
      return axiosClient(originalRequest)
    } catch (refreshError) {
      // Only invalidate the same session; never clear a newer login.
      if (localStorage.getItem(REFRESH_TOKEN_KEY) === refreshToken) {
        clearSession()
        if (window.location.pathname !== '/admin/login') {
          window.location.replace('/admin/login')
        }
      }
      return Promise.reject(refreshError)
    }
  },
)
