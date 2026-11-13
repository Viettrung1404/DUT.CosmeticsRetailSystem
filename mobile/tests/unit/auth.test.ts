import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock expo-secure-store
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

// Mock apiClient
vi.mock('@/api/apiClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import apiClient from '@/api/apiClient';
import { useAuthStore } from '@/store/useAuthStore';
import * as SecureStore from 'expo-secure-store';

describe('useAuthStore (TDD)', () => {
  beforeEach(() => {
    // Reset state and mocks
    for (const key of Object.keys(secureStoreMock)) {
      delete secureStoreMock[key];
    }
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
    });
  });

  it('1. should have initial empty state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('2. setAuth should store accessToken and refreshToken to SecureStore', async () => {
    const testUser = { id: 'usr-1', email: 'test@glowup.vn', full_name: 'Lan Anh' };
    await useAuthStore.getState().setAuth(testUser, 'test-acc-token', 'test-ref-token');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(testUser);
    expect(state.token).toBe('test-acc-token');
    expect(state.refreshToken).toBe('test-ref-token');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('userToken', 'test-acc-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('userRefreshToken', 'test-ref-token');
  });

  it('3. login should call /auth/login and correctly map camelCase accessToken & refreshToken from backend', async () => {
    const mockApiResponse = {
      data: {
        statusCode: 200,
        success: true,
        data: {
          accessToken: 'jwt-access-token-123',
          refreshToken: 'jwt-refresh-token-456',
          user: {
            id: 'user-uuid-1',
            email: 'customer@glowup.vn',
            fullName: 'Nguyen Thi Huong',
          },
        },
      },
    };

    (apiClient.post as any).mockResolvedValueOnce(mockApiResponse);

    await useAuthStore.getState().login('customer@glowup.vn', 'Secret123@');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'customer@glowup.vn',
      password: 'Secret123@',
    });

    const state = useAuthStore.getState();
    expect(state.token).toBe('jwt-access-token-123');
    expect(state.refreshToken).toBe('jwt-refresh-token-456');
    expect(state.user?.email).toBe('customer@glowup.vn');
    expect(secureStoreMock['userToken']).toBe('jwt-access-token-123');
    expect(secureStoreMock['userRefreshToken']).toBe('jwt-refresh-token-456');
  });

  it('4. logout should delete tokens from SecureStore and reset user/token in state', async () => {
    // Pre-populate state
    secureStoreMock['userToken'] = 'token-to-delete';
    secureStoreMock['userRefreshToken'] = 'ref-to-delete';
    useAuthStore.setState({
      token: 'token-to-delete',
      refreshToken: 'ref-to-delete',
      user: { email: 'user@test.vn', full_name: 'Test' },
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('userToken');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('userRefreshToken');
  });
});

