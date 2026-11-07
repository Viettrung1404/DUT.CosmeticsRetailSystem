/**
 * Legacy API bridge for GlowUp Web
 * Re-exports from src/services for backward compatibility while using the centralized Axios client.
 */

export * from "@/services/api-client";
export * from "@/services/auth.service";
export * from "@/services/customer.service";
export * from "@/services/admin.service";
export * from "@/types/api";

import { apiClient, tokenStorage } from "@/services/api-client";
import { authService } from "@/services/auth.service";
import { customerService } from "@/services/customer.service";
import { adminService } from "@/services/admin.service";

// Backward-compatible token functions
export const getAccessToken = tokenStorage.getAccessToken;
export const getRefreshToken = tokenStorage.getRefreshToken;
export const saveTokens = tokenStorage.setTokens;
export const clearTokens = tokenStorage.clearTokens;

// Backward-compatible Auth API object
export const authApi = {
  login: (payload: { email: string; password: string }) => authService.login(payload),
  register: (payload: { email: string; password: string; fullName: string; phone?: string }) => authService.register(payload),
  logout: (refreshToken?: string) => authService.logout(refreshToken),
  verifyEmail: (token: string) => authService.verifyEmail({ token }),
  resendVerification: (email: string) => authService.resendVerification({ email }),
  forgotPassword: (email: string) => authService.forgotPassword({ email }),
  resetPassword: (payload: { token: string; newPassword: string }) => authService.resetPassword(payload),
  getMe: () => authService.getMe(),
  refreshToken: (refreshToken: string) => authService.refreshToken(refreshToken),
};

// Backward-compatible Categories API
export const categoriesApi = {
  getTree: () => customerService.getCategoryTree(),
};

// Backward-compatible Products API
export const productsApi = {
  getProducts: (query = {}) => customerService.getProducts(query),
  getProductDetail: (slug: string) => customerService.getProductBySlug(slug),
  suggestProducts: (q: string, limit = 8) => customerService.suggestProducts(q, limit),
  search: (q: string, page = 1, limit = 20) => customerService.searchProducts(q, page, limit),
  searchProducts: (q: string, limit = 5) => customerService.searchProducts(q, 1, limit),
  getRelated: (productId: string, limit = 4) => customerService.getRelatedProducts(productId, limit),
};

// Backward-compatible Admin API
export const adminApi = {
  uploadImage: (file: File, folder: "products" | "brands" | "categories" = "products") =>
    adminService.uploads.uploadImage(file, folder),
  products: adminService.products,
  categories: adminService.categories,
  brands: adminService.brands,
  variants: adminService.variants,
};

// Type aliases for legacy imports
export type LoginPayload = import("@/types/api").LoginDto;
export type RegisterPayload = import("@/types/api").RegisterDto;
export type AuthApiResponse = import("@/types/api").ApiResponse<import("@/types/api").AuthResponseData>;
export type RegisterApiResponse = import("@/types/api").ApiResponse<{ userId: string; email: string; fullName: string; message: string }>;
export type ApiProduct = import("@/types/api").Product;
export type ProductListQuery = import("@/types/api").ProductQueryDto;
export type AdminProductPayload = import("@/types/api").CreateProductDto;

export default {
  client: apiClient,
  token: tokenStorage,
  auth: authApi,
  products: productsApi,
  categories: categoriesApi,
  admin: adminApi,
};
