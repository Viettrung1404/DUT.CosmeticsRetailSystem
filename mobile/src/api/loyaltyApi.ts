import apiClient from './apiClient';

export const loyaltyApi = {
  // Lấy thông tin điểm thưởng và hạng thành viên
  getLoyaltyProfile: async () => {
    const response = await apiClient.get('/customers/me/loyalty');
    return response.data;
  },

  // Lấy danh sách ưu đãi / voucher có thể đổi bằng điểm
  getLoyaltyRewards: async () => {
    const response = await apiClient.get('/customers/me/loyalty/rewards');
    return response.data;
  },

  // Đổi voucher ưu đãi bằng điểm tích luỹ
  redeemReward: async (rewardId: string) => {
    const response = await apiClient.post('/customers/me/loyalty/redeem', {
      rewardId,
    });
    return response.data;
  },
};

