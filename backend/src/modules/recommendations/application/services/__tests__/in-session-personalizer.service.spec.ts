import { RecommendationType } from '@prisma/client';
import { InSessionPersonalizerService } from '../in-session-personalizer.service';

describe('InSessionPersonalizerService', () => {
  it('takes at most 5 recentIds, reads cached SIMILAR_CONTENT, and merges with co-occurrence boost', async () => {
    const recentIds = [
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-000000000005',
      '00000000-0000-4000-8000-000000000006', // 6th must be ignored
    ];

    const cache = {
      remember: jest.fn(async (key: string, loader: () => Promise<any>) =>
        loader(),
      ),
    };

    const repository = {
      findPrecomputedRecommendations: jest.fn(async (id: string) => {
        if (id === recentIds[0]) {
          return [
            { productId: 'target-shared', score: 0.7, reason: 'Cùng chứa B5' },
            { productId: 'target-only-1', score: 0.8, reason: 'Cùng danh mục' },
          ];
        }
        if (id === recentIds[1]) {
          return [
            { productId: 'target-shared', score: 0.75, reason: 'Cùng chứa B5' },
            { productId: recentIds[0], score: 0.9, reason: 'Should be excluded' },
          ];
        }
        return [];
      }),
    };

    const service = new InSessionPersonalizerService(
      repository as any,
      cache as any,
    );

    const results = await service.getInSessionCandidates(recentIds, 5);

    expect(cache.remember).toHaveBeenCalledTimes(5);
    expect(cache.remember).toHaveBeenCalledWith(
      `rec:similar:${recentIds[0]}`,
      expect.any(Function),
      expect.objectContaining({ l1TtlMs: 60_000, l2TtlMs: 600_000 }),
    );
    expect(repository.findPrecomputedRecommendations).not.toHaveBeenCalledWith(
      recentIds[5],
      RecommendationType.SIMILAR_CONTENT,
      expect.any(Number),
    );
    // Excluded recent product itself
    expect(results.some((r) => r.productId === recentIds[0])).toBe(false);
    // target-shared appears in 2 recentIds -> co-occurrence boost pushes it above target-only-1
    expect(results[0].productId).toBe('target-shared');
  });

  it('gracefully falls back to DB when cache.remember throws unexpectedly', async () => {
    const id1 = '00000000-0000-4000-8000-000000000001';
    const cache = {
      remember: jest.fn().mockRejectedValue(new Error('Upstash ECONNRESET')),
    };
    const repository = {
      findPrecomputedRecommendations: jest
        .fn()
        .mockResolvedValue([
          { productId: 'target-db', score: 0.82, reason: 'Fallback DB' },
        ]),
    };

    const service = new InSessionPersonalizerService(
      repository as any,
      cache as any,
    );
    const results = await service.getInSessionCandidates([id1], 5);

    expect(results).toHaveLength(1);
    expect(results[0].productId).toBe('target-db');
  });
});
