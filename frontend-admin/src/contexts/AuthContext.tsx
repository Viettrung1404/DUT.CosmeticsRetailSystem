import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { loginRequest, logoutRequest } from '../api/authApi'
import type { AuthUser, LoginPayload } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('glowup_user')
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    localStorage.removeItem('glowup_user')
    return null
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())

  const login = async (payload: LoginPayload) => {
    const result = await loginRequest(payload)

    localStorage.setItem('glowup_access_token', result.accessToken)
    localStorage.setItem('glowup_refresh_token', result.refreshToken)
    localStorage.setItem('glowup_user', JSON.stringify(result.user))
    setUser(result.user)
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('glowup_refresh_token')

    try {
      if (refreshToken) await logoutRequest(refreshToken)
    } finally {
      localStorage.removeItem('glowup_access_token')
      localStorage.removeItem('glowup_refresh_token')
      localStorage.removeItem('glowup_user')
      setUser(null)
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(
        user && localStorage.getItem('glowup_access_token'),
      ),
      login,
      logout,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
