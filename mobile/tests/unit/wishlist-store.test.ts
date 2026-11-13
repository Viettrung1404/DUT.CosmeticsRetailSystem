import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from '@/api/apiClient';
import { useWishlistStore } from '@/store/useWishlistStore';

describe('useWishlistStore (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWishlistStore.setState({ items: [], loading: false });
  });

  it('1. isInWishlist should check if item is in wishlist', () => {
    useWishlistStore.setState({
      items: [
        {
          id: 'w-1',
          productId: 'prod-123',
          name: 'Serum Vitamin C',
          brand: 'GlowUp',
          price: 350000,
          imageUrl: '',
          category: 'Serum',
          rating: 4.9,
          reviewsCount: 120,
          stockStatus: 'in_stock',
        },
      ],
    });

    expect(useWishlistStore.getState().isInWishlist('prod-123')).toBe(true);
    expect(useWishlistStore.getState().isInWishlist('prod-456')).toBe(false);
  });

  it('2. toggleWishlist should add item and call API', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ data: { success: true } });

    const newItem = {
      productId: 'prod-999',
      name: 'Son Lì Rose',
      brand: 'MAC',
      price: 480000,
      imageUrl: '',
      category: 'Lipstick',
      rating: 5.0,
      reviewsCount: 88,
      stockStatus: 'in_stock' as const,
    };

    const added = await useWishlistStore.getState().toggleWishlist(newItem);

    expect(added).toBe(true);
    expect(useWishlistStore.getState().items.length).toBe(1);
    expect(useWishlistStore.getState().isInWishlist('prod-999')).toBe(true);
    expect(apiClient.post).toHaveBeenCalled();
  });

  it('3. removeItem should delete item from store', async () => {
    useWishlistStore.setState({
      items: [
        {
          id: 'w-1',
          productId: 'prod-to-delete',
          name: 'Tẩy trang',
          brand: 'Loreal',
          price: 180000,
          imageUrl: '',
          category: 'Skincare',
          rating: 4.5,
          reviewsCount: 50,
          stockStatus: 'in_stock',
        },
      ],
    });

    (apiClient.post as any).mockResolvedValueOnce({ data: { success: true } });

    await useWishlistStore.getState().removeItem('prod-to-delete');

    expect(useWishlistStore.getState().items.length).toBe(0);
    expect(useWishlistStore.getState().isInWishlist('prod-to-delete')).toBe(false);
  });
});

