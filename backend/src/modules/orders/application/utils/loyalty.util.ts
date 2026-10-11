export interface TierRule {
  id: string;
  name: string;
  minPoints: number;
}

// FR-08.04: points = total_amount × point_rate × hệ số nhân của hạng, làm tròn xuống
export const calculateEarnedPoints = (
  totalAmount: number,
  pointRate: number,
  multiplier: number,
): number => Math.max(Math.floor(totalAmount * pointRate * multiplier), 0);

export const resolveTier = (tiers: TierRule[], totalPoints: number): TierRule | null =>
  tiers
    .filter((t) => t.minPoints <= totalPoints)
    .reduce<TierRule | null>((best, t) => (!best || t.minPoints > best.minPoints ? t : best), null);

// FR-11.06: amount = total_amount × commission_rate / 100, làm tròn tới đồng
export const calculateCommission = (totalAmount: number, ratePercent: number): number =>
  Math.round((totalAmount * ratePercent) / 100);

export const readPointRate = (settingValue: unknown): number | null => {
  const rate = (settingValue as { point_rate?: unknown } | null)?.point_rate;
  return typeof rate === 'number' && rate > 0 ? rate : null;
};
