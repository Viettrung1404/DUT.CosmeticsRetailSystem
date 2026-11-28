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
import { productApi } from '@/api/productApi';

describe('productApi Service (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. getProducts should call /customer/products with query params', async () => {
    const mockData = {
      statusCode: 200,
      success: true,
      data: {
        items: [{ id: 'prod-1', name: 'Vitamin C Serum', price: 350000 }],
        total: 1,
        page: 1,
        limit: 10,
      },
    };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockData });

    const params = { page: 1, limit: 10, categoryId: 'cat-skincare', search: 'serum' };
    const res = await productApi.getProducts(params);

    expect(apiClient.get).toHaveBeenCalledWith('/customer/products', { params });
    expect(res).toEqual(mockData);
  });

  it('2. getProductDetail should call /customer/products/:slug', async () => {
    const mockDetail = {
      statusCode: 200,
      success: true,
      data: { id: 'prod-1', name: 'Vitamin C Serum', slug: 'vitamin-c-serum', variants: [] },
    };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockDetail });

    const res = await productApi.getProductDetail('vitamin-c-serum');

    expect(apiClient.get).toHaveBeenCalledWith('/customer/products/vitamin-c-serum');
    expect(res).toEqual(mockDetail);
  });

  it('3. getCategories should call /categories/tree', async () => {
    const mockCategories = {
      statusCode: 200,
      success: true,
      data: [{ id: 'cat-1', name: 'Chăm sóc da', slug: 'cham-soc-da' }],
    };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockCategories });

    const res = await productApi.getCategories();

    expect(apiClient.get).toHaveBeenCalledWith('/categories/tree');
    expect(res).toEqual(mockCategories);
  });
});

