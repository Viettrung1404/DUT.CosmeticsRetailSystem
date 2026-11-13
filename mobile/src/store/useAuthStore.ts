import { create } from 'zustand';
import * as SecureStore from '../utils/secureStore';
import apiClient from '../api/apiClient';

export interface User {
  id?: string;
  email: string;
  full_name?: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string, refreshToken?: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: { email: string; password: string; fullName: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,

  setAuth: async (user, token, refreshToken) => {
    await SecureStore.setItemAsync('userToken', token);
    if (refreshToken) {
      await SecureStore.setItemAsync('userRefreshToken', refreshToken);
    }
    set({ user, token, refreshToken: refreshToken || null });
  },

  login: async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    // Bóc tách envelope NestJS: res.data.data hoặc res.data
    const payload = res?.data?.data || res?.data || {};
    const accessToken = payload.accessToken || payload.access_token || '';
    const refreshToken = payload.refreshToken || payload.refresh_token || '';
    const user = payload.user || { email, full_name: email.split('@')[0] };

    if (accessToken) {
      await SecureStore.setItemAsync('userToken', accessToken);
    }
    if (refreshToken) {
      await SecureStore.setItemAsync('userRefreshToken', refreshToken);
    }

    set({ user, token: accessToken, refreshToken, isLoading: false });
  },

  register: async (payload) => {
    const res = await apiClient.post('/auth/register', payload);
    const data = res?.data?.data || res?.data || {};
    const accessToken = data.accessToken || data.access_token;
    const refreshToken = data.refreshToken || data.refresh_token;
    const user = data.user || { email: payload.email, full_name: payload.fullName };

    if (accessToken) {
      await SecureStore.setItemAsync('userToken', accessToken);
      if (refreshToken) {
        await SecureStore.setItemAsync('userRefreshToken', refreshToken);
      }
      set({ user, token: accessToken, refreshToken, isLoading: false });
    }
  },

  logout: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('userRefreshToken');
      if (refreshToken && apiClient?.post) {
        try {
          await apiClient.post('/auth/logout', { refreshToken });
        } catch {
          // Bỏ qua lỗi mạng khi logout
        }
      }
    } finally {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userRefreshToken');
      set({ user: null, token: null, refreshToken: null, isLoading: false });
    }
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const refreshToken = await SecureStore.getItemAsync('userRefreshToken');
      if (token) {
        const res = await apiClient.get('/users/me');
        const user = res?.data?.data || res?.data || null;
        set({ user, token, refreshToken, isLoading: false });
      } else {
        set({ user: null, token: null, refreshToken: null, isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userRefreshToken');
      set({ user: null, token: null, refreshToken: null, isLoading: false });
    }
  },
}));
