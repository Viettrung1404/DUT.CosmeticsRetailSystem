import apiClient from './apiClient';
import { RecommendationPlacement } from '../services/behaviorTracker';

export interface MobileRecommendedItem {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice?: number | null;
  displayPrice: number;
  imageUrl?: string | null;
  brand?: { id: string; name: string; slug: string } | null;
  avgRating?: number;
  totalSold?: number;
  reason?: string | null;
  score?: number;
  placement?: RecommendationPlacement;
}

export interface MobileRecommendationResponse {
  placement: RecommendationPlacement;
  attributionSource: string;
  items: MobileRecommendedItem[];
}

function unwrapData<T>(response: any): T {
  return (response?.data?.data ?? response?.data ?? response) as T;
}

export const recommendationApi = {
  getHomeRecommendations: async (
    recentIds: string[] = [],
    limit = 8,
  ): Promise<MobileRecommendationResponse> => {
    const res = await apiClient.get('/recommendations/home', {
      params: {
        ...(recentIds.length ? { recentIds: recentIds.join(',') } : {}),
        limit,
      },
    });
    return unwrapData<MobileRecommendationResponse>(res);
  },

  getSimilarProducts: async (
    productId: string,
    limit = 8,
    shadeHex?: string,
  ): Promise<MobileRecommendationResponse> => {
    const res = await apiClient.get(
      `/recommendations/products/${encodeURIComponent(productId)}/similar`,
      {
        params: {
          limit,
          ...(shadeHex ? { shadeHex } : {}),
        },
      },
    );
    return unwrapData<MobileRecommendationResponse>(res);
  },

  getBoughtTogetherProducts: async (
    productId: string,
    limit = 6,
  ): Promise<MobileRecommendationResponse> => {
    const res = await apiClient.get(
      `/recommendations/products/${encodeURIComponent(productId)}/bought-together`,
      {
        params: { limit },
      },
    );
    return unwrapData<MobileRecommendationResponse>(res);
  },

  getCartRecommendations: async (
    productIds: string[] = [],
    limit = 8,
  ): Promise<MobileRecommendationResponse> => {
    const res = await apiClient.get('/recommendations/cart', {
      params: {
        ...(productIds.length ? { productIds: productIds.join(',') } : {}),
        limit,
      },
    });
    return unwrapData<MobileRecommendationResponse>(res);
  },
};
