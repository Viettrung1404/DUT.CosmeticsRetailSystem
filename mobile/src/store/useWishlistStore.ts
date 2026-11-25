import { create } from 'zustand';
import apiClient from '../api/apiClient';
import * as SecureStore from '../utils/secureStore';

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

const WISHLIST_STORAGE_KEY = 'glowup_local_wishlist';

async function saveLocalWishlist(items: WishlistItem[]) {
  try {
    await SecureStore.setItemAsync(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
}

async function loadLocalWishlist(): Promise<WishlistItem[]> {
  try {
    const raw = await SecureStore.getItemAsync(WISHLIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage errors
  }
  return [];
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  loading: false,

  /** Tải danh sách wishlist từ server hoặc local storage */
  fetchWishlist: async () => {
    // Nạp ngay từ local storage trước để phản hồi tức thì
    const local = await loadLocalWishlist();
    if (local.length > 0 && get().items.length === 0) {
      set({ items: local });
    }

    const token = await SecureStore.getItemAsync('userToken');
    if (!token) {
      return;
    }

    set({ loading: true });
    try {
      const res = await apiClient.get('/wishlists', { params: { page: 1, limit: 50 } }).catch(() =>
        apiClient.get('/customer/wishlists', { params: { page: 1, limit: 50 } })
      );
      const rawItems: any[] = res.data?.data?.items ?? res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
      const mapped = rawItems.map(mapApiItem);
      set({ items: mapped });
      await saveLocalWishlist(mapped);
    } catch {
      // Giữ nguyên state nếu lỗi mạng
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Toggle yêu thích
   * - Hỗ trợ cả khách vãng lai (lưu local) và thành viên đã đăng nhập (sync server)
   * - Không rollback khi không có token hay lỗi mạng để trải nghiệm mượt mà
   */
  toggleWishlist: async (item) => {
    const { items } = get();
    const exists = items.some(
      (i) =>
        (item.productId && i.productId === item.productId) ||
        (item.slug && i.slug === item.slug) ||
        i.id === item.productId
    );

    let updatedItems: WishlistItem[];
    if (exists) {
      updatedItems = items.filter(
        (i) =>
          !(
            (item.productId && i.productId === item.productId) ||
            (item.slug && i.slug === item.slug) ||
            i.id === item.productId
          )
      );
    } else {
      const newItem: WishlistItem = {
        ...item,
        id: item.productId ? `wish-${item.productId}` : `wish-${Date.now()}`,
        addedDate: 'Vừa thêm',
      };
      updatedItems = [newItem, ...items];
    }

    // Cập nhật state & local storage ngay lập tức
    set({ items: updatedItems });
    await saveLocalWishlist(updatedItems);

    // Đồng bộ với server nếu người dùng đã đăng nhập và có productId hợp lệ
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token && item.productId) {
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
      }
    } catch {
      // Bỏ qua lỗi server để không ảnh hưởng trải nghiệm người dùng
    }

    return !exists;
  },

  isInWishlist: (id: string) => {
    if (!id) return false;
    return get().items.some(
      (i) => i.productId === id || i.slug === id || i.id === id
    );
  },

  /** Bỏ yêu thích qua toggle API & local storage */
  removeItem: async (productId: string) => {
    const { items } = get();
    const updated = items.filter(
      (i) => i.productId !== productId && i.slug !== productId && i.id !== productId
    );
    set({ items: updated });
    await saveLocalWishlist(updated);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        await apiClient.post(
          '/customer/wishlists/toggle',
          { productId },
          { headers: { 'Idempotency-Key': genKey('wl') } }
        ).catch(() =>
          apiClient.post(
            '/wishlists/toggle',
            { productId },
            { headers: { 'Idempotency-Key': genKey('wl') } }
          )
        );
      }
    } catch {
      // Ignore
    }
  },

  clearWishlist: () => {
    set({ items: [] });
    void saveLocalWishlist([]);
  },

  getWishlistCount: () => {
    return get().items.length;
  },
}));
