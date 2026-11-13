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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const res = await cartApi.getCart();
      const cartData = res?.data?.data || res?.data || res;
      if (Array.isArray(cartData?.items)) {
        const mappedItems: CartItem[] = cartData.items.map((ci: any) => ({
          id: ci.id || ci.productVariantId,
          variantId: ci.productVariantId || ci.variantId || '',
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
      // Giữ nguyên items hiện tại nếu mất kết nối
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (newItem, quantity = 1) => {
    // 1. Optimistic Update để UI phản hồi tức thì
    const currentItems = [...get().items];
    const existingIndex = currentItems.findIndex(
      (i) => i.id === newItem.id || i.variantId === newItem.variantId
    );
    if (existingIndex > -1) {
      currentItems[existingIndex].quantity += quantity;
    } else {
      currentItems.push({
        ...newItem,
        quantity,
        selected: true,
      });
    }
    set({ items: currentItems });

    // 2. Đồng bộ API nếu có variantId chuẩn UUID
    if (UUID_REGEX.test(newItem.variantId)) {
      try {
        await cartApi.addToCart(newItem.variantId, quantity);
        await get().fetchCart();
      } catch {
        // Backend offline -> giữ optimistic update
      }
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

    // Optimistic Update
    set({
      items: get().items.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)),
    });

    try {
      await cartApi.updateItem(id, { quantity: newQty });
    } catch {
      // Offline fallback
    }
  },

  removeItem: async (id) => {
    // Optimistic Update
    set({
      items: get().items.filter((i) => i.id !== id),
    });

    try {
      await cartApi.removeItem(id);
    } catch {
      // Offline fallback
    }
  },

  toggleSelect: async (id) => {
    const target = get().items.find((i) => i.id === id);
    if (!target) return;
    const nextSelected = !target.selected;

    // Optimistic Update
    set({
      items: get().items.map((i) => (i.id === id ? { ...i, selected: nextSelected } : i)),
    });

    try {
      await cartApi.updateItem(id, { isSelected: nextSelected });
    } catch {
      // Offline fallback
    }
  },

  toggleSelectAll: async () => {
    const allSelected = get().items.every((i) => i.selected);
    const nextVal = !allSelected;

    // Optimistic Update
    set({
      items: get().items.map((i) => ({ ...i, selected: nextVal })),
    });

    try {
      await Promise.all(
        get().items.map((item) => cartApi.updateItem(item.id, { isSelected: nextVal })),
      );
    } catch {
      // Offline fallback
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
