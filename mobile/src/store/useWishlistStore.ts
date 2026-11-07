import { create } from 'zustand';

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  category: 'Skincare' | 'Serum' | 'Sunscreens' | 'Lipstick' | 'Makeup';
  rating: number;
  reviewsCount: number;
  badge?: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  addedDate?: string;
}

interface WishlistState {
  items: WishlistItem[];
  toggleWishlist: (item: Omit<WishlistItem, 'id'>) => boolean;
  isInWishlist: (productId: string) => boolean;
  removeItem: (productId: string) => void;
  clearWishlist: () => void;
  getWishlistCount: () => number;
}

const INITIAL_WISHLIST: WishlistItem[] = [
  {
    id: 'wish-1',
    productId: 'prod-s-1',
    name: 'GlowUp Radiance C-Serum Tươi 30ml',
    brand: 'GLOWUP LAB',
    price: 485000,
    originalPrice: 650000,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPXszzaZJ-CKUqKGl1J4deKZphZWEeI5wLZcRF4oEpOzXUO9ILg594tMOGfQ7aDAnD95tHnThxQrBtzkasEPGicqQ1T7NExYkLEEnizjxYjw7DGhSJlCXq1vuTPjO9ypCl0NS-S1IpwTFIxWBzMPYyKUoBL_brngE8FpEkY-UBKyrw1En0aY17KO3r3ggQqtFpdaM8_nf_Fh4rkRtTc8DxrF0NWl13rvId3Y6KNw4IfnB9rLDDho7jaA',
    category: 'Serum',
    rating: 4.9,
    reviewsCount: 1250,
    badge: 'Bán chạy nhất',
    stockStatus: 'in_stock',
    addedDate: 'Hôm nay',
  },
  {
    id: 'wish-2',
    productId: 'prod-s-2',
    name: 'Glass Skin Barrier Cream 50g Phục Hồi',
    brand: 'GLOWUP LAB',
    price: 390000,
    originalPrice: 450000,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFoJz9_e_s-F6Qp7q_U-y5g3RjK4o0LzYd5z3aX7wV5t3v1L7s_9m4q_WAoKCYLRFBkJ4vw',
    category: 'Skincare',
    rating: 4.8,
    reviewsCount: 860,
    badge: 'Clean 100%',
    stockStatus: 'in_stock',
    addedDate: '2 ngày trước',
  },
  {
    id: 'wish-3',
    productId: 'prod-s-4',
    name: 'Velvet Cloud Matte Lipstick #04 Rosewood',
    brand: '3CE STYLENANDA',
    price: 340000,
    originalPrice: 390000,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhU0n1c3dv6DGZ8a2VJP9OMa-8E38wU9vwljidCxKn0i2C1ij5YAY7p1VavTZwGl9Hz0QLnWwilETSfTDzoZ3eEd8f9amVfrQF3e46Voq6vpX-jXddrp8iK_nvUU9FGaCUsZJMTIJKU8g8OCGO7YHQVyWjQmg6NseeG6Vu5mEee-7HKAmNCsOeBny-3U_aD7BXLL2QzoxKqsC9deTGM23ZfQPNXUMegiM041dJ1_SW6YRt3v2kKv_UyQ',
    category: 'Lipstick',
    rating: 4.9,
    reviewsCount: 2100,
    badge: 'Chỉ còn 3 thỏi',
    stockStatus: 'low_stock',
    addedDate: 'Tuần này',
  },
  {
    id: 'wish-4',
    productId: 'prod-s-5',
    name: 'Anthelios UV Mune 400 Kiềm Dầu 50ml',
    brand: 'LA ROCHE-POSAY',
    price: 495000,
    originalPrice: 535000,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPXszzaZJ-CKUqKGl1J4deKZphZWEeI5wLZcRF4oEpOzXUO9ILg594tMOGfQ7aDAnD95tHnThxQrBtzkasEPGicqQ1T7NExYkLEEnizjxYjw7DGhSJlCXq1vuTPjO9ypCl0NS-S1IpwTFIxWBzMPYyKUoBL_brngE8FpEkY-UBKyrw1En0aY17KO3r3ggQqtFpdaM8_nf_Fh4rkRtTc8DxrF0NWl13rvId3Y6KNw4IfnB9rLDDho7jaA',
    category: 'Sunscreens',
    rating: 4.9,
    reviewsCount: 3500,
    badge: 'Chuyên gia khuyên dùng',
    stockStatus: 'in_stock',
    addedDate: '1 tuần trước',
  },
];

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: INITIAL_WISHLIST,

  toggleWishlist: (item) => {
    const { items } = get();
    const exists = items.some((i) => i.productId === item.productId);

    if (exists) {
      set({ items: items.filter((i) => i.productId !== item.productId) });
      return false; // đã bỏ yêu thích
    } else {
      const newItem: WishlistItem = {
        ...item,
        id: `wish-${Date.now()}`,
        addedDate: 'Vừa thêm',
      };
      set({ items: [newItem, ...items] });
      return true; // đã thêm yêu thích
    }
  },

  isInWishlist: (productId: string) => {
    return get().items.some((i) => i.productId === productId);
  },

  removeItem: (productId: string) => {
    set({ items: get().items.filter((i) => i.productId !== productId) });
  },

  clearWishlist: () => {
    set({ items: [] });
  },

  getWishlistCount: () => {
    return get().items.length;
  },
}));

