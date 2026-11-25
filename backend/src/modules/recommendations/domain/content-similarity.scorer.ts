import {
  getIngredientDisplayNameVi,
  stripVietnameseDiacritics,
} from './ingredient-normalizer.util';

export interface ProductSimilarityFeatures {
  id: string;
  categoryId: string;
  brandId: string | null;
  effectivePrice: number;
  normalizedIngredients: string[];
  keyIngredients?: string[];
  skinTags: string[];
  tryOnColorHex?: string | null;
  tryOnColorHexes?: string[];
}

export interface SimilarityScoreResult {
  score: number;
  reason: string | null;
  colorDeltaE?: number | null;
}

export interface RankedSimilarProduct {
  targetProductId: string;
  score: number;
  reason: string;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

export function hexToRgb(hex: string): RgbColor | null {
  const cleaned = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return null;
  }
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

function linearizeSrgbChannel(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function labPivot(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/**
 * Chuyển đổi RGB sang không gian màu CIE L*a*b* (tham chiếu D65) để đo độ lệch màu sắc mỹ phẩm.
 */
export function rgbToLab(rgb: RgbColor): LabColor {
  const r = linearizeSrgbChannel(rgb.r);
  const g = linearizeSrgbChannel(rgb.g);
  const b = linearizeSrgbChannel(rgb.b);

  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) / 1.0;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;

  const fx = labPivot(x);
  const fy = labPivot(y);
  const fz = labPivot(z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * Khoảng cách màu CIE76 Delta E giữa 2 mã màu HEX (#RRGGBB).
 */
export function computeColorDeltaE(hexA: string, hexB: string): number {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) {
    return Number.POSITIVE_INFINITY;
  }

  const labA = rgbToLab(rgbA);
  const labB = rgbToLab(rgbB);

  return Math.sqrt(
    Math.pow(labA.L - labB.L, 2) +
      Math.pow(labA.a - labB.a, 2) +
      Math.pow(labA.b - labB.b, 2),
  );
}

function collectProductColorHexes(product: ProductSimilarityFeatures): string[] {
  const hexes = new Set<string>();
  if (product.tryOnColorHex) {
    hexes.add(product.tryOnColorHex.trim());
  }
  for (const hex of product.tryOnColorHexes ?? []) {
    if (hex?.trim()) {
      hexes.add(hex.trim());
    }
  }
  return Array.from(hexes);
}

function computeMinVariantColorDeltaE(
  source: ProductSimilarityFeatures,
  target: ProductSimilarityFeatures,
): number | null {
  const sourceColors = collectProductColorHexes(source);
  const targetColors = collectProductColorHexes(target);
  if (!sourceColors.length || !targetColors.length) {
    return null;
  }

  let minDelta = Number.POSITIVE_INFINITY;
  for (const hexA of sourceColors) {
    for (const hexB of targetColors) {
      const delta = computeColorDeltaE(hexA, hexB);
      if (delta < minDelta) {
        minDelta = delta;
      }
    }
  }
  return Number.isFinite(minDelta) ? minDelta : null;
}

function computeJaccardOverlap(
  itemsA: readonly string[],
  itemsB: readonly string[],
): { ratio: number; shared: string[] } {
  const setA = new Set(itemsA.map(stripVietnameseDiacritics).filter(Boolean));
  const setB = new Set(itemsB.map(stripVietnameseDiacritics).filter(Boolean));

  if (!setA.size || !setB.size) {
    return { ratio: 0, shared: [] };
  }

  const shared: string[] = [];
  for (const item of setA) {
    if (setB.has(item)) {
      shared.push(item);
    }
  }

  const unionSize = setA.size + setB.size - shared.length;
  return {
    ratio: unionSize > 0 ? shared.length / unionSize : 0,
    shared,
  };
}

function indexBucket(
  buckets: Map<string, string[]>,
  bucketKey: string,
  productId: string,
): void {
  const list = buckets.get(bucketKey);
  if (list) {
    list.push(productId);
  } else {
    buckets.set(bucketKey, [productId]);
  }
}

export class ContentSimilarityScorer {
  /**
   * Candidate Generation (tránh vét cạn O(N^2)):
   * Chỉ ghép cặp các sản phẩm có chung categoryId, hoặc ít nhất 1 hoạt chất chính/hoạt chất, hoặc chung tag loại da.
   */
  generateCandidatePairs(
    products: readonly ProductSimilarityFeatures[],
  ): Map<string, Set<string>> {
    const candidatesByProduct = new Map<string, Set<string>>();
    const buckets = new Map<string, string[]>();

    for (const product of products) {
      candidatesByProduct.set(product.id, new Set<string>());

      if (product.categoryId) {
        indexBucket(buckets, `cat:${product.categoryId}`, product.id);
      }

      const activeKeys = product.keyIngredients?.length
        ? product.keyIngredients
        : product.normalizedIngredients;
      for (const ing of activeKeys) {
        const clean = stripVietnameseDiacritics(ing);
        if (clean) {
          indexBucket(buckets, `ing:${clean}`, product.id);
        }
      }

      for (const tag of product.skinTags) {
        const clean = stripVietnameseDiacritics(tag);
        if (clean) {
          indexBucket(buckets, `tag:${clean}`, product.id);
        }
      }
    }

    for (const ids of buckets.values()) {
      if (ids.length < 2) continue;
      for (let i = 0; i < ids.length; i++) {
        const sourceId = ids[i];
        const sourceSet = candidatesByProduct.get(sourceId)!;
        for (let j = i + 1; j < ids.length; j++) {
          const targetId = ids[j];
          sourceSet.add(targetId);
          candidatesByProduct.get(targetId)!.add(sourceId);
        }
      }
    }

    return candidatesByProduct;
  }

  /**
   * Tính điểm tương đồng Content-Based:
   * 0.35*category + 0.25*ingredients(Jaccard) + 0.20*skin_spec + 0.10*price + 0.10*brand
   * Kèm đánh giá độ gần tông màu Lab (Delta E) cho nhóm trang điểm có try_on_color.
   */
  scorePair(
    source: ProductSimilarityFeatures,
    target: ProductSimilarityFeatures,
  ): SimilarityScoreResult {
    if (source.id === target.id) {
      return { score: 0, reason: null, colorDeltaE: null };
    }

    const sameCategory = source.categoryId === target.categoryId ? 1 : 0;
    const ingOverlap = computeJaccardOverlap(
      source.normalizedIngredients,
      target.normalizedIngredients,
    );
    const skinOverlap = computeJaccardOverlap(source.skinTags, target.skinTags);

    const maxPrice = Math.max(source.effectivePrice, target.effectivePrice, 1);
    const priceProximity = Math.max(
      0,
      1 - Math.abs(source.effectivePrice - target.effectivePrice) / maxPrice,
    );

    const sameBrand =
      source.brandId && target.brandId && source.brandId === target.brandId
        ? 1
        : 0;

    let score =
      0.35 * sameCategory +
      0.25 * ingOverlap.ratio +
      0.2 * skinOverlap.ratio +
      0.1 * priceProximity +
      0.1 * sameBrand;

    const colorDeltaE = computeMinVariantColorDeltaE(source, target);
    if (colorDeltaE !== null) {
      const colorSimilarity = Math.max(0, 1 - Math.min(colorDeltaE, 60) / 60);
      // Khi cả 2 sản phẩm có try_on_color, kết hợp thêm độ tương đồng màu Lab (Delta E)
      score = 0.85 * score + 0.15 * colorSimilarity;
    }

    const roundedScore = Number(Math.min(1, Math.max(0, score)).toFixed(4));
    const reason = this.buildReason({
      sameCategory: sameCategory === 1,
      sameBrand: sameBrand === 1,
      sharedIngredients: ingOverlap.shared,
      sharedSkinTags: skinOverlap.shared,
      colorDeltaE,
    });

    return {
      score: roundedScore,
      reason,
      colorDeltaE:
        colorDeltaE !== null ? Number(colorDeltaE.toFixed(2)) : null,
    };
  }

  /**
   * Xếp hạng Top K sản phẩm tương đồng nhất cho từng sản phẩm đầu vào.
   */
  rankTopSimilar(
    products: readonly ProductSimilarityFeatures[],
    topK = 12,
    minScore = 0.15,
  ): Map<string, RankedSimilarProduct[]> {
    const byId = new Map(products.map((p) => [p.id, p]));
    const candidateGraph = this.generateCandidatePairs(products);
    const ranked = new Map<string, RankedSimilarProduct[]>();

    for (const source of products) {
      const candidateIds = candidateGraph.get(source.id);
      if (!candidateIds?.size) {
        ranked.set(source.id, []);
        continue;
      }

      const scored: RankedSimilarProduct[] = [];
      for (const targetId of candidateIds) {
        const target = byId.get(targetId);
        if (!target) continue;

        const result = this.scorePair(source, target);
        if (result.score >= minScore && result.reason) {
          scored.push({
            targetProductId: targetId,
            score: result.score,
            reason: result.reason,
          });
        }
      }

      scored.sort((a, b) => b.score - a.score);
      ranked.set(source.id, scored.slice(0, topK));
    }

    return ranked;
  }

  private buildReason(ctx: {
    sameCategory: boolean;
    sameBrand: boolean;
    sharedIngredients: string[];
    sharedSkinTags: string[];
    colorDeltaE: number | null;
  }): string | null {
    const parts: string[] = [];

    if (ctx.colorDeltaE !== null && ctx.colorDeltaE <= 15) {
      parts.push('Tông màu tương đồng');
    }

    if (ctx.sharedIngredients.length > 0) {
      const topActives = ctx.sharedIngredients
        .slice(0, 2)
        .map(getIngredientDisplayNameVi)
        .join(', ');
      parts.push(`Cùng chứa ${topActives}`);
    } else if (ctx.sameCategory) {
      parts.push('Cùng danh mục chăm sóc');
    }

    if (ctx.sharedSkinTags.length > 0) {
      parts.push(`Phù hợp nhu cầu ${ctx.sharedSkinTags[0]}`);
    } else if (ctx.sameBrand && parts.length < 2) {
      parts.push('Cùng thương hiệu');
    }

    if (!parts.length) {
      return ctx.sameCategory ? 'Cùng phân khúc & danh mục' : null;
    }

    return parts.slice(0, 2).join(' & ').slice(0, 255);
  }
}
