import { describe, it, expect, beforeEach, vi } from 'vitest';

const secureStoreMock: Record<string, string> = {};
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => secureStoreMock[key] || null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    secureStoreMock[key] = value;
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    delete secureStoreMock[key];
  }),
}));

import { getGuestSessionId, setupAxiosInterceptors, getBaseUrl } from '@/api/apiClient';

describe('apiClient & Guest Session (TDD)', () => {
  beforeEach(() => {
    for (const key of Object.keys(secureStoreMock)) {
      delete secureStoreMock[key];
    }
    vi.clearAllMocks();
  });

  it('1. getGuestSessionId should generate a new UUID and save to SecureStore if not exists', async () => {
    const sessionId = await getGuestSessionId();
    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
    // UUID v4 format regex
    expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(secureStoreMock['guestSessionId']).toBe(sessionId);
  });

  it('2. getGuestSessionId should return existing UUID if already saved in SecureStore', async () => {
    const existingId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
    secureStoreMock['guestSessionId'] = existingId;

    const sessionId = await getGuestSessionId();
    expect(sessionId).toBe(existingId);
  });

  it('3. interceptor should attach Authorization header when userToken exists', async () => {
    secureStoreMock['userToken'] = 'my-jwt-access-token';
    const config: any = { headers: {} };

    const interceptor = setupAxiosInterceptors.request;
    const modifiedConfig = await interceptor(config);

    expect(modifiedConfig.headers['Authorization']).toBe('Bearer my-jwt-access-token');
    expect(modifiedConfig.headers['X-Session-Id']).toBeUndefined();
  });

  it('4. interceptor should attach X-Session-Id header when user is Guest (no userToken)', async () => {
    const config: any = { headers: {} };

    const interceptor = setupAxiosInterceptors.request;
    const modifiedConfig = await interceptor(config);

    expect(modifiedConfig.headers['Authorization']).toBeUndefined();
    expect(modifiedConfig.headers['X-Session-Id']).toBeDefined();
    expect(modifiedConfig.headers['X-Session-Id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('5. getBaseUrl should dynamically resolve window.location in web browser', () => {
    (globalThis as any).window = {
      location: { hostname: 'localhost' },
    };
    expect(getBaseUrl()).toBe('http://localhost:3000/api/v1');

    (globalThis as any).window.location.hostname = '192.168.110.249';
    expect(getBaseUrl()).toBe('http://192.168.110.249:3000/api/v1');

    delete (globalThis as any).window;
  });
});

