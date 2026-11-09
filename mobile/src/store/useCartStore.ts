import { create } from 'zustand';
import { cartApi } from '../api/cartApi';

export interface CartItem {
  id: string; // cart_item_id hoặc product_variant_id
  variantId: string;
  productId: string;
  productName: string;
  variantName: string; // VD: "50ml", "Tone 21 Neutral"
  price: number;
  originalPrice?: number;
  quantity: number;
  imageUrl: string;
  stock: number;
  selected: boolean;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (item: Omit<CartItem, 'quantity' | 'selected'>, quantity?: number) => Promise<void>;
  updateQuantity: (id: string, delta: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleSelect: (id: string) => Promise<void>;
  toggleSelectAll: () => Promise<void>;
  clearCart: () => void;
  
  // Getters
  getTotalPrice: () => number;
  getTotalItemsCount: () => number;
  getSelectedCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const res = await cartApi.getCart();
      const cartData = res?.data || res;
      if (Array.isArray(cartData?.items)) {
        const mappedItems: CartItem[] = cartData.items.map((ci: any) => ({
          id: ci.id || ci.productVariantId,
          variantId: ci.productVariantId || ci.variantId || ci.id,
          productId: ci.productId || '',
          productName: ci.productName || 'Sản phẩm mỹ phẩm',
          variantName: ci.variantName || 'Mặc định',
          price: ci.currentPrice ?? ci.unitPrice ?? 0,
          originalPrice: ci.unitPrice,
          quantity: ci.quantity || 1,
          imageUrl:
            ci.thumbnailUrl ||
            'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
          stock: ci.availableStock ?? 99,
          selected: ci.isSelected ?? true,
        }));
        set({ items: mappedItems });
      }
    } catch {
      // Khi chưa đăng nhập hoặc offline, giữ state items hiện thời
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (newItem, quantity = 1) => {
    // 1. Cập nhật lạc quan (Optimistic update)
    const existingIndex = get().items.findIndex((i) => i.variantId === newItem.variantId);
    if (existingIndex > -1) {
      const updated = [...get().items];
      updated[existingIndex].quantity += quantity;
      set({ items: updated });
    } else {
      set({
        items: [
          ...get().items,
          { ...newItem, quantity, selected: true },
        ],
      });
    }

    // 2. Đồng bộ lên server nếu variantId là UUID
    try {
      if (newItem.variantId) {
        await cartApi.addToCart(newItem.variantId, quantity);
        await get().fetchCart();
      }
    } catch {
      // Bỏ qua lỗi mạng, dữ liệu vẫn được lưu lạc quan ở máy
    }
  },

  updateQuantity: async (id, delta) => {
    const targetItem = get().items.find((i) => i.id === id);
    if (!targetItem) return;

    const newQty = targetItem.quantity + delta;
    if (newQty < 1) {
      await get().removeItem(id);
      return;
    }
    if (newQty > targetItem.stock) return;

    // Optimistic update
    set({
      items: get().items.map((item) =>
        item.id === id ? { ...item, quantity: newQty } : item
      ),
    });

    try {
      await cartApi.updateItem(id, { quantity: newQty });
    } catch {
      // Giữ cập nhật cục bộ
    }
  },

  removeItem: async (id) => {
    // Optimistic remove
    set({
      items: get().items.filter((item) => item.id !== id),
    });

    try {
      await cartApi.removeItem(id);
    } catch {
      // Giữ trạng thái xóa cục bộ
    }
  },

  toggleSelect: async (id) => {
    const target = get().items.find((i) => i.id === id);
    if (!target) return;
    const nextSelected = !target.selected;

    set({
      items: get().items.map((item) =>
        item.id === id ? { ...item, selected: nextSelected } : item
      ),
    });

    try {
      await cartApi.updateItem(id, { isSelected: nextSelected });
    } catch {
      // ignore
    }
  },

  toggleSelectAll: async () => {
    const allSelected = get().items.every((i) => i.selected);
    const nextVal = !allSelected;

    set({
      items: get().items.map((i) => ({ ...i, selected: nextVal })),
    });

    // Cập nhật từng item lên backend nếu cần
    for (const item of get().items) {
      cartApi.updateItem(item.id, { isSelected: nextVal }).catch(() => {});
    }
  },

  clearCart: () => set({ items: [] }),

  getTotalPrice: () => {
    return get()
      .items.filter((i) => i.selected)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getTotalItemsCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getSelectedCount: () => {
    return get().items.filter((i) => i.selected).length;
  },
}));
