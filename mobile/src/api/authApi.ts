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

  // 5. Cập nhật thông tin hồ sơ
  updateProfile: async (data: { full_name?: string; phone?: string; birthday?: string; gender?: string; skin_type?: string }) => {
    const response = await apiClient.put('/users/me', data);
    return response.data;
  },

  // 6. Đổi mật khẩu
  changePassword: async (data: { currentPassword?: string; newPassword: string }) => {
    const response = await apiClient.put('/auth/change-password', data);
    return response.data;
  },
};
