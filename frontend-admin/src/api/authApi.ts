import axios from 'axios'
import type { ApiEnvelope, LoginPayload, LoginResult } from '../types/auth'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export async function loginRequest(payload: LoginPayload): Promise<LoginResult> {
  const response = await axios.post<ApiEnvelope<LoginResult> | LoginResult>(
    `${API_BASE_URL}/auth/login`,
    payload,
  )

  const body = response.data
  if ('data' in body) return body.data
  return body
}

export async function refreshTokenRequest(refreshToken: string) {
  const response = await axios.post<
    ApiEnvelope<{ accessToken: string; refreshToken: string }> | {
      accessToken: string
      refreshToken: string
    }
  >(`${API_BASE_URL}/auth/refresh-token`, { refreshToken })

  const body = response.data
  if ('data' in body) return body.data
  return body
}

export async function logoutRequest(refreshToken: string) {
  await axios.post(`${API_BASE_URL}/auth/logout`, { refreshToken })
}
