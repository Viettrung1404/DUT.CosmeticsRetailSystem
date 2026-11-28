import apiClient from './apiClient';

export interface AddressPayload {
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  district?: string;
  ward?: string;
  isDefault?: boolean;
}

export const addressApi = {
  // Lấy danh sách địa chỉ nhận hàng của khách
  getAddresses: async () => {
    const response = await apiClient.get('/customers/me/addresses');
    return response.data;
  },

  // Tạo địa chỉ nhận hàng mới
  createAddress: async (payload: AddressPayload) => {
    const response = await apiClient.post('/customers/me/addresses', payload);
    return response.data;
  },

  // Cập nhật địa chỉ nhận hàng
  updateAddress: async (id: string, payload: Partial<AddressPayload>) => {
    const response = await apiClient.put(`/customers/me/addresses/${id}`, payload);
    return response.data;
  },

  // Đặt làm địa chỉ nhận hàng mặc định
  setDefaultAddress: async (id: string) => {
    const response = await apiClient.patch(`/customers/me/addresses/${id}/default`);
    return response.data;
  },

  // Xóa địa chỉ nhận hàng
  deleteAddress: async (id: string) => {
    const response = await apiClient.delete(`/customers/me/addresses/${id}`);
    return response.data;
  },
};

