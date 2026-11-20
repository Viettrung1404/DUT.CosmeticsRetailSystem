/**
 * API Service Phân hệ Store & Warehouse Operations dành cho Nhân viên
 * GlowUp Omnichannel - Phase 4 (MB-05, MB-06, MB-07)
 */
import apiClient from './apiClient';

export interface TaskQueueQuery {
  page?: number;
  limit?: number;
  storeId?: string;
}

export interface TaskQueueItem {
  id: string;
  fulfillmentOrderNumber: string;
  status: string;
  sourceLocationId: string;
  sourceLocationName?: string;
  totalItemsCount: number;
  shippingServiceCode: string;
  assignedPickerId?: string | null;
  orderNumber?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryMethod?: string;
  allocatedAt?: string | null;
  pickedAt?: string | null;
  packedAt?: string | null;
  availableActions?: string[];
  shipmentId?: string;
  trackingCode?: string;
}

export interface TaskQueueResponse {
  items: TaskQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PickListItem {
  variantId: string;
  sku: string;
  productName: string;
  barcode?: string | null;
  lotId: string;
  batchCode: string;
  expiryDate: string | Date;
  quantity: number;
}

export interface PickListResponse {
  fulfillmentOrderId: string;
  fulfillmentOrderNumber: string;
  sourceLocationId: string;
  sourceLocationName: string;
  status: string;
  totalItemsCount: number;
  items: PickListItem[];
}

export interface PickedItemPayload {
  variantId: string;
  batchCode: string;
  quantity: number;
  barcode?: string;
}

export interface CompletePickingPayload {
  items: PickedItemPayload[];
  expectedVersion?: number;
}

export interface ConfirmHandoverPayload {
  expectedVersion?: number;
  driverName?: string;
  driverPhone?: string;
  driverLicensePlate?: string;
  note?: string;
}

export interface ConfirmHandoverResponse {
  success: boolean;
  status: string;
  handedOverAt: string;
  fulfillmentOrderId: string;
  shipmentId: string;
  trackingCode: string;
  orderStatus: string;
}

export interface ReceiveStoreDropoffPayload {
  packageConditionNote?: string;
  receivedItemsCount?: number;
}

export interface ReceiveStoreDropoffResponse {
  receipt: {
    id: string;
    receiptCode: string;
    returnOrderId: string;
    locationId: string;
    receivedBy: string;
    receivedItemsCount: number;
    packageConditionNote: string;
    createdAt: string;
  };
  returnOrder: any;
}

export const staffFulfillmentApi = {
  /**
   * Lấy hàng đợi nhặt hàng (Picking Work Queue) theo chi nhánh
   * GET /api/v1/admin/fulfillment/tasks/picking
   */
  async getPickingQueue(params?: TaskQueueQuery): Promise<TaskQueueResponse> {
    const res = await apiClient.get('/admin/fulfillment/tasks/picking', { params });
    const payload = res.data?.data || res.data;
    return payload;
  },

  /**
   * Lấy hàng đợi bàn giao bưu tá (Handover Work Queue) theo chi nhánh
   * GET /api/v1/admin/fulfillment/tasks/handover
   */
  async getHandoverQueue(params?: TaskQueueQuery): Promise<TaskQueueResponse> {
    const res = await apiClient.get('/admin/fulfillment/tasks/handover', { params });
    const payload = res.data?.data || res.data;
    return payload;
  },

  /**
   * Lấy chi tiết đơn Fulfillment và danh sách nhặt hàng FEFO
   * GET /api/v1/admin/fulfillment-orders/:id/pick-list
   */
  async getPickList(fulfillmentOrderId: string): Promise<PickListResponse> {
    const res = await apiClient.get(`/admin/fulfillment-orders/${fulfillmentOrderId}/pick-list`);
    const payload = res.data?.data || res.data;
    return payload;
  },

  /**
   * Bắt đầu nhặt hàng: Chuyển trạng thái từ ALLOCATED sang PICKING
   * POST /api/v1/admin/fulfillment-orders/:id/start-picking
   */
  async startPicking(
    fulfillmentOrderId: string,
    expectedVersion?: number
  ): Promise<any> {
    const res = await apiClient.post(
      `/admin/fulfillment-orders/${fulfillmentOrderId}/start-picking`,
      { expectedVersion }
    );
    return res.data?.data || res.data;
  },

  /**
   * Hoàn tất nhặt hàng: Gửi danh sách sản phẩm và số lô FEFO thực tế
   * POST /api/v1/admin/fulfillment-orders/:id/complete-picking
   */
  async completePicking(
    fulfillmentOrderId: string,
    payload: CompletePickingPayload
  ): Promise<any> {
    const res = await apiClient.post(
      `/admin/fulfillment-orders/${fulfillmentOrderId}/complete-picking`,
      payload
    );
    return res.data?.data || res.data;
  },

  /**
   * Xác nhận bàn giao kiện hàng cho tài xế/bưu tá 3PL
   * POST /api/v1/admin/fulfillment-orders/:id/confirm-handover
   */
  async confirmHandover(
    fulfillmentOrderId: string,
    payload?: ConfirmHandoverPayload
  ): Promise<ConfirmHandoverResponse> {
    const res = await apiClient.post(
      `/admin/fulfillment-orders/${fulfillmentOrderId}/confirm-handover`,
      payload || {}
    );
    return res.data?.data || res.data;
  },

  /**
   * Tra cứu chi tiết hồ sơ đổi trả RMA bằng ID hoặc Return Code
   * GET /api/v1/returns/:id
   */
  async getReturnDetail(returnIdOrCode: string): Promise<any> {
    const res = await apiClient.get(`/returns/${returnIdOrCode}`);
    return res.data?.data || res.data;
  },

  /**
   * Tiếp nhận hàng khách mang đổi trả tại Showroom
   * POST /api/v1/admin/returns/:id/receive-at-store
   */
  async receiveStoreDropoff(
    returnOrderId: string,
    payload: ReceiveStoreDropoffPayload
  ): Promise<ReceiveStoreDropoffResponse> {
    const res = await apiClient.post(
      `/admin/returns/${returnOrderId}/receive-at-store`,
      payload
    );
    return res.data?.data || res.data;
  },

  /**
   * Lấy danh sách Showroom / Cửa hàng trong hệ thống
   * GET /api/v1/stores
   */
  async getStores(): Promise<any[]> {
    const res = await apiClient.get('/stores');
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : data.items || [];
  },
};
