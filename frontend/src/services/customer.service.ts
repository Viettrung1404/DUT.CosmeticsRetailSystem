import { apiClient } from "./api-client";
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  ProductQueryDto,
  ProductSuggestion,
  CategoryTreeItem,
} from "@/types/api";

export const customerService = {
  /**
   * GET /customer/products
   * Retrieve paginated product catalog with filters (category, brand, price, sorting)
   */
  async getProducts(query: ProductQueryDto = {}): Promise<PaginatedResponse<Product>> {
    // If a search keyword is provided, delegate to the dedicated search endpoint
    if (query.search?.trim()) {
      return this.searchProducts(query.search.trim(), query.page || 1, query.limit || 20);
    }

    const params = new URLSearchParams();
    const { search, sortOrder, sortBy, ...allowedQuery } = query;

    // Map frontend sortBy / sortOrder to backend enum: price_asc, price_desc, newest, bestseller, rating
    let normalizedSortBy = sortBy;
    if (sortBy === "createdAt" || sortBy === "newest") {
      normalizedSortBy = "newest";
    } else if (sortBy === "basePrice") {
      normalizedSortBy = sortOrder === "asc" ? "price_asc" : "price_desc";
    } else if (sortBy === "avgRating" || sortBy === "rating") {
      normalizedSortBy = "rating";
    } else if (sortBy === "totalSold" || sortBy === "bestseller") {
      normalizedSortBy = "bestseller";
    }

    if (normalizedSortBy) {
      params.append("sortBy", normalizedSortBy);
    }

    Object.entries(allowedQuery).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });

    const res = await apiClient.get<PaginatedResponse<Product>>(
      `/customer/products?${params.toString()}`
    );
    return res.data;
  },

  /**
   * GET /customer/products/{slug}
   * Get detailed product information by its URL slug
   */
  async getProductBySlug(slug: string): Promise<ApiResponse<Product>> {
    const res = await apiClient.get<ApiResponse<Product>>(
      `/customer/products/${encodeURIComponent(slug)}`
    );
    return res.data;
  },

  /**
   * GET /customer/products/search
   * Search products by keyword with pagination
   */
  async searchProducts(q: string, page = 1, limit = 20): Promise<PaginatedResponse<Product>> {
    const res = await apiClient.get<PaginatedResponse<Product>>(
      `/customer/products/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`
    );
    return res.data;
  },

  /**
   * GET /customer/products/suggest
   * Instant search autocomplete suggestions for search bar dropdown
   */
  async suggestProducts(q: string, limit = 8): Promise<ApiResponse<ProductSuggestion[]>> {
    const res = await apiClient.get<ApiResponse<ProductSuggestion[]>>(
      `/customer/products/suggest?q=${encodeURIComponent(q)}&limit=${limit}`
    );
    return res.data;
  },

  /**
   * GET /customer/products/{id}/related
   * Get related products based on product ID / category
   */
  async getRelatedProducts(productId: string, limit = 4): Promise<ApiResponse<Product[]>> {
    const res = await apiClient.get<ApiResponse<Product[]>>(
      `/customer/products/${encodeURIComponent(productId)}/related?limit=${limit}`
    );
    return res.data;
  },

  /**
   * GET /categories/tree
   * Fetch hierarchical category tree for menus, navigation, and filters
   */
  async getCategoryTree(): Promise<ApiResponse<CategoryTreeItem[]>> {
    const res = await apiClient.get<ApiResponse<CategoryTreeItem[]>>("/categories/tree");
    return res.data;
  },
};

export default customerService;
