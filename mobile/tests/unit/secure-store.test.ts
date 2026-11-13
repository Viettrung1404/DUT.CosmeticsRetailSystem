import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const mockNativeStore: Record<string, string> = {};

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => mockNativeStore[key] || null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    mockNativeStore[key] = value;
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    delete mockNativeStore[key];
  }),
  isAvailableAsync: vi.fn(async () => true),
}));

import * as SecureStoreModule from '@/utils/secureStore';
import * as ExpoSecureStore from 'expo-secure-store';

describe('secureStore utility (Cross-platform)', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockNativeStore)) {
      delete mockNativeStore[key];
    }
    vi.clearAllMocks();
  });

  describe('Non-browser / Mobile environment', () => {
    it('should delegate getItemAsync to ExpoSecureStore', async () => {
      mockNativeStore['token'] = 'test-val';
      const val = await SecureStoreModule.getItemAsync('token');
      expect(ExpoSecureStore.getItemAsync).toHaveBeenCalledWith('token');
      expect(val).toBe('test-val');
    });

    it('should delegate setItemAsync to ExpoSecureStore', async () => {
      await SecureStoreModule.setItemAsync('token', 'xyz');
      expect(ExpoSecureStore.setItemAsync).toHaveBeenCalledWith('token', 'xyz');
      expect(mockNativeStore['token']).toBe('xyz');
    });

    it('should delegate deleteItemAsync to ExpoSecureStore', async () => {
      mockNativeStore['token'] = 'xyz';
      await SecureStoreModule.deleteItemAsync('token');
      expect(ExpoSecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
      expect(mockNativeStore['token']).toBeUndefined();
    });

    it('should handle ExpoSecureStore exception gracefully without crashing', async () => {
      vi.mocked(ExpoSecureStore.getItemAsync).mockRejectedValueOnce(new Error('Native error'));
      const val = await SecureStoreModule.getItemAsync('token');
      expect(val).toBeNull();
    });

    it('should report isAvailableAsync correctly on mobile', async () => {
      const available = await SecureStoreModule.isAvailableAsync();
      expect(available).toBe(true);
      expect(ExpoSecureStore.isAvailableAsync).toHaveBeenCalled();
    });
  });

  describe('Web browser environment', () => {
    let mockLocalStorage: Record<string, string> = {};

    beforeEach(() => {
      mockLocalStorage = {};
      const fakeWindow = {
        document: {},
        localStorage: {
          getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
          setItem: vi.fn((key: string, value: string) => {
            mockLocalStorage[key] = value;
          }),
          removeItem: vi.fn((key: string) => {
            delete mockLocalStorage[key];
          }),
        },
      };
      (globalThis as any).window = fakeWindow;
    });

    afterEach(() => {
      delete (globalThis as any).window;
    });

    it('should save and retrieve item via window.localStorage in web environment', async () => {
      expect(SecureStoreModule.isWebEnvironment()).toBe(true);

      await SecureStoreModule.setItemAsync('webKey', 'webValue');
      expect((globalThis as any).window.localStorage.setItem).toHaveBeenCalledWith('webKey', 'webValue');
      expect(mockLocalStorage['webKey']).toBe('webValue');

      const retrieved = await SecureStoreModule.getItemAsync('webKey');
      expect(retrieved).toBe('webValue');

      await SecureStoreModule.deleteItemAsync('webKey');
      expect(mockLocalStorage['webKey']).toBeUndefined();
      expect(await SecureStoreModule.getItemAsync('webKey')).toBeNull();
    });

    it('should fallback to memoryStorage if localStorage throws error on web', async () => {
      (globalThis as any).window.localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });
      (globalThis as any).window.localStorage.getItem = vi.fn(() => {
        throw new Error('SecurityError');
      });

      await SecureStoreModule.setItemAsync('fallbackKey', 'fallbackVal');
      const retrieved = await SecureStoreModule.getItemAsync('fallbackKey');
      expect(retrieved).toBe('fallbackVal');

      await SecureStoreModule.deleteItemAsync('fallbackKey');
      expect(await SecureStoreModule.getItemAsync('fallbackKey')).toBeNull();
    });

    it('should report isAvailableAsync as true when window.localStorage exists', async () => {
      const available = await SecureStoreModule.isAvailableAsync();
      expect(available).toBe(true);
    });
  });
});
