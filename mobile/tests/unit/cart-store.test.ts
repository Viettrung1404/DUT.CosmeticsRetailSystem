import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/cartApi', () => ({
  cartApi: {
    getCart: vi.fn(),
    addToCart: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    mergeCart: vi.fn(),
  },
}));

import { cartApi } from '@/api/cartApi';
import { useCartStore } from '@/store/useCartStore';

describe('useCartStore (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [], isLoading: false });
  });

  it('1. should calculate total price correctly only for selected items', () => {
    useCartStore.setState({
      items: [
        {
          id: 'item-1',
          variantId: 'var-1',
          productId: 'prod-1',
          productName: 'Son Dưỡng Dior',
          variantName: '001 Pink',
          price: 850000,
          quantity: 2, // 1.700.000
          imageUrl: '',
          stock: 10,
          selected: true,
        },
        {
          id: 'item-2',
          variantId: 'var-2',
          productId: 'prod-2',
          productName: 'Kem Chống Nắng Anessa',
          variantName: '60ml',
          price: 500000,
          quantity: 1, // Không chọn
          imageUrl: '',
          stock: 10,
          selected: false,
        },
      ],
    });

    const total = useCartStore.getState().getTotalPrice();
    expect(total).toBe(1700000);
    expect(useCartStore.getState().getSelectedCount()).toBe(1);
    expect(useCartStore.getState().getTotalItemsCount()).toBe(3);
  });

  it('2. fetchCart should load and map items from cartApi.getCart()', async () => {
    const mockApiResponse = {
      statusCode: 200,
      success: true,
      data: {
        id: 'cart-123',
        items: [
          {
            id: 'ci-1',
            productVariantId: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
            productId: 'p-1',
            productName: 'Kem Dưỡng Ẩm GlowUp',
            variantName: '50ml',
            currentPrice: 420000,
            unitPrice: 420000,
            quantity: 1,
            isSelected: true,
            availableStock: 20,
          },
        ],
      },
    };

    (cartApi.getCart as any).mockResolvedValueOnce({ data: mockApiResponse });

    await useCartStore.getState().fetchCart();

    const state = useCartStore.getState();
    expect(state.items.length).toBe(1);
    expect(state.items[0].productName).toBe('Kem Dưỡng Ẩm GlowUp');
    expect(state.items[0].price).toBe(420000);
    expect(state.items[0].selected).toBe(true);
  });
});

