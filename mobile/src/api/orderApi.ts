import apiClient from './apiClient';

export interface CreateOrderPayload {
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
  };
  paymentMethod: 'COD' | 'VNPAY';
  note?: string;
  couponCode?: string;
}

export const orderApi = {
  // Xem trước giá & phí ship (Preview Order)
  previewOrder: async (payload: any) => {
    const response = await apiClient.post('/orders/preview', payload);
    return response.data;
  },

  // Đặt hàng mới (FR-02.06 - Tạo đơn COD)
  createOrder: async (payload: CreateOrderPayload) => {
    const response = await apiClient.post('/orders', payload);
    return response.data;
  },

  // Lấy danh sách đơn hàng cá nhân (FR-04.01)
  getMyOrders: async (status?: string) => {
    const response = await apiClient.get('/customers/me/orders', {
      params: { status },
    });
    return response.data;
  },

  // Lấy chi tiết 1 đơn hàng (FR-04.02)
  getOrderDetail: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  },

  // Hủy đơn hàng PENDING (FR-04.05)
  cancelOrder: async (orderId: string, reason?: string) => {
    const response = await apiClient.put(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  },
};