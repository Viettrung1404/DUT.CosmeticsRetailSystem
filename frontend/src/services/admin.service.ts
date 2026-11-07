import { apiClient } from "./api-client";
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  ProductVariant,
  AdminProductQueryDto,
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryTreeItem,
  Brand,
  CreateBrandDto,
  UpdateBrandDto,
  UploadImageResponse,
} from "@/types/api";

export const adminService = {
  // ==========================================================================
  // 1. PRODUCTS MANAGEMENT
  // ==========================================================================
  products: {
    /**
     * GET /admin/products
     * List all products for management dashboard with search, category, brand, active status filters
     */
    async getAll(query: AdminProductQueryDto = {}): Promise<PaginatedResponse<Product>> {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          params.append(key, String(val));
        }
      });
      const res = await apiClient.get<PaginatedResponse<Product>>(
        `/admin/products?${params.toString()}`
      );
      return res.data;
    },

    /**
     * GET /admin/products/{id}
     * Get single product details by ID for editing
     */
    async getById(id: string): Promise<ApiResponse<Product>> {
      const res = await apiClient.get<ApiResponse<Product>>(`/admin/products/${encodeURIComponent(id)}`);
      return res.data;
    },

    /**
     * POST /admin/products
     * Create a new product with initial variants and images
     */
    async create(data: CreateProductDto): Promise<ApiResponse<Product>> {
      const res = await apiClient.post<ApiResponse<Product>>("/admin/products", data);
      return res.data;
    },

    /**
     * PATCH /admin/products/{id}
     * Update an existing product
     */
    async update(id: string, data: UpdateProductDto): Promise<ApiResponse<Product>> {
      const res = await apiClient.patch<ApiResponse<Product>>(
        `/admin/products/${encodeURIComponent(id)}`,
        data
      );
      return res.data;
    },

    /**
     * DELETE /admin/products/{id}
     * Soft-delete or remove product by ID
     */
    async delete(id: string): Promise<ApiResponse<{ message?: string }>> {
      const res = await apiClient.delete<ApiResponse<{ message?: string }>>(
        `/admin/products/${encodeURIComponent(id)}`
      );
      return res.data;
    },
  },

  // ==========================================================================
  // 2. PRODUCT VARIANTS MANAGEMENT
  // ==========================================================================
  variants: {
    /**
     * GET /admin/products/{productId}/variants
     * Get all variants belonging to a specific product
     */
    async getByProductId(productId: string): Promise<ApiResponse<ProductVariant[]>> {
      const res = await apiClient.get<ApiResponse<ProductVariant[]>>(
        `/admin/products/${encodeURIComponent(productId)}/variants`
      );
      return res.data;
    },

    /**
     * POST /admin/products/{productId}/variants
     * Add a new variant to a product
     */
    async create(productId: string, data: CreateVariantDto): Promise<ApiResponse<ProductVariant>> {
      const res = await apiClient.post<ApiResponse<ProductVariant>>(
        `/admin/products/${encodeURIComponent(productId)}/variants`,
        data
      );
      return res.data;
    },

    /**
     * PATCH /admin/variants/{id}
     * Update a specific variant (price, stock quantity, active status)
     */
    async update(id: string, data: UpdateVariantDto): Promise<ApiResponse<ProductVariant>> {
      const res = await apiClient.patch<ApiResponse<ProductVariant>>(
        `/admin/variants/${encodeURIComponent(id)}`,
        data
      );
      return res.data;
    },

    /**
     * DELETE /admin/variants/{id}
     * Delete a variant by ID
     */
    async delete(id: string): Promise<ApiResponse<{ message?: string }>> {
      const res = await apiClient.delete<ApiResponse<{ message?: string }>>(
        `/admin/variants/${encodeURIComponent(id)}`
      );
      return res.data;
    },
  },

  // ==========================================================================
  // 3. CATEGORIES MANAGEMENT
  // ==========================================================================
  categories: {
    /**
     * GET /admin/categories
     * List categories with optional parentId, search, and active status filters
     */
    async getAll(query: { page?: number; limit?: number; search?: string; isActive?: boolean; parentId?: string } = {}): Promise<PaginatedResponse<Category>> {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          params.append(key, String(val));
        }
      });
      const res = await apiClient.get<PaginatedResponse<Category>>(
        `/admin/categories?${params.toString()}`
      );
      return res.data;
    },

    /**
     * GET /admin/categories/tree
     * Get hierarchical category tree for admin selector
     */
    async getTree(): Promise<ApiResponse<CategoryTreeItem[]>> {
      const res = await apiClient.get<ApiResponse<CategoryTreeItem[]>>("/admin/categories/tree");
      return res.data;
    },

    /**
     * GET /admin/categories/{id}
     * Get category by ID
     */
    async getById(id: string): Promise<ApiResponse<Category>> {
      const res = await apiClient.get<ApiResponse<Category>>(
        `/admin/categories/${encodeURIComponent(id)}`
      );
      return res.data;
    },

    /**
     * POST /admin/categories
     * Create a new category
     */
    async create(data: CreateCategoryDto): Promise<ApiResponse<Category>> {
      const res = await apiClient.post<ApiResponse<Category>>("/admin/categories", data);
      return res.data;
    },

    /**
     * PATCH /admin/categories/{id}
     * Update category
     */
    async update(id: string, data: UpdateCategoryDto): Promise<ApiResponse<Category>> {
      const res = await apiClient.patch<ApiResponse<Category>>(
        `/admin/categories/${encodeURIComponent(id)}`,
        data
      );
      return res.data;
    },

    /**
     * DELETE /admin/categories/{id}
     * Delete category
     */
    async delete(id: string): Promise<ApiResponse<{ message?: string }>> {
      const res = await apiClient.delete<ApiResponse<{ message?: string }>>(
        `/admin/categories/${encodeURIComponent(id)}`
      );
      return res.data;
    },
  },

  // ==========================================================================
  // 4. BRANDS MANAGEMENT
  // ==========================================================================
  brands: {
    /**
     * GET /admin/brands
     * List brands with pagination, search, active filter
     */
    async getAll(query: { page?: number; limit?: number; search?: string; isActive?: boolean } = {}): Promise<PaginatedResponse<Brand>> {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          params.append(key, String(val));
        }
      });
      const res = await apiClient.get<PaginatedResponse<Brand>>(
        `/admin/brands?${params.toString()}`
      );
      return res.data;
    },

    /**
     * GET /admin/brands/{id}
     * Get brand by ID
     */
    async getById(id: string): Promise<ApiResponse<Brand>> {
      const res = await apiClient.get<ApiResponse<Brand>>(
        `/admin/brands/${encodeURIComponent(id)}`
      );
      return res.data;
    },

    /**
     * POST /admin/brands
     * Create brand
     */
    async create(data: CreateBrandDto): Promise<ApiResponse<Brand>> {
      const res = await apiClient.post<ApiResponse<Brand>>("/admin/brands", data);
      return res.data;
    },

    /**
     * PATCH /admin/brands/{id}
     * Update brand
     */
    async update(id: string, data: UpdateBrandDto): Promise<ApiResponse<Brand>> {
      const res = await apiClient.patch<ApiResponse<Brand>>(
        `/admin/brands/${encodeURIComponent(id)}`,
        data
      );
      return res.data;
    },

    /**
     * DELETE /admin/brands/{id}
     * Delete brand
     */
    async delete(id: string): Promise<ApiResponse<{ message?: string }>> {
      const res = await apiClient.delete<ApiResponse<{ message?: string }>>(
        `/admin/brands/${encodeURIComponent(id)}`
      );
      return res.data;
    },
  },

  // ==========================================================================
  // 5. FILE / IMAGE UPLOADS
  // ==========================================================================
  uploads: {
    /**
     * POST /admin/uploads/images
     * Upload an image file (multipart/form-data)
     */
    async uploadImage(file: File, folder: "products" | "brands" | "categories" = "products"): Promise<ApiResponse<UploadImageResponse>> {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await apiClient.post<ApiResponse<UploadImageResponse>>(
        "/admin/uploads/images",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return res.data;
    },
  },
};

export default adminService;
