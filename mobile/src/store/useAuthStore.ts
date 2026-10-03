import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/apiClient';

interface User {
  id?: string;
  email: string;
  full_name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => Promise<void>; // Khai báo thêm setAuth
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  // Định nghĩa hàm setAuth lưu Token & User
  setAuth: async (user, token) => {
    await SecureStore.setItemAsync('userToken', token);
    set({ user, token });
  },

  login: async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { access_token, user } = res.data;
    await SecureStore.setItemAsync('userToken', access_token);
    set({ user, token: access_token });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        const res = await apiClient.get('/users/me');
        set({ user: res.data, token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync('userToken');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));