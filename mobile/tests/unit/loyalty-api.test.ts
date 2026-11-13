import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import apiClient from '@/api/apiClient';
import { loyaltyApi } from '@/api/loyaltyApi';

describe('loyaltyApi Service (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. getLoyaltyProfile should call GET /customers/me/loyalty', async () => {
    const mockProfile = {
      statusCode: 200,
      success: true,
      data: {
        pointsBalance: 1450,
        tier: 'DIAMOND',
        tierName: 'Diamond Member',
      },
    };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockProfile });

    const res = await loyaltyApi.getLoyaltyProfile();
    expect(apiClient.get).toHaveBeenCalledWith('/customers/me/loyalty');
    expect(res).toEqual(mockProfile);
  });

  it('2. getLoyaltyRewards should call GET /customers/me/loyalty/rewards', async () => {
    const mockRewards = {
      statusCode: 200,
      success: true,
      data: [{ id: 'rew-1', title: 'Voucher 50K', pointsCost: 500 }],
    };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockRewards });

    const res = await loyaltyApi.getLoyaltyRewards();
    expect(apiClient.get).toHaveBeenCalledWith('/customers/me/loyalty/rewards');
    expect(res).toEqual(mockRewards);
  });

  it('3. redeemReward should call POST /customers/me/loyalty/redeem', async () => {
    const mockRedeem = {
      statusCode: 200,
      success: true,
      data: { couponCode: 'GLOW50K-1234', remainingPoints: 950 },
    };
    (apiClient.post as any).mockResolvedValueOnce({ data: mockRedeem });

    const res = await loyaltyApi.redeemReward('rew-1');
    expect(apiClient.post).toHaveBeenCalledWith('/customers/me/loyalty/redeem', {
      rewardId: 'rew-1',
    });
    expect(res).toEqual(mockRedeem);
  });
});

