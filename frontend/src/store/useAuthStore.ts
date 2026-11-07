import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/domain";
import { authService, tokenStorage, LoginDto } from "@/services";

export type { AuthUser };

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  // Local/mock login (kept for offline dev fallback)
  login: (userData: AuthUser) => void;
  // Real API login
  apiLogin: (payload: LoginDto) => Promise<void>;
  // Fetch current user from /auth/me
  fetchCurrentUser: () => Promise<void>;
  // Logout
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,

      // Mock login (kept so existing dev flow still works offline if needed)
      login: (userData) => set({ isAuthenticated: true, user: userData }),

      // Real API login — calls backend, saves JWT tokens, updates store
      apiLogin: async (payload: LoginDto) => {
        set({ isLoading: true });
        try {
          const res = await authService.login(payload);
          const { accessToken, user } = res.data;
          
          set({
            isAuthenticated: true,
            token: accessToken,
            user: {
              id: user.id,
              email: user.email,
              name: user.fullName,
              fullName: user.fullName,
              phone: user.phone,
              role: user.roleName || user.role || "Customer",
            },
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // Check current session via /auth/me
      fetchCurrentUser: async () => {
        const token = tokenStorage.getAccessToken();
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null });
          return;
        }

        try {
          const res = await authService.getMe();
          const user = res.data;
          set({
            isAuthenticated: true,
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.fullName,
              fullName: user.fullName,
              phone: user.phone,
              role: user.roleName || user.role || "Customer",
            },
          });
        } catch {
          // Token invalid or expired
          tokenStorage.clearTokens();
          set({ isAuthenticated: false, user: null, token: null });
        }
      },

      logout: async () => {
        const refresh = tokenStorage.getRefreshToken();
        if (refresh) {
          try {
            await authService.logout(refresh);
          } catch (err) {
            console.warn("Backend logout session revocation failed:", err);
          }
        } else {
          tokenStorage.clearTokens();
        }
        set({ isAuthenticated: false, user: null, token: null });
      },
    }),
    {
      name: "glowup-auth-storage",
    }
  )
);