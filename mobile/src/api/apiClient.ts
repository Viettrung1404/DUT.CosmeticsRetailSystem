import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from '../utils/secureStore';

declare const process: any;

// Cấu hình URL backend động:
// 1. Ưu tiên biến môi trường EXPO_PUBLIC_API_URL
// 2. Nếu chạy trên Web (browser): tự động sử dụng hostname của trình duyệt (localhost hoặc LAN IP)
// 3. Nếu chạy trên Mobile thật (Expo Go) / Emulator: sử dụng IP LAN máy tính
export const getBaseUrl = (): string => {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Tự động nhận diện khi chạy trên Web
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    return `http://${hostname}:3000/api/v1`;
  }

  // Mặc định IP mạng LAN cho thiết bị di động (cùng mạng Wi-Fi với máy tính)
  return 'http://192.168.110.249:3000/api/v1';
};

export const BASE_URL = getBaseUrl();

// Hàm sinh UUID v4 chuẩn RFC 4122
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Lấy hoặc sinh mới UUID cho phiên giỏ hàng khách vãng lai (Guest Cart)
export const getGuestSessionId = async (): Promise<string> => {
  try {
    let sessionId = await SecureStore.getItemAsync('guestSessionId');
    if (!sessionId) {
      sessionId = generateUUID();
      await SecureStore.setItemAsync('guestSessionId', sessionId);
    }
    return sessionId;
  } catch {
    return generateUUID();
  }
};

// Cấu hình Interceptor tách biệt để tiện kiểm thử TDD
export const setupAxiosInterceptors = {
  request: async (config: any) => {
    config.headers = config.headers || {};
    try {
      const userToken = await SecureStore.getItemAsync('userToken');
      if (userToken) {
        config.headers.Authorization = `Bearer ${userToken}`;
      } else {
        const guestId = await getGuestSessionId();
        if (guestId) {
          config.headers['X-Session-Id'] = guestId;
        }
      }
    } catch {
      // Bỏ qua lỗi SecureStore khi test
    }
    return config;
  },

  responseSuccess: (response: any) => {
    return response;
  },

  responseError: async (error: any) => {
    const originalRequest = error.config;
    // Tự động Refresh Token nếu gặp HTTP 401 và chưa từng thử lại
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('userRefreshToken');
        if (refreshToken) {
          const res = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
          const payload = res.data?.data || res.data || {};
          const newAccessToken = payload.accessToken || payload.access_token;
          const newRefreshToken = payload.refreshToken || payload.refresh_token;

          if (newAccessToken) {
            await SecureStore.setItemAsync('userToken', newAccessToken);
            if (newRefreshToken) {
              await SecureStore.setItemAsync('userRefreshToken', newRefreshToken);
            }
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          }
        }
      } catch (refreshErr) {
        // Refresh token hết hạn -> xóa session
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userRefreshToken');
      }
    }
    return Promise.reject(error);
  },
};

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(setupAxiosInterceptors.request as any);
apiClient.interceptors.response.use(
  setupAxiosInterceptors.responseSuccess,
  setupAxiosInterceptors.responseError
);

export default apiClient;
