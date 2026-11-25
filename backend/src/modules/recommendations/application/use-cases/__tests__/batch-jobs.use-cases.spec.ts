import { RecommendationType } from '@prisma/client';
import { RecommendationRepository } from '../../../infrastructure/recommendation.repository';
import { RecomputeSimilarProductsUseCase } from '../recompute-similar-products.use-case';
import { RecomputeBoughtTogetherUseCase } from '../recompute-bought-together.use-case';
import { RecomputeUserAffinitiesUseCase } from '../recompute-user-affinities.use-case';
import { RefreshTrendingCacheUseCase } from '../refresh-trending-cache.use-case';
import { CleanupOldEventsUseCase } from '../cleanup-old-events.use-case';

describe('Phase 2 Recommendation Batch Jobs', () => {
  function createMockCache(acquired = true) {
    return {
      withJobLock: jest.fn(
        async (_jobName: string, _ttl: number, task: () => Promise<any>) => {
          if (!acquired) {
            return { acquired: false as const };
          }
          const result = await task();
          return { acquired: true as const, result };
        },
      ),
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
    };
  }

  describe('Distributed Lock protection across all jobs', () => {
    it('skips execution cleanly when lock is already held by another runner', async () => {
      const cache = createMockCache(false);
      const repo: any = {};

      const jobs = [
        new RecomputeSimilarProductsUseCase(repo, cache as any),
        new RecomputeBoughtTogetherUseCase(repo, cache as any),
        new RecomputeUserAffinitiesUseCase(repo, cache as any),
        new RefreshTrendingCacheUseCase(repo, cache as any),
        new CleanupOldEventsUseCase(repo, cache as any),
      ];

      for (const job of jobs) {
        const res = await job.execute();
        expect(res).toEqual(expect.objectContaining({ skipped: true }));
      }

      expect(cache.withJobLock).toHaveBeenNthCalledWith(
        1,
        'similar',
        600,
        expect.any(Function),
      );
      expect(cache.withJobLock).toHaveBeenNthCalledWith(
        2,
        'bought-together',
        600,
        expect.any(Function),
      );
      expect(cache.withJobLock).toHaveBeenNthCalledWith(
        3,
        'affinities',
        600,
        expect.any(Function),
      );
      expect(cache.withJobLock).toHaveBeenNthCalledWith(
        4,
        'trending',
        600,
        expect.any(Function),
      );
      expect(cache.withJobLock).toHaveBeenNthCalledWith(
        5,
        'cleanup',
        600,
        expect.any(Function),
      );
    });
  });

  describe('RecomputeSimilarProductsUseCase', () => {
    it('computes Top 12 similar products and performs bulk upsert + batchVersion cleanup', async () => {
      const cache = createMockCache(true);
      const products = Array.from({ length: 15 }, (_, i) => ({
        id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        name: `Serum Vitamin B5 #${i}`,
        categoryId: 'cat-serum',
        brandId: 'brand-1',
        effectivePrice: 350000,
        howToUse: 'Dùng sau bước toner',
        specifications: { skinType: 'da-dau' },
        ingredients: ['Panthenol', 'Niacinamide'],
        tags: ['da-dau', 'phuc-hoi'],
        tryOnColorHexes: [],
      }));

      const repo: any = {
        findActiveProductsForSimilarity: jest.fn().mockResolvedValue(products),
        replaceProductRecommendationsByType: jest
          .fn()
          .mockResolvedValue({ upsertedCount: 180, deletedStaleCount: 4 }),
      };

      const useCase = new RecomputeSimilarProductsUseCase(repo, cache as any);
      const res = await useCase.execute();

      expect(res.skipped).toBe(false);
      expect(res.productsProcessed).toBe(15);
      expect(res.upsertedCount).toBe(180);
      expect(res.deletedStaleCount).toBe(4);
      expect(repo.replaceProductRecommendationsByType).toHaveBeenCalledWith(
        'SIMILAR_CONTENT',
        expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        expect.arrayContaining([
          expect.objectContaining({
            sourceProductId: products[0].id,
            targetProductId: expect.any(String),
            score: expect.any(Number),
            reason: expect.any(String),
          }),
        ]),
      );

      const passedRows =
        repo.replaceProductRecommendationsByType.mock.calls[0][2];
      const countForFirst = passedRows.filter(
        (r: any) => r.sourceProductId === products[0].id,
      ).length;
      expect(countForFirst).toBe(12);
    });
  });

  describe('RecomputeBoughtTogetherUseCase', () => {
    it('aggregates co-occurrence Lift pairs + adds routine complements for cold-start products and cleans stale batchVersion', async () => {
      const cache = createMockCache(true);
      const repo: any = {
        computeBoughtTogetherPairsFromOrders: jest.fn().mockResolvedValue([
          {
            sourceProductId: 'prod-1',
            targetProductId: 'prod-2',
            coOrderCount: 5,
            liftScore: 2.4,
            confidence: 0.5,
          },
        ]),
        findActiveProductRoutineCatalog: jest.fn().mockResolvedValue([
          {
            id: 'prod-1',
            name: 'Sữa rửa mặt dịu nhẹ',
            categoryName: 'Sữa rửa mặt',
            categoryId: 'cat-cleanser',
          },
          {
            id: 'prod-2',
            name: 'Toner cấp ẩm B5',
            categoryName: 'Toner',
            categoryId: 'cat-toner',
          },
          {
            id: 'prod-3',
            name: 'Kem chống nắng phổ rộng',
            categoryName: 'Kem chống nắng',
            categoryId: 'cat-sun',
          },
        ]),
        replaceProductRecommendationsByType: jest
          .fn()
          .mockResolvedValue({ upsertedCount: 6, deletedStaleCount: 2 }),
      };

      const useCase = new RecomputeBoughtTogetherUseCase(repo, cache as any);
      const res = await useCase.execute();

      expect(res.skipped).toBe(false);
      expect(repo.computeBoughtTogetherPairsFromOrders).toHaveBeenCalledWith(3);
      expect(repo.replaceProductRecommendationsByType).toHaveBeenCalledWith(
        'BOUGHT_TOGETHER',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            sourceProductId: 'prod-1',
            targetProductId: 'prod-2',
          }),
        ]),
      );
    });
  });

  describe('RecomputeUserAffinitiesUseCase', () => {
    it('recomputes affinities only for customers with activity in last 24h combining events, search_histories, and customer_tags', async () => {
      const cache = createMockCache(true);
      const customerId = '11111111-1111-4111-8111-111111111111';

      const repo: any = {
        findCustomerIdsWithRecentActivity: jest
          .fn()
          .mockResolvedValue([customerId]),
        findCustomerAffinityInputs: jest.fn().mockResolvedValue([
          {
            customerId,
            events: [
              {
                eventType: 'PURCHASE',
                categoryId: 'cat-serum',
                brandId: 'brand-1',
                weight: 10,
                effectivePrice: 450000,
                productTags: ['cap-am'],
                normalizedIngredients: ['vitamin_b5'],
                createdAt: new Date(),
              },
            ],
            searchQueries: ['serum b5 rau ma'],
            customerTags: ['da-nhay-cam', 'da-kho'],
          },
        ]),
        upsertUserAffinityProfiles: jest.fn().mockResolvedValue(1),
      };

      const useCase = new RecomputeUserAffinitiesUseCase(repo, cache as any);
      const res = await useCase.execute();

      expect(res.skipped).toBe(false);
      expect(res.customersUpdated).toBe(1);
      expect(repo.upsertUserAffinityProfiles).toHaveBeenCalledWith([
        expect.objectContaining({
          customerId,
          topCategories: expect.arrayContaining([
            expect.objectContaining({ categoryId: 'cat-serum' }),
          ]),
          topBrands: expect.arrayContaining([
            expect.objectContaining({ brandId: 'brand-1' }),
          ]),
          preferredTags: expect.arrayContaining(['vitamin_b5', 'centella']),
          avoidedTags: expect.arrayContaining(['drying_alcohol']),
          avgPriceRange: expect.objectContaining({
            avg: expect.any(Number),
          }),
        }),
      ]);
    });
  });

  describe('RefreshTrendingCacheUseCase', () => {
    it('runs 1 SQL query for 7d time-decay scores and stores Top 50 with a single SET rec:trending:7d command', async () => {
      const cache = createMockCache(true);
      const trendingRows = Array.from({ length: 50 }, (_, i) => ({
        productId: `prod-${i}`,
        score: 100 - i,
      }));
      const repo: any = {
        queryTrendingProductsLast7Days: jest
          .fn()
          .mockResolvedValue(trendingRows),
      };

      const useCase = new RefreshTrendingCacheUseCase(repo, cache as any);
      const res = await useCase.execute();

      expect(res.skipped).toBe(false);
      expect(res.count).toBe(50);
      expect(repo.queryTrendingProductsLast7Days).toHaveBeenCalledWith(50);
      expect(cache.set).toHaveBeenCalledTimes(1);
      expect(cache.set).toHaveBeenCalledWith(
        'rec:trending:7d',
        expect.objectContaining({
          items: trendingRows,
          generatedAt: expect.any(String),
        }),
        expect.any(Number),
      );
    });
  });

  describe('CleanupOldEventsUseCase', () => {
    it('deletes user_behavior_events older than 90 days in batches', async () => {
      const cache = createMockCache(true);
      const repo: any = {
        deleteBehaviorEventsOlderThanDaysBatched: jest
          .fn()
          .mockResolvedValue(1250),
      };

      const useCase = new CleanupOldEventsUseCase(repo, cache as any);
      const res = await useCase.execute();

      expect(res.skipped).toBe(false);
      expect(res.deletedCount).toBe(1250);
      expect(
        repo.deleteBehaviorEventsOlderThanDaysBatched,
      ).toHaveBeenCalledWith(90, expect.any(Number));
    });
  });

  describe('RecommendationRepository batchVersion cleanup', () => {
    it('executes bulk UNNEST upsert and deletes stale batch_version rows inside a single transaction', async () => {
      const executeRaw = jest
        .fn()
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);
      const prismaMock: any = {
        $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) =>
          cb({ $executeRaw: executeRaw }),
        ),
      };

      const repo = new RecommendationRepository(prismaMock);
      const batchVersion = '22222222-2222-4222-8222-222222222222';
      const result = await repo.replaceProductRecommendationsByType(
        RecommendationType.SIMILAR_CONTENT,
        batchVersion,
        [
          {
            sourceProductId: '11111111-1111-4111-8111-111111111111',
            targetProductId: '33333333-3333-4333-8333-333333333333',
            score: 0.85,
            reason: 'Cùng chứa Vitamin B5',
          },
          {
            sourceProductId: '11111111-1111-4111-8111-111111111111',
            targetProductId: '44444444-4444-4444-8444-444444444444',
            score: 0.72,
            reason: 'Cùng danh mục chăm sóc',
          },
        ],
      );

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(executeRaw).toHaveBeenCalledTimes(2);
      const upsertSql = executeRaw.mock.calls[0][0].join(' ');
      const deleteSql = executeRaw.mock.calls[1][0].join(' ');
      expect(upsertSql).toContain('FROM UNNEST');
      expect(upsertSql).toContain('ON CONFLICT (source_product_id, target_product_id, type)');
      expect(deleteSql).toContain('DELETE FROM product_recommendations');
      expect(deleteSql).toContain('batch_version <>');
      expect(result).toEqual({ upsertedCount: 2, deletedStaleCount: 3 });
    });
  });
});
