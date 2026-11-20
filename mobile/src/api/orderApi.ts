import apiClient from './apiClient';

export interface ShippingAddressInput {
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  ward?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

export interface OrderItemInput {
  variantId: string;
  quantity: number;
}

export interface ShippingQuoteItemInput {
  variantId: string;
  quantity: number;
}

export interface ShippingQuoteAddressInput {
  provinceCity: string;
  district: string;
  ward?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
}

export interface CalculateShippingQuoteInput {
  items: ShippingQuoteItemInput[];
  shippingAddress: ShippingQuoteAddressInput;
  orderType?: string;
}

export interface ShippingQuoteOption {
  id?: string;
  carrierCode: 'AHAMOVE' | 'GHN' | string;
  serviceCode: 'EXPRESS_2H' | 'STANDARD' | string;
  serviceName: string;
  sourceLocationId?: string;
  sourceLocationName?: string;
  estimatedFee: number;
  estimatedDeliveryTime?: string | Date;
  distanceKm?: number;
  isAvailable: boolean;
  unavailableReason?: string;
}

export interface ShippingQuoteResponse {
  quoteGroupId: string;
  expiresAt: string | Date;
  options: ShippingQuoteOption[];
}

export interface CreateOrderPayload {
  shippingAddress: ShippingAddressInput;
  paymentMethod?: 'COD' | 'SEPAY';
  items?: OrderItemInput[];
  note?: string;
  couponCode?: string;
  usePoints?: number;
  quoteVersion?: string;
  storeId?: string;
  quoteGroupId?: string;
  shippingOptionId?: string;
}

export type ReturnReasonCode =
  | 'CHANGE_OF_MIND'
  | 'DAMAGED_IN_TRANSIT'
  | 'DEFECTIVE'
  | 'ALLERGIC'
  | 'WRONG_ITEM'
  | 'EXPIRED';

// Hỗ trợ cả type cũ cho tương thích ngược
export type ReturnReasonType =
  | ReturnReasonCode
  | 'CUSTOMER_CHANGE_MIND';

export type ReturnChannel = 'STORE_DROPOFF' | 'CARRIER_PICKUP';

export interface AllowedReturnRule {
  reasonCode: ReturnReasonCode | string;
  requiresUnopenedSeal: boolean;
  requiresEvidenceVideo: boolean;
  maxReturnWindowDays: number;
  customerPaysReturnShipping: boolean;
}

export interface EligibleReturnItem {
  orderItemId: string;
  variantId: string;
  productName: string;
  variantName?: string;
  sku?: string;
  imageUrl?: string;
  unitPrice: number;
  paidQuantity: number;
  alreadyReturnedQuantity: number;
  availableReturnQuantity: number;
  allowedReasons: (ReturnReasonCode | string)[];
}

export interface OrderReturnEligibility {
  orderId: string;
  orderNumber?: string;
  deliveredAt?: string;
  policyVersionId?: string;
  isEligibleForReturn: boolean;
  ineligibilityReason?: string;
  items: EligibleReturnItem[];
  allowedRules?: AllowedReturnRule[];
}

export interface StoreLocation {
  id: string;
  name: string;
  code?: string;
  address: string;
  city?: string;
  district?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
}

export interface CreateRmaItemInput {
  orderItemId: string;
  quantity: number;
  reasonCode: ReturnReasonCode | string;
  customerNote?: string;
  evidenceImages: string[];
  evidenceVideoUrl?: string;
}

export interface CreateRmaPayload {
  orderId: string;
  returnChannel?: ReturnChannel;
  dropoffLocationId?: string;
  pickupAddress?: Record<string, any>;
  customerNote?: string;
  items: CreateRmaItemInput[];
  // Cho tương thích ngược
  type?: 'REFUND' | 'EXCHANGE';
  reason?: string;
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

  // Tính toán báo giá cước vận chuyển thời gian thực (POST /shipping/quotes)
  getShippingQuotes: async (payload: CalculateShippingQuoteInput): Promise<ShippingQuoteResponse> => {
    const response = await apiClient.post('/shipping/quotes', payload);
    return response.data?.data || response.data;
  },

  // Đặt hàng mới (FR-02.06 - Tạo đơn COD / SEPAY)
  createOrder: async (payload: CreateOrderPayload, idempotencyKey?: string) => {
    const key =
      idempotencyKey ||
      'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
    const response = await apiClient.post('/orders', payload, {
      headers: {
        'Idempotency-Key': key,
      },
    });
    return response.data;
  },

  // Lấy danh sách đơn hàng cá nhân (FR-04.01)
  getMyOrders: async (status?: string) => {
    const response = await apiClient.get('/customers/me/orders', {
      params: { status },
    });
    return response.data?.data || response.data;
  },

  // Lấy chi tiết 1 đơn hàng (FR-04.02)
  getOrderDetail: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data?.data || response.data;
  },

  // Hủy đơn hàng PENDING (FR-04.05)
  cancelOrder: async (orderId: string, reason?: string) => {
    const response = await apiClient.put(`/orders/${orderId}/cancel`, { reason });
    return response.data?.data || response.data;
  },

  // Upload ảnh/video chứng từ đổi trả (trả về { attachmentId, mimeType, size })
  uploadReturnImage: async (formData: FormData) => {
    const response = await apiClient.post('/uploads/return-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data?.data || response.data;
  },

  // Kiểm tra tính hợp lệ đổi trả của đơn hàng (GET /customers/me/orders/:id/return-eligibility)
  getOrderReturnEligibility: async (orderId: string): Promise<OrderReturnEligibility> => {
    const response = await apiClient.get(`/customers/me/orders/${orderId}/return-eligibility`);
    return response.data?.data || response.data;
  },

  // Lấy danh sách Showroom thực tế (GET /stores)
  getStores: async (): Promise<StoreLocation[]> => {
    const response = await apiClient.get('/stores');
    return response.data?.data || response.data;
  },

  // Gửi yêu cầu đổi trả / hoàn tiền RMA (POST /returns)
  createReturnRequest: async (payload: CreateRmaPayload, idempotencyKey?: string) => {
    const key =
      idempotencyKey ||
      'rma-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
    const response = await apiClient.post('/returns', payload, {
      headers: {
        'Idempotency-Key': key,
      },
    });
    return response.data?.data || response.data;
  },

  // Lấy danh sách yêu cầu RMA của tôi (GET /returns)
  getMyReturns: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await apiClient.get('/returns', { params });
    return response.data?.data || response.data;
  },

  // Lấy chi tiết tiến trình RMA (GET /returns/:id)
  getReturnDetail: async (returnId: string) => {
    const response = await apiClient.get(`/returns/${returnId}`);
    return response.data?.data || response.data;
  },

  // Lấy thông tin tracking nhiều kiện hàng của đơn (GET /orders/:id/tracking)
  getOrderTracking: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}/tracking`);
    return response.data?.data || response.data;
  },
};

// Thông tin chuyển khoản SePay do server trả về trong qrCodeData.
// Khớp với schema web dùng ở frontend/src/features/checkout/sepay-transfer.ts
// (bank, accountNumber, accountName, amount, content GU + 32 ký tự hex, imageUrl).
export interface SepayTransfer {
  bank: string;
  bankAccountId?: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  content: string;
  mode?: string;
  imageUrl: string;
}

export function parseSepayQrCodeData(raw: string | null | undefined): SepayTransfer | null {
  try {
    const parsed = JSON.parse(raw || 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.accountNumber !== 'string' || !parsed.accountNumber) return null;
    if (typeof parsed.content !== 'string' || !/^GU[A-F0-9]{32}$/.test(parsed.content)) return null;
    if (typeof parsed.imageUrl !== 'string' || !parsed.imageUrl.startsWith('https://')) return null;
    return {
      bank: typeof parsed.bank === 'string' ? parsed.bank : '',
      bankAccountId: typeof parsed.bankAccountId === 'string' ? parsed.bankAccountId : undefined,
      accountNumber: parsed.accountNumber,
      accountName: typeof parsed.accountName === 'string' ? parsed.accountName : '',
      amount: Number(parsed.amount) || 0,
      content: parsed.content,
      mode: typeof parsed.mode === 'string' ? parsed.mode : undefined,
      imageUrl: parsed.imageUrl,
    };
  } catch {
    return null;
  }
}

export const paymentApi = {
  // Khởi tạo thanh toán SePay cho 1 đơn đã tạo (POST /payments/sepay/create).
  // Backend tự sinh mã chuyển khoản GU..., lấy tài khoản từ SEPAY_* trong env
  // và trả về qrCodeData (JSON string). Mobile KHÔNG tự hardcode tài khoản nữa.
  createSepayPayment: async (orderId: string) => {
    const response = await apiClient.post('/payments/sepay/create', {
      orderId,
      platform: 'MOBILE',
    });
    return response?.data?.data || response?.data || response;
  },

  // Tra cứu trạng thái 1 lần thanh toán (GET /payments/:id/status)
  getPaymentStatus: async (paymentId: string) => {
    const response = await apiClient.get(`/payments/${paymentId}/status`);
    return response?.data?.data || response?.data || response;
  },
};
