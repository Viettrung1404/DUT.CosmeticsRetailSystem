import { create } from 'zustand';
import { Product } from '@/types/domain';

export interface PosItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  qty: number;
}

interface PosState {
  items: PosItem[];
  addItem: (product: Product, qty?: number) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearPosCart: () => void;
  getSubtotal: () => number;
}

export const usePosStore = create<PosState>((set, get) => ({
  items: [],
  
  addItem: (product, qty = 1) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.productId === product.id);
      
      if (existingItem) {
        return {
          items: state.items.map((item) => 
            item.productId === product.id 
              ? { ...item, qty: item.qty + qty }
              : item
          )
        };
      }

      const newItem: PosItem = {
        id: `pos-${Date.now()}`,
        productId: product.id,
        name: product.name,
        image: product.gallery && product.gallery.length > 0 ? product.gallery[0] : '',
        price: product.price,
        qty: qty,
      };

      return { items: [...state.items, newItem] };
    });
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id)
    }));
  },

  updateQty: (id, qty) => {
    set((state) => ({
      items: state.items.map((item) => 
        item.id === id ? { ...item, qty: Math.max(1, qty) } : item
      )
    }));
  },

  clearPosCart: () => set({ items: [] }),

  getSubtotal: () => {
    return get().items.reduce((total, item) => total + item.price * item.qty, 0);
  },
}));
