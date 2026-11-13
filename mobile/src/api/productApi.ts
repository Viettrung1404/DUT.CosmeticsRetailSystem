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
    variants: item.variants || [],
    description: item.description || item.shortDescription || '',
  }));
};

// Bóc tách cây danh mục và làm phẳng danh mục con giống Web
export const extractCategoryTree = (
  res: any
): { root: NormalizedCategory[]; flat: NormalizedCategory[] } => {
  const rootData = res?.data || res;
  const rawCats: any[] = Array.isArray(rootData) ? rootData : [];

  const root: NormalizedCategory[] = rawCats.map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl,
    children: Array.isArray(c.children)
      ? c.children.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          slug: ch.slug,
          imageUrl: ch.imageUrl,
        }))
      : [],
  }));

  const flat: NormalizedCategory[] = [];
  root.forEach((parent) => {
    flat.push(parent);
    if (parent.children) {
      parent.children.forEach((child) => flat.push(child));
    }
  });

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
  searchProducts: async (query: string) => {
    const response = await apiClient.get('/customer/products/search', { params: { q: query } });
    return response.data;
  },

  // 4. Lấy cây danh mục sản phẩm (Skincare, Son môi, Chống nắng...)
  getCategories: async () => {
    const response = await apiClient.get('/categories/tree');
    return response.data;
  },
};
