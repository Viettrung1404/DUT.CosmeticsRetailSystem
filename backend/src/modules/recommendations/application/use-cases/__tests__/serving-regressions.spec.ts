import { GetSimilarProductsUseCase } from '../get-similar-products.use-case';
import { GetBoughtTogetherProductsUseCase } from '../get-bought-together-products.use-case';
import { GetHomeRecommendationsUseCase } from '../get-home-recommendations.use-case';
import { RecommendationRepository } from '../../../infrastructure/recommendation.repository';

describe('Recommendation serving regressions', () => {
  const cache = {
    remember: async (_key: string, load: () => Promise<unknown>) => load(),
    get: async () => ({ items: [{ productId: 'sold-out', score: 1 }] }),
  };
  const hydrate = async (rows: any[]) =>
    rows
      .filter((row) => row.productId !== 'sold-out')
      .map((row) => ({ ...row, id: row.productId }));

  it('refills similar products after precomputed candidates fail inventory filtering', async () => {
    const repository: any = {
      findPrecomputedRecommendations: jest
        .fn()
        .mockResolvedValue([{ productId: 'sold-out', score: 1 }]),
      findSameCategoryPriceRangeFallbacks: jest
        .fn()
        .mockResolvedValue([{ productId: 'in-stock', score: 0.5 }]),
      filterAndHydrateEligibleProducts: hydrate,
    };
    const result = await new GetSimilarProductsUseCase(
      repository,
      cache as any,
    ).execute({ productId: 'source', limit: 1 });
    expect(result.items.map((item) => item.id)).toEqual(['in-stock']);
    expect(repository.findSameCategoryPriceRangeFallbacks).toHaveBeenCalled();
  });

  it('refills bought-together from routine rules when the precomputed list is sold out', async () => {
    const repository: any = {
      findPrecomputedRecommendations: async () => [
        { productId: 'sold-out', score: 1 },
      ],
      findProductRoutineSubject: async () => ({
        id: 'source',
        name: 'Sữa rửa mặt',
        categoryName: 'Sữa rửa mặt',
      }),
      findActiveProductRoutineCatalog: async () => [
        { id: 'toner', name: 'Toner', categoryName: 'Toner' },
      ],
      filterAndHydrateEligibleProducts: hydrate,
    };
    const result = await new GetBoughtTogetherProductsUseCase(
      repository,
      cache as any,
    ).execute({ productId: 'source', limit: 1 });
    expect(result.items.map((item) => item.id)).toEqual(['toner']);
  });

  it('refills home from eligible best sellers after trending is sold out', async () => {
    const repository: any = {
      findBestSellerProductCandidates: jest
        .fn()
        .mockResolvedValue([{ productId: 'in-stock', score: 0.5 }]),
      filterAndHydrateEligibleProducts: hydrate,
    };
    const result = await new GetHomeRecommendationsUseCase(
      repository,
      cache as any,
      { getInSessionCandidates: async () => [] } as any,
    ).execute({ customerId: null, recentIds: [], limit: 1 });
    expect(result.items.map((item) => item.id)).toEqual(['in-stock']);
  });

  it('applies avoided ingredients to session, trending and best sellers after blending', async () => {
    const filter = jest.fn(async (rows: any[], avoided: string[]) => {
      expect(avoided).toEqual(['drying_alcohol']);
      return rows.filter((row) => row.productId === 'safe');
    });
    const repository: any = {
      findHomeIntent: async () => ({ cartItems: [], events: [] }),
      findUserAffinityProfile: async () => ({
        avoidedTags: ['drying_alcohol'],
      }),
      findRecentlyPurchasedProductIds: async () => [],
      findAffinityMatchedCandidates: async () => [],
      findBestSellerProductCandidates: async () => [
        { productId: 'unsafe-best', score: 1 },
        { productId: 'safe', score: 0.5 },
      ],
      filterCandidatesByAvoidedTags: filter,
      filterAndHydrateEligibleProducts: hydrate,
    };
    const result = await new GetHomeRecommendationsUseCase(
      repository,
      {
        ...cache,
        get: async () => ({
          items: [{ productId: 'unsafe-trending', score: 1 }],
        }),
      } as any,
      {
        getInSessionCandidates: async () => [
          { productId: 'unsafe-session', score: 1 },
        ],
      } as any,
    ).execute({ customerId: 'customer', recentIds: [], limit: 1 });
    expect(result.items.map((item) => item.id)).toEqual(['safe']);
    expect(filter.mock.calls[1][0].map((row) => row.productId)).toEqual(
      expect.arrayContaining([
        'unsafe-session',
        'unsafe-trending',
        'unsafe-best',
      ]),
    );
  });

  it('ranks recent active cart items and engaged views ahead of affinity and pages the eligible products', async () => {
    const now = Date.now();
    const day = 86_400_000;
    const candidates = Array.from({ length: 27 }, (_, index) => ({
      productId: `best-${index}`,
      score: 0.5,
    }));
    const repository: any = {
      findHomeIntent: async () => ({
        cartItems: [
          { variant: { productId: 'cart-new' }, productVariantId: 'variant-1', createdAt: new Date(now - 1000) },
          { variant: { productId: 'cart-old' }, productVariantId: 'variant-2', createdAt: new Date(now - day) },
          { variant: { productId: 'bought' }, productVariantId: 'variant-3', createdAt: new Date(now - 500) },
        ],
        events: [
          { productId: 'removed', variantId: 'variant-4', eventType: 'ADD_TO_CART', createdAt: new Date(now - 250) },
          { productId: 'clicked', eventType: 'SEARCH_CLICK', createdAt: new Date(now - 1000) },
        ],
      }),
      findUserAffinityProfile: async () => ({ avoidedTags: [] }),
      findRecentlyPurchasedProductIds: async () => ['bought'],
      findAffinityMatchedCandidates: async () => [{ productId: 'affinity', score: 100 }],
      findBestSellerProductCandidates: async () => candidates,
      findEligibleHomeCandidates: async (rows: any[]) => rows.filter((row) => row.productId !== 'sold-out'),
      filterAndHydrateEligibleProducts: hydrate,
    };
    const useCase = new GetHomeRecommendationsUseCase(
      repository,
      cache as any,
      { getInSessionCandidates: async () => [] } as any,
    );
    const input = {
      customerId: 'customer',
      recentIds: [],
      recentViews: [
        { productId: 'long-view', dwellMs: 55_000, viewedAt: now - 1000 },
        { productId: 'short-view', dwellMs: 4_000, viewedAt: now - 1000 },
        { productId: 'expired-view', dwellMs: 55_000, viewedAt: now - 15 * day },
      ],
      limit: 15,
    };
    const [first, second, last] = await Promise.all([1, 2, 3].map(
      (page) => useCase.execute({ ...input, page }),
    ));
    expect(first.pagination).toEqual({ page: 1, totalPages: 3 });
    expect(first.items.map(({ id }) => id).slice(0, 6)).toEqual([
      'cart-new', 'cart-old', 'long-view', 'short-view', 'clicked', 'affinity',
    ]);
    expect([first, second, last].map((page) => page.items.length)).toEqual([15, 15, 3]);
    const ids = [first, second, last].flatMap((page) => page.items.map(({ id }) => id));
    expect(new Set(ids).size).toBe(33);
    for (const id of ['bought', 'removed', 'sold-out', 'expired-view']) {
      expect(ids).not.toContain(id);
    }
  });

  it('checks actual normalized ingredients and product tags for avoided candidates', async () => {
    const repository = new RecommendationRepository({
      product: {
        findMany: async () => [
          {
            id: 'unsafe',
            ingredients: [{ ingredientName: 'Alcohol Denat.' }],
            tags: [],
            howToUse: null,
            specifications: null,
          },
          {
            id: 'safe',
            ingredients: [{ ingredientName: 'Panthenol' }],
            tags: [],
            howToUse: null,
            specifications: null,
          },
        ],
      },
    } as any);
    expect(
      await repository.filterCandidatesByAvoidedTags(
        [
          { productId: 'unsafe', score: 1 },
          { productId: 'safe', score: 0.5 },
        ],
        ['drying_alcohol'],
      ),
    ).toEqual([{ productId: 'safe', score: 0.5 }]);
  });
});
