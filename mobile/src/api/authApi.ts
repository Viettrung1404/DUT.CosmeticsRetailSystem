import apiClient from './apiClient';

export const authApi = {
  // 1. Đăng nhập
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  // 2. Đăng ký tài khoản
  register: async (userData: { email: string; password: string; fullName: string; phone?: string }) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  // 3. Yêu cầu khôi phục mật khẩu
  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  // 4. Lấy thông tin tài khoản cá nhân
  getProfile: async () => {
    const response = await apiClient.get('/customers/me');
    return response.data;
  },
};