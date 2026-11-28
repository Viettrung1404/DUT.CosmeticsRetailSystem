import {
  buildProductEmbeddingText,
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  formatHalfvecLiteral,
} from '../../../domain/product-embedding-text.util';
import { EmbeddingClientService } from '../../../infrastructure/embedding-client.service';
import { SyncProductEmbeddingsUseCase } from '../sync-product-embeddings.use-case';
import { RecomputeSimilarProductsUseCase } from '../recompute-similar-products.use-case';
import { SemanticSearchProductsUseCase } from '../semantic-search-products.use-case';
import { RecommendationPlacement } from '@prisma/client';

function makeVector(seed: number): number[] {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) =>
    Number(((seed + (i % 7) * 0.01) / 10).toFixed(6)),
  );
}

describe('Phase 4 AI Semantic Similarity & Embeddings', () => {
  describe('product-embedding-text.util', () => {
    it('formats Vietnamese canonical product text cleanly for @cf/baai/bge-m3', () => {
      const text = buildProductEmbeddingText({
        name: 'Serum <b>Vitamin B5</b>',
        categoryName: 'Serum phục hồi',
        brandName: 'La Roche-Posay',
        ingredients: ['Panthenol', 'Madecassoside'],
        specifications: { skinType: ['da-nhay-cam', 'da-dau'], dungTich: '30ml' },
        howToUse: '<p>Thoa 2-3 giọt sau toner</p>',
      });

      expect(text).toBe(
        'Serum Vitamin B5 | Serum phục hồi | La Roche-Posay | Thành phần: Panthenol, Madecassoside | Đặc tính: skinType: da-nhay-cam, da-dau, dungTich: 30ml | Cách dùng: Thoa 2-3 giọt sau toner',
      );
      expect(formatHalfvecLiteral(makeVector(1))).toMatch(/^\[[0-9.,-]+\]$/);
    });
  });

  describe('EmbeddingClientService', () => {
    afterEach(() => {
      viRestoreFetch();
    });

    function viRestoreFetch() {
      jest.restoreAllMocks();
    }

    it('retries on transient 429/5xx and enforces daily free-tier neuron budget', async () => {
      const configMock = {
        get: jest.fn((key: string) => {
          const map: Record<string, string> = {
            CF_ACCOUNT_ID: 'cf-acc-1',
            CF_AI_API_TOKEN: 'cf-token-1',
            CF_AI_MAX_NEURONS_PER_DAY: '50',
          };
          return map[key];
        }),
      };

      const fetchSpy = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(null, { status: 429, headers: { 'retry-after': '0' } }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: true,
              result: { data: [makeVector(1), makeVector(2)] },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );

      const client = new EmbeddingClientService(configMock as any);
      jest.spyOn(client as any, 'sleep').mockResolvedValue(undefined);

      const vectors = await client.embedTexts(['prod 1', 'prod 2']);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(vectors).toHaveLength(2);
      expect(vectors[0]).toHaveLength(1024);

      // Budget is 50 neurons, already used 2*15 = 30 -> next 2 items (30) must be blocked safely
      await expect(client.embedTexts(['prod 3', 'prod 4'])).rejects.toThrow(
        /budget/i,
      );
    });
  });

  describe('SyncProductEmbeddingsUseCase', () => {
    it('only embeds products with missing or outdated embeddings in batches of 20 under Distributed Lock', async () => {
      const cache = {
        withJobLock: jest.fn(async (_name, _ttl, task) => ({
          acquired: true as const,
          result: await task(),
        })),
      };
      const embeddingClient = {
        isConfigured: jest.fn().mockReturnValue(true),
        getModelName: jest.fn().mockReturnValue(DEFAULT_EMBEDDING_MODEL),
        hasRemainingDailyBudget: jest.fn().mockReturnValue(true),
        embedTexts: jest
          .fn()
          .mockResolvedValue([makeVector(1), makeVector(2)]),
      };
      const repository = {
        findProductsNeedingEmbedding: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'p-null-embed',
              name: 'Serum B5',
              categoryName: 'Serum',
              brandName: 'LRP',
              ingredients: ['Panthenol'],
              specifications: null,
              howToUse: 'Thoa mỗi tối',
            },
            {
              id: 'p-stale-embed',
              name: 'Kem chống nắng',
              categoryName: 'Chống nắng',
              brandName: 'Anessa',
              ingredients: ['Zinc Oxide'],
              specifications: null,
              howToUse: 'Thoa trước khi ra nắng',
            },
          ])
          .mockResolvedValueOnce([]),
        saveProductEmbeddings: jest.fn().mockResolvedValue(2),
      };

      const useCase = new SyncProductEmbeddingsUseCase(
        repository as any,
        cache as any,
        embeddingClient as any,
      );

      const res = await useCase.execute();

      expect(res.skipped).toBe(false);
      expect(res.processed).toBe(2);
      expect(cache.withJobLock).toHaveBeenCalledWith(
        'sync-embeddings',
        600,
        expect.any(Function),
      );
      expect(repository.findProductsNeedingEmbedding).toHaveBeenCalledWith(
        DEFAULT_EMBEDDING_MODEL,
        20,
      );
      expect(embeddingClient.embedTexts).toHaveBeenCalledTimes(1);
      expect(repository.saveProductEmbeddings).toHaveBeenCalledWith(
        DEFAULT_EMBEDDING_MODEL,
        expect.arrayContaining([
          expect.objectContaining({ productId: 'p-null-embed' }),
          expect.objectContaining({ productId: 'p-stale-embed' }),
        ]),
      );
    });
  });

  describe('RecomputeSimilarProductsUseCase (Hybrid 60/40 + Fallback)', () => {
    it('combines 60% vector similarity + 40% metadata score when embeddings exist, and falls back to 100% content-based when missing', async () => {
      const cache = {
        withJobLock: jest.fn(async (_name, _ttl, task) => ({
          acquired: true as const,
          result: await task(),
        })),
      };

      const p1 = '11111111-1111-4111-8111-111111111111';
      const p2 = '22222222-2222-4222-8222-222222222222';
      const p3 = '33333333-3333-4333-8333-333333333333';

      const repository = {
        findActiveProductsForSimilarity: jest.fn().mockResolvedValue([
          {
            id: p1,
            name: 'Serum B5',
            categoryId: 'cat-1',
            brandId: 'brand-1',
            effectivePrice: 400000,
            howToUse: '',
            specifications: null,
            ingredients: ['Panthenol'],
            keyIngredients: ['Panthenol'],
            tags: ['phuc-hoi'],
            tryOnColorHexes: [],
          },
          {
            id: p2,
            name: 'Kem B5 (có embedding)',
            categoryId: 'cat-1',
            brandId: 'brand-1',
            effectivePrice: 400000,
            howToUse: '',
            specifications: null,
            ingredients: ['Panthenol'],
            keyIngredients: ['Panthenol'],
            tags: ['phuc-hoi'],
            tryOnColorHexes: [],
          },
          {
            id: p3,
            name: 'Gel B5 (chưa có embedding)',
            categoryId: 'cat-1',
            brandId: 'brand-1',
            effectivePrice: 400000,
            howToUse: '',
            specifications: null,
            ingredients: ['Panthenol'],
            keyIngredients: ['Panthenol'],
            tags: ['phuc-hoi'],
            tryOnColorHexes: [],
          },
        ]),
        queryVectorSimilarityPairs: jest.fn().mockResolvedValue(
          new Map([[p1, new Map([[p2, 0.5]])]]), // vectorSim = 0.5, metadata = 1.0 -> hybrid = 0.6*0.5 + 0.4*1.0 = 0.7
        ),
        replaceProductRecommendationsByType: jest
          .fn()
          .mockResolvedValue({ upsertedCount: 6, deletedStaleCount: 0 }),
      };

      const useCase = new RecomputeSimilarProductsUseCase(
        repository as any,
        cache as any,
      );
      const res = await useCase.execute();

      expect(res.skipped).toBe(false);
      const insertedRows =
        repository.replaceProductRecommendationsByType.mock.calls[0][2];

      const rowP1ToP2 = insertedRows.find(
        (r: any) => r.sourceProductId === p1 && r.targetProductId === p2,
      );
      const rowP1ToP3 = insertedRows.find(
        (r: any) => r.sourceProductId === p1 && r.targetProductId === p3,
      );

      // 60% * 0.5 + 40% * 1.0 = 0.7000
      expect(rowP1ToP2.score).toBeCloseTo(0.7, 3);
      // Fallback 100% metadata when no embedding pair exists -> 1.0000
      expect(rowP1ToP3.score).toBeCloseTo(1.0, 3);
    });
  });

  describe('SemanticSearchProductsUseCase', () => {
    it('embeds natural Vietnamese query, searches halfvec cosine similarity, and runs stock/shelf-life post-filter', async () => {
      const pVector = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const cache = {
        remember: jest.fn(async (_k, loader) => loader()),
      };
      const embeddingClient = {
        isConfigured: jest.fn().mockReturnValue(true),
        embedQuery: jest.fn().mockResolvedValue(makeVector(3)),
      };
      const repository = {
        querySemanticSearchCandidates: jest.fn().mockResolvedValue([
          {
            productId: pVector,
            score: 0.91,
            reason: 'Phù hợp ngữ nghĩa với nhu cầu tìm kiếm',
          },
        ]),
        queryKeywordFallbackSearchCandidates: jest.fn().mockResolvedValue([]),
        filterAndHydrateEligibleProducts: jest.fn(async (candidates) =>
          candidates.map((c: any) => ({
            id: c.productId,
            name: 'Serum BHA Giảm Mụn Kiềm Dầu',
            slug: 'serum-bha',
            basePrice: 380000,
            salePrice: null,
            displayPrice: 380000,
            imageUrl: null,
            brand: null,
            avgRating: 4.9,
            totalSold: 90,
            reason: c.reason,
            score: c.score,
            placement: RecommendationPlacement.HOME,
          })),
        ),
      };

      const useCase = new SemanticSearchProductsUseCase(
        repository as any,
        cache as any,
        embeddingClient as any,
      );

      const res = await useCase.execute({
        query: 'serum kiềm dầu cho da mụn nhạy cảm',
        limit: 8,
      });

      expect(embeddingClient.embedQuery).toHaveBeenCalledWith(
        'serum kiềm dầu cho da mụn nhạy cảm',
      );
      expect(repository.querySemanticSearchCandidates).toHaveBeenCalledTimes(1);
      expect(repository.filterAndHydrateEligibleProducts).toHaveBeenCalledTimes(
        1,
      );
      expect(res.items[0].id).toBe(pVector);
      expect(res.mode).toBe('SEMANTIC_VECTOR');
    });
  });
});
