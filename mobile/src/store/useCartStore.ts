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
      } else {
        throw new Error('Dữ liệu giỏ hàng từ máy chủ không hợp lệ.');
      }
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (newItem, quantity = 1) => {
    if (!UUID_REGEX.test(newItem.variantId)) {
      throw new Error('Biến thể sản phẩm không hợp lệ. Vui lòng chọn sản phẩm từ danh mục.');
    }

    await cartApi.addToCart(newItem.variantId, quantity);
    await get().fetchCart();
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

    await cartApi.updateItem(id, { quantity: newQty });
    await get().fetchCart();
  },

  removeItem: async (id) => {
    await cartApi.removeItem(id);
    await get().fetchCart();
  },

  toggleSelect: async (id) => {
    const target = get().items.find((i) => i.id === id);
    if (!target) return;
    const nextSelected = !target.selected;

    await cartApi.updateItem(id, { isSelected: nextSelected });
    await get().fetchCart();
  },

  toggleSelectAll: async () => {
    const allSelected = get().items.every((i) => i.selected);
    const nextVal = !allSelected;

    await Promise.all(
      get().items.map((item) => cartApi.updateItem(item.id, { isSelected: nextVal })),
    );
    await get().fetchCart();
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
