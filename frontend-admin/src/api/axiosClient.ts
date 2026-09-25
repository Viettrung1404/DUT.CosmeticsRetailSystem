import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { refreshTokenRequest } from './authApi'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('glowup_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & {
      _retry?: boolean
    }) | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('glowup_refresh_token')
    if (!refreshToken) return Promise.reject(error)

    originalRequest._retry = true

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingRequests.push((newAccessToken) => {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          resolve(axiosClient(originalRequest))
        })
      })
    }

    isRefreshing = true

    try {
      const tokens = await refreshTokenRequest(refreshToken)
      localStorage.setItem('glowup_access_token', tokens.accessToken)
      localStorage.setItem('glowup_refresh_token', tokens.refreshToken)

      pendingRequests.forEach((resume) => resume(tokens.accessToken))
      pendingRequests = []

      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
      return axiosClient(originalRequest)
    } catch (refreshError) {
      localStorage.removeItem('glowup_access_token')
      localStorage.removeItem('glowup_refresh_token')
      localStorage.removeItem('glowup_user')
      pendingRequests = []
      window.location.href = '/admin/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
