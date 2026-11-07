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

export interface CreateRmaPayload {
  orderId: string;
  items: Array<{
    productId: string;
    quantity: number;
    reason: string;
  }>;
  reasonCategory: string;
  evidenceImages?: string[];
  resolutionMethod: 'GLOW_POINTS' | 'ORIGINAL_PAYMENT';
  note?: string;
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

  // Gửi yêu cầu đổi trả / hoàn tiền RMA (FR-04.06)
  createReturnRequest: async (payload: CreateRmaPayload) => {
    const response = await apiClient.post('/returns', payload);
    return response.data;
  },

  // Lấy danh sách yêu cầu RMA
  getMyReturns: async () => {
    const response = await apiClient.get('/returns/me');
    return response.data;
  },

  // Lấy chi tiết tiến trình RMA
  getReturnDetail: async (returnId: string) => {
    const response = await apiClient.get(`/returns/${returnId}`);
    return response.data;
  },
};
