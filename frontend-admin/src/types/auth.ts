export interface AuthUser {
  id: string
  email: string
  fullName: string
  avatarUrl?: string | null
  roleName?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface ApiEnvelope<T> {
  statusCode: number
  success: boolean
  message?: string
  data: T
  timestamp: string
}
