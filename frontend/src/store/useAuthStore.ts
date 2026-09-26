import { create } from "zustand";
import type { AuthUser } from "@/types/domain";

export type { AuthUser };

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (userData: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  login: (userData) => set({ isAuthenticated: true, user: userData }),
  logout: () => set({ isAuthenticated: false, user: null }),
}));