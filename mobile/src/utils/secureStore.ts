import * as ExpoSecureStore from 'expo-secure-store';

// Bộ nhớ dự phòng In-memory cho môi trường Web khi localStorage bị chặn (ví dụ iframe sandbox, private browsing)
const memoryStorage = new Map<string, string>();

/**
 * Kiểm tra xem môi trường hiện tại có phải là Web (trình duyệt) hay không.
 * Trình duyệt luôn có đối tượng `window` và `window.document`.
 * React Native native (iOS/Android) không có `document`.
 * Node.js (Vitest) không có `window`.
 */
export const isWebEnvironment = (): boolean => {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
};

/**
 * Lấy dữ liệu an toàn đa nền tảng:
 * - Web: sử dụng window.localStorage (hoặc in-memory fallback)
 * - Mobile (Android/iOS): sử dụng expo-secure-store (Keychain / Keystore)
 */
export async function getItemAsync(key: string): Promise<string | null> {
  if (isWebEnvironment()) {
    try {
      if (typeof window.localStorage !== 'undefined') {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Bỏ qua lỗi truy cập localStorage
    }
    return memoryStorage.get(key) || null;
  }

  try {
    return await ExpoSecureStore.getItemAsync(key);
  } catch {
    return memoryStorage.get(key) || null;
  }
}

/**
 * Lưu dữ liệu an toàn đa nền tảng:
 * - Web: sử dụng window.localStorage
 * - Mobile (Android/iOS): sử dụng expo-secure-store
 */
export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWebEnvironment()) {
    try {
      if (typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Bỏ qua lỗi truy cập localStorage
    }
    memoryStorage.set(key, value);
    return;
  }

  try {
    await ExpoSecureStore.setItemAsync(key, value);
  } catch {
    memoryStorage.set(key, value);
  }
}

/**
 * Xóa dữ liệu an toàn đa nền tảng:
 * - Web: sử dụng window.localStorage.removeItem
 * - Mobile (Android/iOS): sử dụng expo-secure-store
 */
export async function deleteItemAsync(key: string): Promise<void> {
  if (isWebEnvironment()) {
    try {
      if (typeof window.localStorage !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Bỏ qua lỗi
    }
    memoryStorage.delete(key);
    return;
  }

  try {
    await ExpoSecureStore.deleteItemAsync(key);
  } catch {
    memoryStorage.delete(key);
  }
}

export async function isAvailableAsync(): Promise<boolean> {
  if (isWebEnvironment()) {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }
  try {
    if (typeof ExpoSecureStore.isAvailableAsync === 'function') {
      return await ExpoSecureStore.isAvailableAsync();
    }
    return true;
  } catch {
    return false;
  }
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  isWebEnvironment,
};
