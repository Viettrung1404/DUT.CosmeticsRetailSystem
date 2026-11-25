import { Injectable } from '@nestjs/common';
import { RecommendationPlacement } from '@prisma/client';
import { IngredientConflictPolicy } from '../../domain/ingredient-conflict.policy';
import {
  detectRoutineStep,
  findRoutineComplements,
  matchRoutineRule,
} from '../../domain/skincare-routine.rules';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import {
  RankedCandidate,
  RecommendationRepository,
} from '../../infrastructure/recommendation.repository';
import { RecommendationServingResult } from './get-home-recommendations.use-case';

export interface GetCartRecommendationsInput {
  customerId: string | null;
  productIds: string[];
  limit?: number;
}

@Injectable()
export class GetCartRecommendationsUseCase {
  private readonly conflictPolicy = new IngredientConflictPolicy();

  constructor(
    private readonly repository: RecommendationRepository,
    // Giữ lại dependency cache để đồng nhất DI & mở rộng caching giỏ hàng nếu cần
    private readonly _cache: RecommendationCacheService,
  ) {}

  async execute(
    input: GetCartRecommendationsInput,
  ): Promise<RecommendationServingResult> {
    const limit = Math.min(Math.max(input.limit ?? 8, 1), 24);

    const cartContext = await this.repository.findCartContextForCustomerOrIds(
      input.customerId,
      input.productIds,
    );

    const cartProductIdSet = new Set(cartContext.cartProductIds);
    const cartIngredientKeys = Array.from(
      new Set(
        cartContext.cartProducts.flatMap((p) => p.normalizedIngredients),
      ),
    );
    const presentSteps = new Set(
      cartContext.cartProducts
        .map((p) => detectRoutineStep(`${p.categoryName} ${p.name}`))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    );
    const missingTargetSteps = new Set<string>();
    for (const p of cartContext.cartProducts) {
      for (const rule of findRoutineComplements(`${p.categoryName} ${p.name}`)) {
        if (!presentSteps.has(rule.targetStep)) {
          missingTargetSteps.add(rule.targetStep);
        }
      }
    }

    const rawCandidates = await this.repository.findRoutineCandidateProducts(
      cartContext.cartProductIds,
      60,
    );

    const scoredCandidates: RankedCandidate[] = [];
    for (const candidate of rawCandidates) {
      // Tuyệt đối loại bỏ sản phẩm đã nằm trong giỏ hàng
      if (cartProductIdSet.has(candidate.id)) {
        continue;
      }

      const conflictResult = this.conflictPolicy.evaluate({
        cartIngredientKeys,
        candidateIngredientKeys: candidate.normalizedIngredients,
        customerSkinTags: cartContext.customerSkinTags,
        avoidedTags: cartContext.avoidedTags,
      });

      if (conflictResult.excluded) {
        continue;
      }

      const candidateLabel = `${candidate.categoryName} ${candidate.name}`;
      const candidateStep = detectRoutineStep(candidateLabel);
      let routineMultiplier = 1.0;
      let routineReason: string | null = null;

      if (candidateStep && missingTargetSteps.has(candidateStep)) {
        routineMultiplier = 1.3;
        for (const cartProd of cartContext.cartProducts) {
          const matchedRule = matchRoutineRule(
            `${cartProd.categoryName} ${cartProd.name}`,
            candidateLabel,
          );
          if (matchedRule) {
            routineReason = matchedRule.reason;
            break;
          }
        }
      }

      const finalScore = Number(
        (
          candidate.baseScore *
          conflictResult.penaltyMultiplier *
          routineMultiplier
        ).toFixed(4),
      );

      const reason =
        conflictResult.reason ??
        routineReason ??
        (cartContext.cartProducts.length
          ? 'Hoàn thiện chu trình chăm sóc da cùng giỏ hàng'
          : 'Sản phẩm nhỏ gọn dễ mua kèm');

      scoredCandidates.push({
        productId: candidate.id,
        score: finalScore,
        reason,
      });
    }

    scoredCandidates.sort((a, b) => b.score - a.score);

    const hydrated = await this.repository.filterAndHydrateEligibleProducts(
      scoredCandidates.slice(0, limit * 2),
      RecommendationPlacement.CART_ROUTINE,
    );

    return {
      placement: RecommendationPlacement.CART_ROUTINE,
      attributionSource: 'rec_cart',
      items: hydrated.slice(0, limit).map((item) => {
        const { tryOnColorHexes: _omit, ...clean } = item;
        return clean;
      }),
    };
  }
}
