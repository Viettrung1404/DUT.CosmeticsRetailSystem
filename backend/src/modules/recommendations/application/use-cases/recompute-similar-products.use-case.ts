import { Injectable, Logger } from '@nestjs/common';
import { RecommendationType } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  ContentSimilarityScorer,
  ProductSimilarityFeatures,
} from '../../domain/content-similarity.scorer';
import {
  extractNormalizedIngredientsFromText,
  normalizeIngredientNames,
  stripVietnameseDiacritics,
} from '../../domain/ingredient-normalizer.util';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import {
  ProductRecommendationInsertRow,
  RecommendationRepository,
} from '../../infrastructure/recommendation.repository';

export interface RecomputeSimilarProductsResult {
  skipped: boolean;
  batchVersion?: string;
  productsProcessed?: number;
  vectorPairsCount?: number;
  upsertedCount?: number;
  deletedStaleCount?: number;
}

const JOB_LOCK_TTL_SECONDS = 600;
const TOP_K_SIMILAR = 12;
const VECTOR_WEIGHT = 0.6;
const METADATA_WEIGHT = 0.4;
const MIN_HYBRID_SCORE = 0.15;

@Injectable()
export class RecomputeSimilarProductsUseCase {
  private readonly logger = new Logger(RecomputeSimilarProductsUseCase.name);
  private readonly scorer = new ContentSimilarityScorer();

  constructor(
    private readonly repository: RecommendationRepository,
    private readonly cache: RecommendationCacheService,
  ) {}

  async execute(): Promise<RecomputeSimilarProductsResult> {
    const locked = await this.cache.withJobLock(
      'similar',
      JOB_LOCK_TTL_SECONDS,
      async () => {
        const products =
          await this.repository.findActiveProductsForSimilarity();
        const features = products.map((product) => this.extractFeatures(product));
        const featureById = new Map(features.map((f) => [f.id, f]));

        let vectorPairs = new Map<string, Map<string, number>>();
        if (typeof this.repository.queryVectorSimilarityPairs === 'function') {
          try {
            vectorPairs = await this.repository.queryVectorSimilarityPairs(24);
          } catch (error: any) {
            this.logger.warn(
              `Vector similarity unavailable, falling back to 100% Content-Based Phase 2: ${error?.message ?? 'unknown'}`,
            );
          }
        }

        const contentCandidateGraph =
          this.scorer.generateCandidatePairs(features);

        const rows: ProductRecommendationInsertRow[] = [];
        for (const source of features) {
          const contentTargets = contentCandidateGraph.get(source.id) ?? new Set();
          const vectorTargets = vectorPairs.get(source.id);

          const unionTargetIds = new Set<string>(contentTargets);
          if (vectorTargets) {
            for (const targetId of vectorTargets.keys()) {
              unionTargetIds.add(targetId);
            }
          }

          const scoredTargets: Array<{
            targetProductId: string;
            score: number;
            reason: string;
          }> = [];

          for (const targetId of unionTargetIds) {
            if (targetId === source.id) continue;
            const target = featureById.get(targetId);
            if (!target) continue;

            const metadataResult = this.scorer.scorePair(source, target);
            const vectorSim = vectorTargets?.get(targetId);

            // Hybrid 60% Vector Cosine + 40% Metadata/Price khi có embedding; fallback 100% Content-Based khi chưa có embedding
            const finalScore =
              vectorSim !== undefined
                ? Number(
                    (
                      VECTOR_WEIGHT * vectorSim +
                      METADATA_WEIGHT * metadataResult.score
                    ).toFixed(4),
                  )
                : metadataResult.score;

            if (finalScore < MIN_HYBRID_SCORE) continue;

            const reason =
              metadataResult.reason ??
              (vectorSim !== undefined
                ? 'Tương đồng ngữ nghĩa về công dụng & thành phần'
                : null);

            if (!reason) continue;

            scoredTargets.push({
              targetProductId: targetId,
              score: finalScore,
              reason,
            });
          }

          scoredTargets.sort((a, b) => b.score - a.score);
          for (const item of scoredTargets.slice(0, TOP_K_SIMILAR)) {
            rows.push({
              sourceProductId: source.id,
              targetProductId: item.targetProductId,
              score: item.score,
              reason: item.reason,
            });
          }
        }

        const batchVersion = randomUUID();
        const { upsertedCount, deletedStaleCount } =
          await this.repository.replaceProductRecommendationsByType(
            RecommendationType.SIMILAR_CONTENT,
            batchVersion,
            rows,
          );

        this.logger.log(
          `Recomputed SIMILAR_CONTENT (batch=${batchVersion}): products=${products.length}, vectorSources=${vectorPairs.size}, upserted=${upsertedCount}, deletedStale=${deletedStaleCount}`,
        );

        return {
          batchVersion,
          productsProcessed: products.length,
          vectorPairsCount: vectorPairs.size,
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

  private extractFeatures(
    product: Awaited<
      ReturnType<RecommendationRepository['findActiveProductsForSimilarity']>
    >[number],
  ): ProductSimilarityFeatures {
    const specText =
      product.specifications && typeof product.specifications === 'object'
        ? JSON.stringify(product.specifications)
        : '';

    const normalizedIngredients = Array.from(
      new Set([
        ...normalizeIngredientNames(product.ingredients ?? []),
        ...extractNormalizedIngredientsFromText(product.howToUse),
        ...extractNormalizedIngredientsFromText(specText),
      ]),
    );

    const keyIngredients = normalizeIngredientNames(
      product.keyIngredients ?? [],
    );
    const skinTags = new Set<string>(
      (product.tags ?? []).map(stripVietnameseDiacritics).filter(Boolean),
    );

    const specSkinTokens = this.extractSkinTokensFromSpecs(
      product.specifications,
    );
    for (const token of specSkinTokens) {
      skinTags.add(token);
    }

    return {
      id: product.id,
      categoryId: product.categoryId,
      brandId: product.brandId,
      effectivePrice: product.effectivePrice,
      normalizedIngredients,
      keyIngredients: keyIngredients.length
        ? keyIngredients
        : normalizedIngredients,
      skinTags: Array.from(skinTags),
      tryOnColorHexes: product.tryOnColorHexes,
    };
  }

  private extractSkinTokensFromSpecs(specifications: unknown): string[] {
    if (!specifications || typeof specifications !== 'object') {
      return [];
    }

    const record = specifications as Record<string, unknown>;
    const candidateKeys = [
      'skinType',
      'skin_type',
      'skinTypes',
      'skin_types',
      'skinConcern',
      'skinConcerns',
      'loaiDa',
      'vanDeDa',
    ];

    const tokens: string[] = [];
    for (const key of candidateKeys) {
      const value = record[key];
      if (typeof value === 'string') {
        tokens.push(
          ...value
            .split(/[,;/|]/)
            .map(stripVietnameseDiacritics)
            .filter(Boolean),
        );
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') {
            const clean = stripVietnameseDiacritics(item);
            if (clean) tokens.push(clean);
          }
        }
      }
    }

    return tokens;
  }
}
