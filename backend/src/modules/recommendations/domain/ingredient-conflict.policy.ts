import { stripVietnameseDiacritics } from './ingredient-normalizer.util';

export interface ConflictEvaluationInput {
  cartIngredientKeys: string[];
  candidateIngredientKeys: string[];
  customerSkinTags: string[];
  avoidedTags?: string[];
}

export interface ConflictEvaluationResult {
  excluded: boolean;
  penaltyMultiplier: number;
  reason?: string;
}

const STRONG_TREATMENTS = new Set(['retinoid', 'bha', 'aha', 'benzoyl_peroxide']);
const SOOTHING_BARRIER_ACTIVES = new Set([
  'vitamin_b5',
  'ceramide',
  'centella',
  'hyaluronic_acid',
  'uv_filter',
]);

function normalizeKeySet(values: readonly string[]): Set<string> {
  return new Set(values.map(stripVietnameseDiacritics).filter(Boolean));
}

function hasAny(set: Set<string>, keys: readonly string[]): boolean {
  return keys.some((k) => set.has(k));
}

/**
 * Chính sách lọc xung đột hoạt chất trong giỏ hàng & tương thích loại da theo customer_tags.
 */
export class IngredientConflictPolicy {
  evaluate(input: ConflictEvaluationInput): ConflictEvaluationResult {
    const cartKeys = normalizeKeySet(input.cartIngredientKeys);
    const candidateKeys = normalizeKeySet(input.candidateIngredientKeys);
    const skinTags = normalizeKeySet(input.customerSkinTags);
    const avoidedTags = normalizeKeySet(input.avoidedTags ?? []);

    // 1. Kiểm tra xung đột hoạt chất mạnh trong giỏ hàng
    const conflict = this.checkCartActiveConflict(cartKeys, candidateKeys);
    if (conflict) {
      return conflict;
    }

    let multiplier = 1.0;
    let reason: string | undefined;

    // 2. Loại trừ / phạt theo avoidedTags hồ sơ khách hàng
    for (const avoided of avoidedTags) {
      if (candidateKeys.has(avoided)) {
        multiplier = Math.min(multiplier, 0.35);
        reason = 'Sản phẩm chứa thành phần khách hàng cần hạn chế';
      }
    }

    // 3. Phạt tương thích loại da theo customer_tags (da-nhay-cam, da-kho tránh cồn khô/kiềm dầu gắt)
    const isSensitiveSkin =
      skinTags.has('da-nhay-cam') ||
      skinTags.has('da nhay cam') ||
      skinTags.has('sensitive');
    const isDrySkin =
      skinTags.has('da-kho') || skinTags.has('da kho') || skinTags.has('dry');

    if ((isSensitiveSkin || isDrySkin) && candidateKeys.has('drying_alcohol')) {
      multiplier *= 0.35;
      reason =
        'Cân nhắc vì sản phẩm có chứa cồn khô không tối ưu cho da nhạy cảm hoặc da khô';
    } else if (isSensitiveSkin && candidateKeys.has('fragrance')) {
      multiplier *= 0.65;
      reason = 'Giảm ưu tiên do chứa hương liệu đối với làn da nhạy cảm';
    }

    // 4. Boost phục hồi / dịu da / chống nắng nếu giỏ hàng đang có hoạt chất treatment mạnh
    const cartHasStrongTreatment = Array.from(cartKeys).some((k) =>
      STRONG_TREATMENTS.has(k),
    );
    const candidateHasSoothing = Array.from(candidateKeys).some((k) =>
      SOOTHING_BARRIER_ACTIVES.has(k),
    );

    if (cartHasStrongTreatment && candidateHasSoothing && multiplier >= 1.0) {
      multiplier = 1.25;
      reason = 'Giúp phục hồi & bảo vệ hàng rào da khi kết hợp treatment';
    }

    return {
      excluded: false,
      penaltyMultiplier: Number(multiplier.toFixed(4)),
      reason,
    };
  }

  private checkCartActiveConflict(
    cartKeys: Set<string>,
    candidateKeys: Set<string>,
  ): ConflictEvaluationResult | null {
    const retinoidVsAcid =
      (cartKeys.has('retinoid') && hasAny(candidateKeys, ['bha', 'aha'])) ||
      (hasAny(cartKeys, ['bha', 'aha']) && candidateKeys.has('retinoid'));

    if (retinoidVsAcid) {
      return {
        excluded: true,
        penaltyMultiplier: 0,
        reason:
          'Tránh kết hợp Retinoid cùng AHA/BHA trong một chu trình để hạn chế kích ứng da',
      };
    }

    const retinoidVsVitC =
      (cartKeys.has('retinoid') && candidateKeys.has('vitamin_c')) ||
      (cartKeys.has('vitamin_c') && candidateKeys.has('retinoid'));

    if (retinoidVsVitC) {
      return {
        excluded: true,
        penaltyMultiplier: 0,
        reason:
          'Tránh dùng chung Retinoid và Vitamin C nguyên chất cùng lúc để giảm kích ứng',
      };
    }

    const bpoConflict =
      (cartKeys.has('benzoyl_peroxide') &&
        hasAny(candidateKeys, ['retinoid', 'vitamin_c'])) ||
      (hasAny(cartKeys, ['retinoid', 'vitamin_c']) &&
        candidateKeys.has('benzoyl_peroxide'));

    if (bpoConflict) {
      return {
        excluded: true,
        penaltyMultiplier: 0,
        reason:
          'Benzoyl Peroxide có thể làm giảm hiệu quả hoặc gây kích ứng khi ghép với Retinoid/Vitamin C',
      };
    }

    return null;
  }
}
