import apiClient from './apiClient';

export interface NormalizedProduct {
  id: string;
  name: string;
  slug: string;
  brand: string;
  categoryName?: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  rating: number;
  reviewsCount: number;
  totalSold?: number;
  variants?: any[];
  description?: string;
}

export interface NormalizedCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  icon?: string;
  children?: NormalizedCategory[];
}

// Bóc tách mảng sản phẩm chuẩn xác từ NestJS envelope { statusCode, success, data: { data: [], meta: {} } }
export const extractProductList = (res: any): NormalizedProduct[] => {
  const root = res?.data || res;
  const rawList = Array.isArray(root?.data)
    ? root.data
    : Array.isArray(root?.items)
    ? root.items
    : Array.isArray(root?.products)
    ? root.products
    : Array.isArray(root)
    ? root
    : [];

  return rawList.map((item: any) => ({
    id: item.id || item._id || '',
    name: item.name || 'Sản phẩm mỹ phẩm GlowUp',
    slug: item.slug || item.id || '',
    brand: item.brandName || item.brand || 'GLOWUP LAB',
    categoryName: item.categoryName || item.category || '',
    price: item.effectivePrice ?? item.salePrice ?? item.basePrice ?? item.price ?? 0,
    originalPrice: item.basePrice ?? item.originalPrice ?? item.price,
    imageUrl:
      item.primaryImage ||
      item.imageUrl ||
      item.image_url ||
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
    rating: item.avgRating ?? item.rating ?? 5.0,
    reviewsCount: item.totalReviews ?? item.reviewsCount ?? item.reviews_count ?? 0,
    totalSold: item.totalSold ?? 0,
    variants: item.variants || [],
    description: item.description || item.shortDescription || '',
  }));
};

// Bóc tách cây danh mục và làm phẳng danh mục con giống Web
export const extractCategoryTree = (
  res: any
): { root: NormalizedCategory[]; flat: NormalizedCategory[] } => {
  const rootData = res?.data?.data || res?.data || res;
  const rawCats: any[] = Array.isArray(rootData) ? rootData : [];

  const mapCategory = (c: any): NormalizedCategory => ({
    id: c.id || c._id || '',
    name: c.name || '',
    slug: c.slug || '',
    imageUrl: c.imageUrl || c.image_url,
    icon: c.icon,
    children: Array.isArray(c.children) ? c.children.map(mapCategory) : [],
  });

  const root: NormalizedCategory[] = rawCats.map(mapCategory);

  const flat: NormalizedCategory[] = [];
  const collectFlat = (cat: NormalizedCategory) => {
    flat.push(cat);
    if (cat.children && cat.children.length > 0) {
      cat.children.forEach(collectFlat);
    }
  };
  root.forEach(collectFlat);

  return { root, flat };
};

export const productApi = {
  // 1. Lấy danh sách sản phẩm (có lọc theo danh mục, phân trang)
  getProducts: async (params?: { page?: number; limit?: number; categoryId?: string; search?: string; sortBy?: string }) => {
    const response = await apiClient.get('/customer/products', { params });
    return response.data;
  },

  // 2. Lấy chi tiết sản phẩm theo slug hoặc ID
  getProductDetail: async (slug: string) => {
    const response = await apiClient.get(`/customer/products/${slug}`);
    return response.data;
  },

  // 3. Tìm kiếm sản phẩm
  searchProducts: async (
    queryOrParams:
      | string
      | {
          q: string;
          page?: number;
          limit?: number;
          categoryId?: string;
          brandId?: string;
          brandIds?: string[];
          minPrice?: number;
          maxPrice?: number;
          rating?: number;
          sortBy?: string;
        }
  ) => {
    const params = typeof queryOrParams === 'string' ? { q: queryOrParams } : queryOrParams;
    const response = await apiClient.get('/customer/products/search', { params });
    return response.data;
  },

  // 3.1. Gợi ý tìm kiếm nhanh (autocomplete hints)
  getSearchHints: async (query: string) => {
    const response = await apiClient.get('/customer/products/search-hints', { params: { q: query } });
    return response.data;
  },

  // 3.2. Lịch sử tìm kiếm & xu hướng tìm kiếm
  getSearchHistory: async () => {
    const response = await apiClient.get('/customer/products/search-history');
    return response.data;
  },

  // 3.3. Ghi nhận lịch sử tìm kiếm
  recordSearchHistory: async (query: string, resultsCount?: number) => {
    const response = await apiClient.post('/customer/products/search-history', { query, resultsCount });
    return response.data;
  },

  // 3.4. Xóa lịch sử tìm kiếm
  deleteSearchHistory: async (params?: { query?: string; id?: string }) => {
    const response = await apiClient.delete('/customer/products/search-history', { params });
    return response.data;
  },

  // 3.5. Lấy danh sách facets (brands, categories, tags)
  getFacets: async (categoryId?: string) => {
    const response = await apiClient.get('/customer/products/facets', { params: { categoryId } });
    return response.data;
  },

  // 4. Lấy cây danh mục sản phẩm (Skincare, Son môi, Chống nắng...)
  getCategories: async () => {
    const response = await apiClient.get('/categories/tree');
    return response.data;
  },

  // 5. Lấy danh sách Flash Sale cards
  getFlashSaleCards: async (limit: number = 5) => {
    const response = await apiClient.get('/promotions/flash-sale/cards', { params: { limit } });
    return response.data;
  },

  // 6. Lấy đánh giá sản phẩm
  getProductReviews: async (
    productId: string,
    params?: { page?: number; limit?: number; rating?: number; sort?: string }
  ) => {
    const response = await apiClient.get(`/customer/products/${productId}/reviews`, { params });
    return response.data;
  },
};
