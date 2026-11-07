export const LOYALTY_SETTINGS_REPOSITORY = Symbol('ILoyaltySettingsRepository');

export interface LoyaltyTierView {
  id: string;
  name: string;
  minPoints: number;
  discountPercentage: number;
  pointMultiplier: number;
  benefits: unknown;
}

export interface LoyaltyTierPatch {
  name?: string;
  minPoints?: number;
  discountPercentage?: number;
  pointMultiplier?: number;
  benefits?: unknown;
}

export interface ILoyaltySettingsRepository {
  getConfig(): Promise<Record<string, unknown>>;
  findTiers(): Promise<LoyaltyTierView[]>;
  // Gộp khóa mới vào settings.loyalty_config (giữ khóa khác của Trung) + audit trong cùng giao dịch
  updateConfig(patch: Record<string, unknown>, actorId: string): Promise<Record<string, unknown>>;
  updateTier(id: string, patch: LoyaltyTierPatch, actorId: string): Promise<LoyaltyTierView>;
}
