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

export type ReturnReasonType =
  | 'WRONG_ITEM'
  | 'DEFECTIVE'
  | 'EXPIRED'
  | 'ALLERGIC'
  | 'CUSTOMER_CHANGE_MIND';

export interface CreateRmaPayload {
  orderId: string;
  type: 'REFUND' | 'EXCHANGE';
  reason: ReturnReasonType;
  items: Array<{
    orderItemId: string;
    quantity: number;
  }>;
  attachmentIds?: string[];
  replacements?: Array<{
    productVariantId: string;
    quantity: number;
  }>;
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

  // Upload ảnh chứng từ đổi trả (trả về { attachmentId, mimeType, size })
  uploadReturnImage: async (formData: FormData) => {
    const response = await apiClient.post('/uploads/return-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Gửi yêu cầu đổi trả / hoàn tiền RMA (POST /returns)
  createReturnRequest: async (payload: CreateRmaPayload) => {
    const idempotencyKey =
      'rma-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
    const response = await apiClient.post('/returns', payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return response.data;
  },

  // Lấy danh sách yêu cầu RMA của tôi (GET /returns)
  getMyReturns: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await apiClient.get('/returns', { params });
    return response.data;
  },

  // Lấy chi tiết tiến trình RMA (GET /returns/:id)
  getReturnDetail: async (returnId: string) => {
    const response = await apiClient.get(`/returns/${returnId}`);
    return response.data;
  },

  // Lấy thông tin tracking nhiều kiện hàng của đơn (GET /orders/:id/tracking)
  getOrderTracking: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}/tracking`);
    return response.data;
  },
};
