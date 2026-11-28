import { BehaviorEventType } from '@prisma/client';
import {
  BehaviorWeightPolicy,
  CLIENT_ALLOWED_BEHAVIOR_EVENT_TYPES,
} from '../behavior-weight.policy';

describe('BehaviorWeightPolicy', () => {
  it('defines exact base weights for all BehaviorEventType values', () => {
    expect(BehaviorWeightPolicy.getBaseWeight(BehaviorEventType.VIEW_PRODUCT)).toBe(1.0);
    expect(BehaviorWeightPolicy.getBaseWeight(BehaviorEventType.SEARCH_QUERY)).toBe(0.5);
    expect(BehaviorWeightPolicy.getBaseWeight(BehaviorEventType.SEARCH_CLICK)).toBe(2.0);
    expect(BehaviorWeightPolicy.getBaseWeight(BehaviorEventType.TRY_ON_COLOR)).toBe(2.5);
    expect(BehaviorWeightPolicy.getBaseWeight(BehaviorEventType.ADD_TO_WISHLIST)).toBe(3.5);
    expect(BehaviorWeightPolicy.getBaseWeight(BehaviorEventType.ADD_TO_CART)).toBe(5.0);
    expect(BehaviorWeightPolicy.getBaseWeight(BehaviorEventType.PURCHASE)).toBe(10.0);
  });

  it('computes time decay as w * exp(-0.05 * deltaDays)', () => {
    expect(
      BehaviorWeightPolicy.computeDecayedScore(BehaviorEventType.PURCHASE, 0),
    ).toBeCloseTo(10.0, 6);

    expect(
      BehaviorWeightPolicy.computeDecayedScore(BehaviorEventType.PURCHASE, 14),
    ).toBeCloseTo(10.0 * Math.exp(-0.05 * 14), 6);

    // Negative deltaDays is clamped to 0
    expect(
      BehaviorWeightPolicy.computeDecayedScore(BehaviorEventType.ADD_TO_CART, -3),
    ).toBeCloseTo(5.0, 6);

    const occurredAt = new Date('2026-11-11T00:00:00.000Z');
    const now = new Date('2026-11-25T00:00:00.000Z'); // 14 days later
    expect(
      BehaviorWeightPolicy.computeEffectiveScore(
        BehaviorEventType.ADD_TO_WISHLIST,
        occurredAt,
        now,
      ),
    ).toBeCloseTo(3.5 * Math.exp(-0.05 * 14), 6);
  });

  it('whitelists only safe client-side event types and blocks PURCHASE / ADD_TO_CART', () => {
    expect(CLIENT_ALLOWED_BEHAVIOR_EVENT_TYPES).toEqual([
      BehaviorEventType.VIEW_PRODUCT,
      BehaviorEventType.SEARCH_QUERY,
      BehaviorEventType.SEARCH_CLICK,
      BehaviorEventType.TRY_ON_COLOR,
      BehaviorEventType.ADD_TO_WISHLIST,
    ]);
    expect(BehaviorWeightPolicy.isClientAllowed(BehaviorEventType.VIEW_PRODUCT)).toBe(true);
    expect(BehaviorWeightPolicy.isClientAllowed(BehaviorEventType.TRY_ON_COLOR)).toBe(true);
    expect(BehaviorWeightPolicy.isClientAllowed(BehaviorEventType.PURCHASE)).toBe(false);
    expect(BehaviorWeightPolicy.isClientAllowed(BehaviorEventType.ADD_TO_CART)).toBe(false);
  });
});
