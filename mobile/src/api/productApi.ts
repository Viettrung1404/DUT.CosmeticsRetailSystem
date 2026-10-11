import apiClient from './apiClient';

export const productApi = {
  // 1. Lấy danh sách sản phẩm (có lọc theo danh mục, phân trang)
  getProducts: async (params?: { page?: number; limit?: number; categoryId?: string; search?: string }) => {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  // 2. Lấy chi tiết sản phẩm theo slug hoặc ID
  getProductDetail: async (slug: string) => {
    const response = await apiClient.get(`/products/${slug}`);
    return response.data;
  },

  // 3. Tìm kiếm sản phẩm
  searchProducts: async (query: string) => {
    const response = await apiClient.get('/products/search', { params: { q: query } });
    return response.data;
  },

  // 4. Lấy cây danh mục sản phẩm (Skincare, Son môi, Chống nắng...)
  getCategories: async () => {
    const response = await apiClient.get('/categories/tree');
    return response.data;
  },
};