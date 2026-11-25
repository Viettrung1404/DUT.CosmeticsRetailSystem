import { BehaviorEventType } from '@prisma/client';

/**
 * Trọng số cơ sở theo loại hành vi và hằng số suy giảm theo thời gian (Time Decay).
 * EffectiveScore(e) = w_type * exp(-0.05 * deltaDays)
 */
export const BEHAVIOR_TIME_DECAY_LAMBDA = 0.05;

export const CLIENT_ALLOWED_BEHAVIOR_EVENT_TYPES = [
  BehaviorEventType.VIEW_PRODUCT,
  BehaviorEventType.SEARCH_QUERY,
  BehaviorEventType.SEARCH_CLICK,
  BehaviorEventType.TRY_ON_COLOR,
  BehaviorEventType.ADD_TO_WISHLIST,
] as const;

export type ClientAllowedBehaviorEventType =
  (typeof CLIENT_ALLOWED_BEHAVIOR_EVENT_TYPES)[number];

const CLIENT_ALLOWED_SET = new Set<BehaviorEventType>(
  CLIENT_ALLOWED_BEHAVIOR_EVENT_TYPES,
);

export const BEHAVIOR_BASE_WEIGHTS: Record<BehaviorEventType, number> = {
  [BehaviorEventType.VIEW_PRODUCT]: 1.0,
  [BehaviorEventType.SEARCH_QUERY]: 0.5,
  [BehaviorEventType.SEARCH_CLICK]: 2.0,
  [BehaviorEventType.TRY_ON_COLOR]: 2.5,
  [BehaviorEventType.ADD_TO_WISHLIST]: 3.5,
  [BehaviorEventType.ADD_TO_CART]: 5.0,
  [BehaviorEventType.PURCHASE]: 10.0,
};

export class BehaviorWeightPolicy {
  static getBaseWeight(eventType: BehaviorEventType): number {
    return BEHAVIOR_BASE_WEIGHTS[eventType] ?? 1.0;
  }

  static isClientAllowed(
    eventType: BehaviorEventType | string,
  ): eventType is ClientAllowedBehaviorEventType {
    return CLIENT_ALLOWED_SET.has(eventType as BehaviorEventType);
  }

  static computeDecayedScore(
    eventType: BehaviorEventType,
    deltaDays: number,
    lambda = BEHAVIOR_TIME_DECAY_LAMBDA,
  ): number {
    const baseWeight = BehaviorWeightPolicy.getBaseWeight(eventType);
    const safeAgeDays = Math.max(0, deltaDays);
    return baseWeight * Math.exp(-lambda * safeAgeDays);
  }

  static computeEffectiveScore(
    eventType: BehaviorEventType,
    occurredAt: Date,
    now = new Date(),
    lambda = BEHAVIOR_TIME_DECAY_LAMBDA,
  ): number {
    const deltaDays = Math.max(
      0,
      (now.getTime() - occurredAt.getTime()) / 86_400_000,
    );
    return BehaviorWeightPolicy.computeDecayedScore(eventType, deltaDays, lambda);
  }
}

export function getBehaviorBaseWeight(eventType: BehaviorEventType): number {
  return BehaviorWeightPolicy.getBaseWeight(eventType);
}

export function computeDecayedBehaviorScore(
  baseWeight: number,
  ageDays: number,
  lambda = BEHAVIOR_TIME_DECAY_LAMBDA,
): number {
  const safeAge = Math.max(0, ageDays);
  return baseWeight * Math.exp(-lambda * safeAge);
}
