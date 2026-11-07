/**
 * Standard API Response Envelope from NestJS Backend
 */
export interface ApiResponse<T = unknown> {
  statusCode?: number;
  success?: boolean;
  message?: string;
  data: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface PaginatedData<T> {
  data: T[];
  total?: number;
  meta?: PaginationMeta;
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;

// ============================================================================
// 1. MODULE AUTH TYPES
// ============================================================================

export type UserRole = "ADMIN" | "STAFF" | "CUSTOMER" | string;

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
  roleName?: string;
  isVerified?: boolean;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface VerifyEmailDto {
  token: string;
}

export interface ResendVerificationDto {
  email: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

// ============================================================================
// 2. MODULE CUSTOMER (PRODUCTS & CATEGORIES)
// ============================================================================

export interface ProductQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "basePrice" | "createdAt" | "avgRating" | "totalSold" | string;
  sortOrder?: "asc" | "desc";
}

export interface ProductImage {
  id?: string;
  imageUrl: string;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  barcode?: string;
  option1Value?: string;
  option2Value?: string;
  option3Value?: string;
  price: number;
  costPrice?: number;
  stockQuantity: number;
  weight?: number;
  unit?: string;
  isActive?: boolean;
}

export interface ProductIngredient {
  id?: string;
  ingredientName: string;
  percentage?: string;
  isKeyIngredient?: boolean;
}

export interface Product {
  id: string;
  slug: string;
  sku?: string;
  name: string;
  description: string;
  shortDescription?: string;
  basePrice: number;
  salePrice?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  avgRating: number;
  totalReviews: number;
  totalSold?: number;
  brandId?: string;
  brandName?: string;
  categoryId?: string;
  categoryName?: string;
  primaryImage?: string;
  option1Name?: string;
  option2Name?: string;
  option3Name?: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
  ingredients?: Array<string | ProductIngredient>;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSuggestion {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  price: number;
}

export interface CategoryTreeItem {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  children: CategoryTreeItem[];
}

// ============================================================================
// 3. MODULE ADMIN (PRODUCTS, VARIANTS, CATEGORIES, BRANDS, UPLOADS)
// ============================================================================

export interface AdminProductQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateVariantDto {
  sku: string;
  barcode?: string;
  option1Value?: string;
  option2Value?: string;
  option3Value?: string;
  price: number;
  costPrice?: number;
  stockQuantity: number;
  weight?: number;
  unit?: string;
  isActive?: boolean;
}

export type UpdateVariantDto = Partial<CreateVariantDto>;

export interface CreateProductDto {
  categoryId: string;
  brandId?: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  shortDescription?: string;
  basePrice: number;
  salePrice?: number;
  option1Name?: string;
  option2Name?: string;
  option3Name?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  variants: CreateVariantDto[];
  images?: Array<{
    imageUrl: string;
    altText?: string;
    sortOrder?: number;
    isPrimary?: boolean;
  }>;
  tags?: string[];
  ingredients?: Array<{
    ingredientName: string;
    percentage?: string;
    isKeyIngredient?: boolean;
  }>;
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryDto {
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  countryOfOrigin?: string | null;
  websiteUrl?: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBrandDto {
  name: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  countryOfOrigin?: string;
  websiteUrl?: string;
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}

export type UpdateBrandDto = Partial<CreateBrandDto>;

export interface UploadImageResponse {
  url: string;
}
