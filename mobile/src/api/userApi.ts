import apiClient from './apiClient';

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}

export const userApi = {
  // Lấy thông tin tài khoản hiện tại
  getProfile: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  // Cập nhật thông tin tài khoản
  updateProfile: async (payload: UpdateProfilePayload) => {
    const response = await apiClient.patch('/users/me', payload);
    return response.data;
  },

  // Đổi mật khẩu tài khoản
  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    const response = await apiClient.post('/auth/change-password', payload);
    return response.data;
  },
};

