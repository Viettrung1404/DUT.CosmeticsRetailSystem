import apiClient from './apiClient';

export const cartApi = {
  // Lấy danh sách giỏ hàng
  getCart: async () => {
    const response = await apiClient.get('/cart');
    return response.data;
  },

  // Thêm sản phẩm/biến thể vào giỏ (FR-02.04)
  addToCart: async (productVariantId: string, quantity: number = 1) => {
    const response = await apiClient.post('/cart/items', {
      product_variant_id: productVariantId,
      quantity,
    });
    return response.data;
  },

  // Cập nhật số lượng món trong giỏ (FR-02.05)
  updateQuantity: async (itemId: string, quantity: number) => {
    const response = await apiClient.put(`/cart/items/${itemId}`, { quantity });
    return response.data;
  },

  // Xóa món khỏi giỏ
  removeItem: async (itemId: string) => {
    const response = await apiClient.delete(`/cart/items/${itemId}`);
    return response.data;
  },

  // Đồng bộ giỏ hàng vãng lai sau khi đăng nhập
  mergeCart: async (guestCartData: any) => {
    const response = await apiClient.post('/cart/merge', guestCartData);
    return response.data;
  },
};