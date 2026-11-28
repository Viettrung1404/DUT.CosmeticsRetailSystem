import { Injectable, Logger } from '@nestjs/common';
import { RecommendationType } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  findRoutineComplements,
  matchRoutineRule,
} from '../../domain/skincare-routine.rules';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import {
  ProductRecommendationInsertRow,
  ProductRoutineCatalogItem,
  RecommendationRepository,
} from '../../infrastructure/recommendation.repository';

export interface RecomputeBoughtTogetherResult {
  skipped: boolean;
  batchVersion?: string;
  empiricalPairs?: number;
  routineFallbackPairs?: number;
  upsertedCount?: number;
  deletedStaleCount?: number;
}

const JOB_LOCK_TTL_SECONDS = 600;
const TOP_K_PER_PRODUCT = 12;

@Injectable()
export class RecomputeBoughtTogetherUseCase {
  private readonly logger = new Logger(RecomputeBoughtTogetherUseCase.name);

  constructor(
    private readonly repository: RecommendationRepository,
    private readonly cache: RecommendationCacheService,
  ) {}

  async execute(): Promise<RecomputeBoughtTogetherResult> {
    const locked = await this.cache.withJobLock(
      'bought-together',
      JOB_LOCK_TTL_SECONDS,
      async () => {
        const minSupport = Number(
          process.env.REC_BOUGHT_TOGETHER_MIN_SUPPORT ?? 3,
        );
        const safeMinSupport =
          Number.isFinite(minSupport) && minSupport > 0 ? minSupport : 3;

        const [empiricalPairs, catalog] = await Promise.all([
          this.repository.computeBoughtTogetherPairsFromOrders(safeMinSupport),
          this.repository.findActiveProductRoutineCatalog(),
        ]);

        const catalogById = new Map(catalog.map((item) => [item.id, item]));
        const grouped = new Map<string, ProductRecommendationInsertRow[]>();
        const seenPairKeys = new Set<string>();

        for (const pair of empiricalPairs) {
          const pairKey = `${pair.sourceProductId}:${pair.targetProductId}`;
          seenPairKeys.add(pairKey);

          const sourceItem = catalogById.get(pair.sourceProductId);
          const targetItem = catalogById.get(pair.targetProductId);
          const routineRule =
            sourceItem && targetItem
              ? matchRoutineRule(
                  `${sourceItem.categoryName} ${sourceItem.name}`,
                  `${targetItem.categoryName} ${targetItem.name}`,
                )
              : null;

          const reason =
            routineRule?.reason ??
            `Thường được mua cùng (${pair.coOrderCount} đơn hàng)`;

          const list = grouped.get(pair.sourceProductId) ?? [];
          list.push({
            sourceProductId: pair.sourceProductId,
            targetProductId: pair.targetProductId,
            score: Number(pair.liftScore.toFixed(4)),
            reason: reason.slice(0, 255),
          });
          grouped.set(pair.sourceProductId, list);
        }

        // Bổ sung gợi ý chu trình Skincare/Makeup cho các sản phẩm chưa đủ Top 12 (cold-start)
        const routineFallbackPairs = this.appendRoutineFallbacks(
          catalog,
          grouped,
          seenPairKeys,
        );

        const rows: ProductRecommendationInsertRow[] = [];
        for (const list of grouped.values()) {
          list.sort((a, b) => b.score - a.score);
          rows.push(...list.slice(0, TOP_K_PER_PRODUCT));
        }

        const batchVersion = randomUUID();
        const { upsertedCount, deletedStaleCount } =
          await this.repository.replaceProductRecommendationsByType(
            RecommendationType.BOUGHT_TOGETHER,
            batchVersion,
            rows,
          );

        this.logger.log(
          `Recomputed BOUGHT_TOGETHER (batch=${batchVersion}): empirical=${empiricalPairs.length}, routineFallback=${routineFallbackPairs}, upserted=${upsertedCount}, deletedStale=${deletedStaleCount}`,
        );

        return {
          batchVersion,
          empiricalPairs: empiricalPairs.length,
          routineFallbackPairs,
          upsertedCount,
          deletedStaleCount,
        };
      },
    );

    if (!locked.acquired) {
      return { skipped: true };
    }

    return {
      skipped: false,
      ...locked.result,
    };
  }

  private appendRoutineFallbacks(
    catalog: readonly ProductRoutineCatalogItem[],
    grouped: Map<string, ProductRecommendationInsertRow[]>,
    seenPairKeys: Set<string>,
  ): number {
    let addedCount = 0;

    for (const source of catalog) {
      const existing = grouped.get(source.id) ?? [];
      if (existing.length >= TOP_K_PER_PRODUCT) {
        continue;
      }

      const sourceLabel = `${source.categoryName} ${source.name}`;
      const complementRules = findRoutineComplements(sourceLabel);
      if (!complementRules.length) {
        continue;
      }

      for (const target of catalog) {
        if (existing.length >= TOP_K_PER_PRODUCT) break;
        if (target.id === source.id) continue;

        const pairKey = `${source.id}:${target.id}`;
        if (seenPairKeys.has(pairKey)) continue;

        const matched = matchRoutineRule(
          sourceLabel,
          `${target.categoryName} ${target.name}`,
        );
        if (!matched) continue;

        seenPairKeys.add(pairKey);
        existing.push({
          sourceProductId: source.id,
          targetProductId: target.id,
          score: Number((0.35 * matched.priority).toFixed(4)),
          reason: matched.reason,
        });
        addedCount += 1;
      }

      if (existing.length) {
        grouped.set(source.id, existing);
      }
    }

    return addedCount;
  }
}
