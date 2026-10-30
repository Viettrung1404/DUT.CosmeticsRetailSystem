export const INVENTORY_ALERT_REPOSITORY = Symbol('IInventoryAlertRepository');

export interface StoreAlertSummary {
  storeId: string;
  storeName: string;
  lowStock: { sku: string; available: number; minQuantity: number }[];
  nearExpiryBatches: number;
  expiredBatches: number;
}

export interface AlertNotification {
  userId: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  eventKey: string;
}

export interface IInventoryAlertRepository {
  summarize(today: Date, nearExpiryBefore: Date): Promise<StoreAlertSummary[]>;
  // QL được gán cửa hàng, NV kho được gán kho tổng, tài khoản đang hoạt động
  findRecipients(storeIds: string[]): Promise<{ userId: string; storeId: string }[]>;
  // Bỏ qua thông báo đã có cùng event_key (không gửi trùng trong ngày)
  createNotifications(rows: AlertNotification[]): Promise<number>;
}
