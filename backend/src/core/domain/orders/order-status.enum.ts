/**
 * OrderStatus enum according to database design (bảng orders.status).
 * Standardized for both End-user (Customer) and Admin/POS (Back-office).
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export type OrderActor = 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
