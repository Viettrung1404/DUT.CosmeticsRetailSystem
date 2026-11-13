import { create } from 'zustand';
import apiClient from '../api/apiClient';

export interface WishlistItem {
  id: string;
  productId: string;
  slug?: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  category: 'Skincare' | 'Serum' | 'Sunscreens' | 'Lipstick' | 'Makeup' | string;
  rating: number;
  reviewsCount: number;
  badge?: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  addedDate?: string;
}

interface WishlistState {
  items: WishlistItem[];
  loading: boolean;
  fetchWishlist: () => Promise<void>;
  toggleWishlist: (item: Omit<WishlistItem, 'id'>) => Promise<boolean>;
  isInWishlist: (productId: string) => boolean;
  removeItem: (productId: string) => Promise<void>;
  clearWishlist: () => void;
  getWishlistCount: () => number;
}

/** Map 1 item từ Public ProductResponseDto (backend) sang WishlistItem local */
function mapApiItem(raw: any): WishlistItem {
  return {
    id: raw.id ?? raw.productId ?? String(Date.now()),
    productId: raw.productId ?? raw.id ?? '',
    slug: raw.slug ?? undefined,
    name: raw.name ?? raw.productName ?? '',
    brand: raw.brand ?? raw.brandName ?? '',
    price: raw.currentPrice ?? raw.price ?? 0,
    originalPrice: raw.basePrice ?? raw.originalPrice ?? undefined,
    imageUrl: raw.thumbnailUrl ?? raw.imageUrl ?? '',
    category: raw.categoryName ?? raw.category ?? 'Skincare',
    rating: raw.averageRating ?? raw.rating ?? 0,
    reviewsCount: raw.reviewCount ?? raw.reviewsCount ?? 0,
    badge: raw.badge ?? undefined,
    stockStatus:
      raw.isAvailable === false
        ? 'out_of_stock'
        : raw.stockStatus === 'low_stock'
        ? 'low_stock'
        : 'in_stock',
    addedDate: raw.addedAt ? new Date(raw.addedAt).toLocaleDateString('vi-VN') : undefined,
  };
}

function genKey(prefix: string) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  loading: false,

  /** Tải danh sách wishlist từ GET /wishlists */
  fetchWishlist: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.get('/wishlists', { params: { page: 1, limit: 50 } }).catch(() =>
        apiClient.get('/customer/wishlists', { params: { page: 1, limit: 50 } })
      );
      const rawItems: any[] = res.data?.data?.items ?? res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
      set({ items: rawItems.map(mapApiItem) });
    } catch {
      // Giữ nguyên state nếu lỗi mạng
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Toggle yêu thích qua POST /wishlists/toggle
   * - Optimistic update ngay lập tức
   * - Rollback nếu API thất bại
   * Returns true nếu đã thêm, false nếu đã bỏ
   */
  toggleWishlist: async (item) => {
    const { items } = get();
    const exists = items.some((i) => i.productId === item.productId);

    // Optimistic update
    if (exists) {
      set({ items: items.filter((i) => i.productId !== item.productId) });
    } else {
      const newItem: WishlistItem = { ...item, id: `wish-${Date.now()}`, addedDate: 'Vừa thêm' };
      set({ items: [newItem, ...items] });
    }

    try {
      await apiClient
        .post(
          '/wishlists/toggle',
          { productId: item.productId },
          { headers: { 'Idempotency-Key': genKey('wl') } }
        )
        .catch(() =>
          apiClient.post(
            '/customer/wishlists/toggle',
            { productId: item.productId },
            { headers: { 'Idempotency-Key': genKey('wl') } }
          )
        );
    } catch {
      // Rollback optimistic update
      set({ items });
      throw new Error('Không thể cập nhật danh sách yêu thích. Vui lòng thử lại.');
    }

    return !exists;
  },

  isInWishlist: (productId: string) => {
    return get().items.some((i) => i.productId === productId);
  },

  /** Bỏ yêu thích qua toggle API */
  removeItem: async (productId: string) => {
    const { items } = get();
    const target = items.find((i) => i.productId === productId);
    if (!target) return;

    // Optimistic
    set({ items: items.filter((i) => i.productId !== productId) });
    try {
      await apiClient.post(
        '/customer/wishlists/toggle',
        { productId },
        { headers: { 'Idempotency-Key': genKey('wl') } },
      );
    } catch {
      set({ items }); // rollback
    }
  },

  clearWishlist: () => {
    set({ items: [] });
  },

  getWishlistCount: () => {
    return get().items.length;
  },
}));
