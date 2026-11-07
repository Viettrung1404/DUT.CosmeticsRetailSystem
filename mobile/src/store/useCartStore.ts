import { create } from 'zustand';

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
  addItem: (item: Omit<CartItem, 'quantity' | 'selected'>, quantity?: number) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  clearCart: () => void;
  
  // Getters
  getTotalPrice: () => number;
  getTotalItemsCount: () => number;
  getSelectedCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [
    {
      id: 'item-1',
      variantId: 'var-101',
      productId: 'prod-1',
      productName: 'Tinh Chất Dưỡng Ẩm Serum Hyaluronic Acid GlowUp',
      variantName: 'Chai 50ml',
      price: 450000,
      originalPrice: 550000,
      quantity: 1,
      imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
      stock: 15,
      selected: true,
    },
    {
      id: 'item-2',
      variantId: 'var-102',
      productId: 'prod-2',
      productName: 'Son Kem Lì Velvet Lip Tint Rose Berry',
      variantName: 'Màu 03 - Velvet Red',
      price: 280000,
      originalPrice: 320000,
      quantity: 2,
      imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
      stock: 8,
      selected: true,
    },
  ],
  isLoading: false,

  addItem: (newItem, quantity = 1) => {
    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.variantId === newItem.variantId);
      if (existingIndex > -1) {
        const updated = [...state.items];
        updated[existingIndex].quantity += quantity;
        return { items: updated };
      }
      return {
        items: [
          ...state.items,
          { ...newItem, quantity, selected: true },
        ],
      };
    });
  },

  updateQuantity: (id, delta) => {
    set((state) => ({
      items: state.items
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty < 1) return null; // Nếu nhỏ hơn 1 thì xóa
            if (newQty > item.stock) return item; // Không vượt quá tồn kho
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    }));
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },

  toggleSelect: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      ),
    }));
  },

  toggleSelectAll: () => {
    set((state) => {
      const allSelected = state.items.every((i) => i.selected);
      return {
        items: state.items.map((i) => ({ ...i, selected: !allSelected })),
      };
    });
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