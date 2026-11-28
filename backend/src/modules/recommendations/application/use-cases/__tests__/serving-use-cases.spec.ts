import { Prisma, RecommendationPlacement, RecommendationType } from '@prisma/client';
import { GetHomeRecommendationsUseCase } from '../get-home-recommendations.use-case';
import { GetSimilarProductsUseCase } from '../get-similar-products.use-case';
import { GetBoughtTogetherProductsUseCase } from '../get-bought-together-products.use-case';
import { GetCartRecommendationsUseCase } from '../get-cart-recommendations.use-case';
import { RecommendationRepository } from '../../../infrastructure/recommendation.repository';
import { RecommendationCacheService } from '../../../infrastructure/recommendation-cache.service';

function hydratedProduct(
  id: string,
  overrides: Partial<any> = {},
): any {
  return {
    id,
    name: `Product ${id}`,
    slug: `product-${id}`,
    basePrice: 350000,
    salePrice: null,
    displayPrice: 350000,
    imageUrl: `https://cdn.example.com/${id}.jpg`,
    brand: { id: 'brand-1', name: 'GlowBrand', slug: 'glowbrand' },
    avgRating: 4.8,
    totalSold: 120,
    reason: overrides.reason ?? 'Gợi ý phù hợp',
    score: overrides.score ?? 0.8,
    placement: overrides.placement ?? RecommendationPlacement.HOME,
    tryOnColorHexes: overrides.tryOnColorHexes ?? [],
    ...overrides,
  };
}

describe('Phase 3 Recommendation Serving Use Cases', () => {
  describe('GetHomeRecommendationsUseCase', () => {
    it('blends In-Session + UserAffinity + Trending, excludes recent 14d purchases, and keeps >45d rebuyable items', async () => {
      const customerId = 'cust-1';
      const pRecentBought = 'prod-recent-14d';
      const pOldBought = 'prod-old-50d';
      const pAffinity = 'prod-affinity';
      const pTrending = 'prod-trending';
      const pSession = 'prod-session';

      const cache = {
        get: jest.fn().mockResolvedValue({
          items: [
            { productId: pTrending, score: 80 },
            { productId: pRecentBought, score: 95 },
          ],
          generatedAt: new Date().toISOString(),
        }),
        remember: jest.fn(async (_k: string, loader: () => Promise<any>) =>
          loader(),
        ),
      };

      const personalizer = {
        getInSessionCandidates: jest.fn().mockResolvedValue([
          { productId: pSession, score: 0.9, reason: 'Tương đồng sản phẩm vừa xem' },
        ]),
      };

      const repository: any = {
        findHomeIntent: jest.fn().mockResolvedValue({ cartItems: [], events: [] }),
        findUserAffinityProfile: jest.fn().mockResolvedValue({
          customerId,
          topCategories: [{ categoryId: 'cat-1', score: 15 }],
          topBrands: [{ brandId: 'brand-1', score: 10 }],
          preferredTags: ['vitamin_b5'],
          avoidedTags: [],
          avgPriceRange: { min: 200000, max: 500000, avg: 350000 },
        }),
        findRecentlyPurchasedProductIds: jest
          .fn()
          .mockResolvedValue([pRecentBought]),
        findAffinityMatchedCandidates: jest.fn().mockResolvedValue([
          { productId: pAffinity, score: 0.88, reason: 'Phù hợp sở thích của bạn' },
          { productId: pOldBought, score: 0.72, reason: 'Đến chu kỳ bổ sung' },
        ]),
        queryTrendingProductsLast7Days: jest.fn().mockResolvedValue([]),
        findBestSellerProductCandidates: jest.fn().mockResolvedValue([]),
        filterAndHydrateEligibleProducts: jest.fn(async (candidates: any[], placement: RecommendationPlacement) =>
          candidates.map((c) => hydratedProduct(c.productId, { ...c, placement })),
        ),
      };

      const useCase = new GetHomeRecommendationsUseCase(
        repository,
        cache as any,
        personalizer as any,
      );

      const res = await useCase.execute({
        customerId,
        recentIds: ['viewed-1'],
        limit: 10,
      });

      expect(res.placement).toBe(RecommendationPlacement.HOME);
      expect(res.attributionSource).toBe('rec_home');
      const returnedIds = res.items.map((i) => i.id);
      expect(returnedIds).not.toContain(pRecentBought);
      expect(returnedIds).toContain(pAffinity);
      expect(returnedIds).toContain(pOldBought);
      expect(returnedIds).toContain(pSession);
      expect(returnedIds).toContain(pTrending);
    });

    it('supports Cold Start chain (guest without recentIds -> Trending 7d -> Best Sellers) and survives Redis errors', async () => {
      const cache = {
        get: jest.fn().mockRejectedValue(new Error('Redis 429 limit exceeded')),
        remember: jest.fn().mockRejectedValue(new Error('Redis 429 limit exceeded')),
      };
      const personalizer = {
        getInSessionCandidates: jest.fn().mockResolvedValue([]),
      };
      const repository: any = {
        queryTrendingProductsLast7Days: jest.fn().mockResolvedValue([]),
        findBestSellerProductCandidates: jest.fn().mockResolvedValue([
          { productId: 'best-1', score: 100, reason: 'Bán chạy hàng đầu' },
        ]),
        filterAndHydrateEligibleProducts: jest.fn(async (candidates: any[]) =>
          candidates.map((c) => hydratedProduct(c.productId, c)),
        ),
      };

      const useCase = new GetHomeRecommendationsUseCase(
        repository,
        cache as any,
        personalizer as any,
      );

      const res = await useCase.execute({ customerId: null, recentIds: [], limit: 8 });
      expect(res.items).toHaveLength(1);
      expect(res.items[0].id).toBe('best-1');
    });
  });

  describe('GetSimilarProductsUseCase', () => {
    it('reads precomputed SIMILAR_CONTENT via 2-level cache, boosts matching shadeHex, and drops out-of-stock items', async () => {
      const cache = {
        remember: jest.fn(async (_k: string, loader: () => Promise<any>) =>
          loader(),
        ),
      };
      const repository: any = {
        findPrecomputedRecommendations: jest.fn().mockResolvedValue([
          { productId: 'lip-far', score: 0.9, reason: 'Cùng danh mục' },
          { productId: 'lip-close', score: 0.78, reason: 'Cùng thương hiệu' },
          { productId: 'out-of-stock', score: 0.95, reason: 'Hết hàng' },
        ]),
        findSameCategoryPriceRangeFallbacks: jest.fn().mockResolvedValue([]),
        filterAndHydrateEligibleProducts: jest.fn(async (candidates: any[]) =>
          candidates
            .filter((c) => c.productId !== 'out-of-stock')
            .map((c) =>
              hydratedProduct(c.productId, {
                ...c,
                placement: RecommendationPlacement.PRODUCT_SIMILAR,
                tryOnColorHexes:
                  c.productId === 'lip-close' ? ['#C94C32'] : ['#1A2B9C'],
              }),
            ),
        ),
      };

      const useCase = new GetSimilarProductsUseCase(repository, cache as any);
      const res = await useCase.execute({
        productId: 'lip-source',
        limit: 8,
        shadeHex: '#C84B31',
      });

      expect(res.placement).toBe(RecommendationPlacement.PRODUCT_SIMILAR);
      expect(res.attributionSource).toBe('rec_similar');
      expect(res.items.map((i) => i.id)).toEqual(['lip-close', 'lip-far']);
      expect(res.items[0].reason).toContain('tông màu');
    });

    it('falls back to same category ±30% price when cache/Redis fails and precomputed list is empty', async () => {
      const cache = {
        remember: jest.fn().mockRejectedValue(new Error('Redis timeout')),
      };
      const repository: any = {
        findPrecomputedRecommendations: jest.fn().mockResolvedValue([]),
        findSameCategoryPriceRangeFallbacks: jest.fn().mockResolvedValue([
          {
            productId: 'fallback-cat-1',
            score: 0.55,
            reason: 'Cùng danh mục & phân khúc giá tương đồng',
          },
        ]),
        filterAndHydrateEligibleProducts: jest.fn(async (candidates: any[]) =>
          candidates.map((c) => hydratedProduct(c.productId, c)),
        ),
      };

      const useCase = new GetSimilarProductsUseCase(repository, cache as any);
      const res = await useCase.execute({ productId: 'prod-1', limit: 8 });

      expect(res.items).toHaveLength(1);
      expect(res.items[0].id).toBe('fallback-cat-1');
    });
  });

  describe('GetBoughtTogetherProductsUseCase', () => {
    it('returns BOUGHT_TOGETHER items, excludes source product, and falls back to SkincareRoutineRules', async () => {
      const cache = {
        remember: jest.fn(async (_k: string, loader: () => Promise<any>) =>
          loader(),
        ),
      };
      const repository: any = {
        findPrecomputedRecommendations: jest.fn().mockResolvedValue([
          { productId: 'source-cleanser', score: 1.5, reason: 'Self should be excluded' },
        ]),
        findProductRoutineSubject: jest.fn().mockResolvedValue({
          id: 'source-cleanser',
          name: 'Sữa rửa mặt dịu nhẹ',
          categoryId: 'cat-cleanser',
          categoryName: 'Sữa rửa mặt',
        }),
        findActiveProductRoutineCatalog: jest.fn().mockResolvedValue([
          {
            id: 'toner-1',
            name: 'Toner cấp ẩm B5',
            categoryId: 'cat-toner',
            categoryName: 'Toner',
          },
        ]),
        filterAndHydrateEligibleProducts: jest.fn(async (candidates: any[]) =>
          candidates.map((c) =>
            hydratedProduct(c.productId, {
              ...c,
              placement: RecommendationPlacement.PRODUCT_BOUGHT_TOGETHER,
            }),
          ),
        ),
      };

      const useCase = new GetBoughtTogetherProductsUseCase(
        repository,
        cache as any,
      );
      const res = await useCase.execute({
        productId: 'source-cleanser',
        limit: 6,
      });

      expect(res.placement).toBe(
        RecommendationPlacement.PRODUCT_BOUGHT_TOGETHER,
      );
      expect(res.attributionSource).toBe('rec_bought_together');
      expect(res.items.map((i) => i.id)).toEqual(['toner-1']);
    });
  });

  describe('GetCartRecommendationsUseCase', () => {
    it('excludes cart items, drops Retinol+BHA conflicts, boosts Vitamin B5, and detects missing routine steps', async () => {
      const repository: any = {
        findCartContextForCustomerOrIds: jest.fn().mockResolvedValue({
          cartProductIds: ['cart-retinol'],
          cartProducts: [
            {
              id: 'cart-retinol',
              name: 'Serum Retinol 0.5%',
              categoryName: 'Serum đặc trị',
              normalizedIngredients: ['retinoid'],
            },
          ],
          customerSkinTags: ['da-nhay-cam'],
          avoidedTags: [],
        }),
        findRoutineCandidateProducts: jest.fn().mockResolvedValue([
          {
            id: 'cart-retinol', // already in cart -> must exclude
            name: 'Serum Retinol 0.5%',
            categoryName: 'Serum',
            normalizedIngredients: ['retinoid'],
            baseScore: 0.9,
          },
          {
            id: 'cand-bha', // Retinol + BHA -> excluded by IngredientConflictPolicy
            name: 'Toner BHA 2%',
            categoryName: 'Toner',
            normalizedIngredients: ['bha'],
            baseScore: 0.95,
          },
          {
            id: 'cand-alcohol-sunscreen', // drying_alcohol on sensitive skin -> penalized
            name: 'Kem chống nắng kiềm dầu',
            categoryName: 'Kem chống nắng',
            normalizedIngredients: ['uv_filter', 'drying_alcohol'],
            baseScore: 0.9,
          },
          {
            id: 'cand-b5-cream', // Vitamin B5 + Moisturizer -> boosted & safe
            name: 'Kem dưỡng phục hồi B5 Ceramide',
            categoryName: 'Kem dưỡng ẩm',
            normalizedIngredients: ['vitamin_b5', 'ceramide'],
            baseScore: 0.85,
          },
        ]),
        filterAndHydrateEligibleProducts: jest.fn(async (candidates: any[]) =>
          candidates.map((c) =>
            hydratedProduct(c.productId, {
              ...c,
              placement: RecommendationPlacement.CART_ROUTINE,
            }),
          ),
        ),
      };

      const useCase = new GetCartRecommendationsUseCase(
        repository,
        {} as any,
      );

      const res = await useCase.execute({
        customerId: 'cust-1',
        productIds: [],
        limit: 8,
      });

      expect(res.placement).toBe(RecommendationPlacement.CART_ROUTINE);
      expect(res.attributionSource).toBe('rec_cart');
      const ids = res.items.map((i) => i.id);
      expect(ids).not.toContain('cart-retinol');
      expect(ids).not.toContain('cand-bha');
      expect(ids[0]).toBe('cand-b5-cream');
      expect(res.items[0].score!).toBeGreaterThan(res.items[1].score!);
    });
  });

  describe('RecommendationRepository Post-Filtering SQL', () => {
    it('executes 1 single IN query enforcing ACTIVE product, available_quantity > 0, and inventory_lots min_shelf_life_days', async () => {
      const validId = '11111111-1111-4111-8111-111111111111';
      const nearExpiryId = '22222222-2222-4222-8222-222222222222';
      const queryRaw = jest.fn().mockResolvedValue([
        {
          id: validId,
          name: 'Serum B5',
          slug: 'serum-b5',
          base_price: 350000,
          sale_price: 299000,
          avg_rating: 4.9,
          total_sold: 250,
          brand_id: 'b-1',
          brand_name: 'La Roche-Posay',
          brand_slug: 'la-roche-posay',
          image_url: 'https://cdn.example.com/b5.jpg',
          try_on_color_hexes: [],
        },
      ]);

      const repo = new RecommendationRepository({ $queryRaw: queryRaw } as any);
      const hydrated = await repo.filterAndHydrateEligibleProducts(
        [
          { productId: validId, score: 0.9, reason: 'Cùng chứa B5' },
          { productId: nearExpiryId, score: 0.95, reason: 'Cận date' },
        ],
        RecommendationPlacement.PRODUCT_SIMILAR,
      );

      expect(queryRaw).toHaveBeenCalledTimes(1);
      const sqlText = Prisma.sql(queryRaw.mock.calls[0][0], ...queryRaw.mock.calls[0].slice(1)).sql;
      expect(sqlText).toContain('p.is_active = true');
      expect(sqlText).toContain('available_quantity');
      expect(sqlText).toContain('inventory_lots');
      expect(sqlText).toContain('min_shelf_life_days');
      expect(hydrated).toHaveLength(1);
      expect(hydrated[0]).toEqual(
        expect.objectContaining({
          id: validId,
          displayPrice: 299000,
          placement: RecommendationPlacement.PRODUCT_SIMILAR,
          reason: 'Cùng chứa B5',
          brand: {
            id: 'b-1',
            name: 'La Roche-Posay',
            slug: 'la-roche-posay',
          },
        }),
      );
    });
  });

  describe('RecommendationCacheService graceful degradation', () => {
    it('logs structured warning and falls back to DB loader when cache throws', async () => {
      const twoLevelCacheMock = {
        get: jest.fn().mockRejectedValue(new Error('Upstash quota exceeded')),
        set: jest.fn().mockRejectedValue(new Error('Upstash quota exceeded')),
        del: jest.fn().mockRejectedValue(new Error('Upstash quota exceeded')),
        remember: jest
          .fn()
          .mockRejectedValue(new Error('Upstash quota exceeded')),
      };
      const cacheService = new RecommendationCacheService(
        twoLevelCacheMock as any,
        {} as any,
      );
      const warnSpy = jest
        .spyOn((cacheService as any).logger, 'warn')
        .mockImplementation(() => undefined);

      await expect(cacheService.get('rec:trending:7d')).resolves.toBeNull();
      await expect(
        cacheService.remember('rec:similar:1', async () => ['db-fallback']),
      ).resolves.toEqual(['db-fallback']);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'recommendation_cache_degraded',
          operation: 'remember',
          key: 'rec:similar:1',
        }),
      );
    });
  });
});
