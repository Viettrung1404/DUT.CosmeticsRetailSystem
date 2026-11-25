import { Injectable, Logger } from '@nestjs/common';
import { BEHAVIOR_TIME_DECAY_LAMBDA } from '../../domain/behavior-weight.policy';
import {
  extractNormalizedIngredientsFromText,
  stripVietnameseDiacritics,
} from '../../domain/ingredient-normalizer.util';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import {
  CustomerAffinityInput,
  RecommendationRepository,
  UpsertUserAffinityProfileInput,
} from '../../infrastructure/recommendation.repository';

export interface RecomputeUserAffinitiesResult {
  skipped: boolean;
  customersScanned?: number;
  customersUpdated?: number;
}

const JOB_LOCK_TTL_SECONDS = 600;
const LOOKBACK_HOURS = 24;

@Injectable()
export class RecomputeUserAffinitiesUseCase {
  private readonly logger = new Logger(RecomputeUserAffinitiesUseCase.name);

  constructor(
    private readonly repository: RecommendationRepository,
    private readonly cache: RecommendationCacheService,
  ) {}

  async execute(): Promise<RecomputeUserAffinitiesResult> {
    const locked = await this.cache.withJobLock(
      'affinities',
      JOB_LOCK_TTL_SECONDS,
      async () => {
        const customerIds =
          await this.repository.findCustomerIdsWithRecentActivity(
            LOOKBACK_HOURS,
          );

        if (!customerIds.length) {
          return {
            customersScanned: 0,
            customersUpdated: 0,
          };
        }

        const inputs =
          await this.repository.findCustomerAffinityInputs(customerIds);
        const now = new Date();
        const profiles = inputs.map((input) =>
          this.buildAffinityProfile(input, now),
        );

        const customersUpdated =
          await this.repository.upsertUserAffinityProfiles(profiles);

        this.logger.log(
          `Recomputed incremental user affinities (window=${LOOKBACK_HOURS}h): scanned=${customerIds.length}, updated=${customersUpdated}`,
        );

        return {
          customersScanned: customerIds.length,
          customersUpdated,
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

  private buildAffinityProfile(
    input: CustomerAffinityInput,
    now: Date,
  ): UpsertUserAffinityProfileInput {
    const categoryScores = new Map<string, number>();
    const brandScores = new Map<string, number>();
    const tagScores = new Map<string, number>();

    let weightedPriceSum = 0;
    let priceWeightTotal = 0;
    let minObservedPrice = Number.POSITIVE_INFINITY;
    let maxObservedPrice = 0;

    for (const ev of input.events) {
      const ageDays = Math.max(
        0,
        (now.getTime() - ev.createdAt.getTime()) / 86_400_000,
      );
      const decayedScore =
        Math.max(0.1, ev.weight) *
        Math.exp(-BEHAVIOR_TIME_DECAY_LAMBDA * ageDays);

      if (ev.categoryId) {
        categoryScores.set(
          ev.categoryId,
          (categoryScores.get(ev.categoryId) ?? 0) + decayedScore,
        );
      }

      if (ev.brandId) {
        brandScores.set(
          ev.brandId,
          (brandScores.get(ev.brandId) ?? 0) + decayedScore,
        );
      }

      for (const ing of ev.normalizedIngredients) {
        tagScores.set(ing, (tagScores.get(ing) ?? 0) + decayedScore);
      }
      for (const tag of ev.productTags) {
        tagScores.set(tag, (tagScores.get(tag) ?? 0) + decayedScore);
      }

      if (ev.effectivePrice !== null && ev.effectivePrice > 0) {
        weightedPriceSum += ev.effectivePrice * decayedScore;
        priceWeightTotal += decayedScore;
        minObservedPrice = Math.min(minObservedPrice, ev.effectivePrice);
        maxObservedPrice = Math.max(maxObservedPrice, ev.effectivePrice);
      }
    }

    for (const query of input.searchQueries) {
      const extracted = extractNormalizedIngredientsFromText(query);
      for (const key of extracted) {
        tagScores.set(key, (tagScores.get(key) ?? 0) + 1.5);
      }
    }

    const topCategories = Array.from(categoryScores.entries())
      .map(([categoryId, score]) => ({
        categoryId,
        score: Number(score.toFixed(4)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const topBrands = Array.from(brandScores.entries())
      .map(([brandId, score]) => ({
        brandId,
        score: Number(score.toFixed(4)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const preferredTags = Array.from(tagScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);

    const avoidedTags = this.deriveAvoidedTags(input.customerTags);

    const avgPriceRange =
      priceWeightTotal > 0
        ? {
            min: Math.round(minObservedPrice),
            max: Math.round(maxObservedPrice),
            avg: Math.round(weightedPriceSum / priceWeightTotal),
          }
        : null;

    return {
      customerId: input.customerId,
      topCategories,
      topBrands,
      preferredTags,
      avoidedTags,
      avgPriceRange,
    };
  }

  private deriveAvoidedTags(customerTags: readonly string[]): string[] {
    const avoided = new Set<string>();

    for (const rawTag of customerTags) {
      const tag = stripVietnameseDiacritics(rawTag);
      if (!tag) continue;

      if (
        tag === 'da-nhay-cam' ||
        tag === 'da nhay cam' ||
        tag === 'sensitive'
      ) {
        avoided.add('drying_alcohol');
        avoided.add('fragrance');
      }

      if (tag === 'da-kho' || tag === 'da kho' || tag === 'dry') {
        avoided.add('drying_alcohol');
      }

      if (tag.startsWith('avoid:')) {
        const key = tag.slice('avoid:'.length).trim();
        if (key) avoided.add(key);
      } else if (tag.startsWith('tranh-')) {
        const key = tag.slice('tranh-'.length).trim();
        if (key) avoided.add(key);
      }
    }

    return Array.from(avoided);
  }
}
