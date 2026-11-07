import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

/**
 * Base API URL configured from environment variable or defaulting to localhost NestJS backend.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// Cookie / Storage Keys
export const ACCESS_TOKEN_KEY = "glowup_access_token";
export const REFRESH_TOKEN_KEY = "glowup_refresh_token";

/**
 * Token Storage Helpers (Supports both Cookies and localStorage)
 */
export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return Cookies.get(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY) || null;
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return Cookies.get(REFRESH_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY) || null;
  },

  setTokens(accessToken: string, refreshToken?: string): void {
    if (typeof window === "undefined") return;
    
    // Save access token (expires in 7 days as cookie fallback)
    Cookies.set(ACCESS_TOKEN_KEY, accessToken, { expires: 7, sameSite: "Lax", secure: false });
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    if (refreshToken) {
      Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { expires: 30, sameSite: "Lax", secure: false });
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  clearTokens(): void {
    if (typeof window === "undefined") return;
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

/**
 * Create Core Axios Instance
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Refresh token concurrency management
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Request Interceptor: Attach JWT Bearer Token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor: Handle 401 & Refresh Token Flow
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if error is 401 Unauthorized and not already retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't loop refresh if the failed request was login, register, or refresh-token itself
      const requestUrl = originalRequest.url || "";
      if (
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/register") ||
        requestUrl.includes("/auth/refresh-token")
      ) {
        return Promise.reject(formatApiError(error));
      }

      if (isRefreshing) {
        // Another request is already refreshing token; enqueue this one
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        // No refresh token available, redirect to login
        isRefreshing = false;
        tokenStorage.clearTokens();
        redirectToLogin();
        return Promise.reject(new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."));
      }

      try {
        // Call refresh endpoint with raw axios to avoid interceptor recursion
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const newAccessToken =
          refreshResponse.data?.data?.accessToken ||
          refreshResponse.data?.accessToken;
        const newRefreshToken =
          refreshResponse.data?.data?.refreshToken ||
          refreshResponse.data?.refreshToken ||
          refreshToken;

        if (newAccessToken) {
          tokenStorage.setTokens(newAccessToken, newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error("Không thể làm mới token.");
        }
      } catch (refreshErr) {
        processQueue(refreshErr as Error, null);
        tokenStorage.clearTokens();
        redirectToLogin();
        return Promise.reject(new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(formatApiError(error));
  }
);

/**
 * Format NestJS Class-Validator / Exception error into user-friendly message
 */
export function formatApiError(error: AxiosError): Error {
  const data = error.response?.data as { message?: string | string[]; error?: string; statusCode?: number } | undefined;
  
  if (data?.message) {
    if (Array.isArray(data.message)) {
      // NestJS ValidationPipe array of errors
      return new Error(data.message.join(", "));
    }
    return new Error(data.message);
  }

  if (error.message === "Network Error") {
    return new Error("Không thể kết nối đến máy chủ Backend (Network Error). Hãy đảm bảo Backend NestJS đang hoạt động tại " + API_BASE_URL);
  }

  return new Error(error.message || `Lỗi yêu cầu (HTTP ${error.response?.status || "Unknown"})`);
}

/**
 * Redirect user to login page when auth token fails
 */
function redirectToLogin() {
  if (typeof window !== "undefined") {
    // Only redirect if not already on the login or register page
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith("/login") && !currentPath.startsWith("/register")) {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }
}

export default apiClient;
