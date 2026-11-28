import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface CorrelationStore {
  correlationId: string;
  [key: string]: any;
}

/**
 * AsyncLocalStorage lưu trữ ngữ cảnh Correlation ID xuyên suốt luồng xử lý bất đồng bộ
 * mà không cần phải truyền biến qua từng tham số hàm.
 */
export const correlationAsyncLocalStorage = new AsyncLocalStorage<CorrelationStore>();

/**
 * Lấy Correlation ID hiện tại từ ngữ cảnh AsyncLocalStorage
 * Trả về undefined nếu gọi ngoài request lifecycle
 */
export function getCorrelationId(): string | undefined {
  const store = correlationAsyncLocalStorage.getStore();
  return store?.correlationId;
}

/**
 * Lấy Correlation ID hoặc tự động sinh mới nếu không có
 */
export function getOrCreateCorrelationId(): string {
  return getCorrelationId() || randomUUID();
}

/**
 * Thực thi một hàm callback bên trong một ngữ cảnh Correlation ID nhất định
 */
export function runWithCorrelationContext<T>(
  correlationId: string,
  callback: () => T,
  additionalData?: Record<string, any>,
): T {
  const store: CorrelationStore = {
    correlationId,
    ...additionalData,
  };
  return correlationAsyncLocalStorage.run(store, callback);
}
