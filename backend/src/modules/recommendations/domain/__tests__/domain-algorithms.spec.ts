import {
  COSMETIC_INGREDIENT_DICTIONARY,
  extractNormalizedIngredientsFromText,
  getIngredientDisplayNameVi,
  normalizeIngredientName,
  normalizeIngredientNames,
  stripVietnameseDiacritics,
} from '../ingredient-normalizer.util';
import {
  ContentSimilarityScorer,
  ProductSimilarityFeatures,
  computeColorDeltaE,
  hexToRgb,
  rgbToLab,
} from '../content-similarity.scorer';
import {
  SKINCARE_ROUTINE_RULES,
  detectRoutineStep,
  findRoutineComplements,
  matchRoutineRule,
} from '../skincare-routine.rules';
import { IngredientConflictPolicy } from '../ingredient-conflict.policy';

describe('Phase 2 Recommendation Domain Algorithms', () => {
  describe('ingredient-normalizer.util', () => {
    it('defines at least 25 canonical cosmetic active groups', () => {
      expect(COSMETIC_INGREDIENT_DICTIONARY.length).toBeGreaterThanOrEqual(25);
    });

    it('normalizes English INCI names and Vietnamese names to the same canonical key', () => {
      expect(normalizeIngredientName('Salicylic Acid 2%')).toContain('bha');
      expect(normalizeIngredientName('BHA')).toContain('bha');
      expect(normalizeIngredientName('D-Panthenol')).toContain('vitamin_b5');
      expect(normalizeIngredientName('Vitamin B5')).toContain('vitamin_b5');
      expect(normalizeIngredientName('Niacinamide')).toContain('niacinamide');
      expect(normalizeIngredientName('Vitamin B3')).toContain('niacinamide');
      expect(normalizeIngredientName('L-Ascorbic Acid')).toContain('vitamin_c');
      expect(normalizeIngredientName('Centella Asiatica Extract')).toContain('centella');
      expect(normalizeIngredientName('Chiết xuất rau má')).toContain('centella');
      expect(normalizeIngredientName('Sodium Hyaluronate')).toContain(
        'hyaluronic_acid',
      );
      expect(normalizeIngredientName('Alcohol Denat.')).toContain(
        'drying_alcohol',
      );
    });

    it('does not produce false positives for short tokens like HA inside unrelated words', () => {
      expect(normalizeIngredientName('Chamomilla Recutita')).not.toContain(
        'hyaluronic_acid',
      );
      expect(stripVietnameseDiacritics('Dưỡng ẩm rau má HA')).toBe(
        'duong am rau ma ha',
      );
      expect(
        extractNormalizedIngredientsFromText('Serum phục hồi Vitamin B5 và HA'),
      ).toEqual(expect.arrayContaining(['vitamin_b5', 'hyaluronic_acid']));
    });

    it('deduplicates canonical keys across multiple raw ingredient names', () => {
      const normalized = normalizeIngredientNames([
        'Panthenol',
        'Vitamin B5',
        'Madecassoside',
        'Rau má',
      ]);
      expect(normalized).toEqual(['vitamin_b5', 'centella']);
      expect(getIngredientDisplayNameVi('vitamin_b5')).toBe('Vitamin B5');
    });
  });

  describe('ContentSimilarityScorer', () => {
    const scorer = new ContentSimilarityScorer();

    const prodA: ProductSimilarityFeatures = {
      id: 'prod-a',
      categoryId: 'cat-serum',
      brandId: 'brand-1',
      effectivePrice: 400000,
      normalizedIngredients: ['niacinamide', 'zinc'],
      keyIngredients: ['niacinamide'],
      skinTags: ['da-dau', 'mun'],
    };

    const prodB: ProductSimilarityFeatures = {
      id: 'prod-b',
      categoryId: 'cat-serum',
      brandId: 'brand-1',
      effectivePrice: 440000,
      normalizedIngredients: ['niacinamide', 'bha'],
      keyIngredients: ['niacinamide'],
      skinTags: ['da-dau', 'lo-chan-long'],
    };

    const prodDisjoint: ProductSimilarityFeatures = {
      id: 'prod-disjoint',
      categoryId: 'cat-lip',
      brandId: 'brand-9',
      effectivePrice: 900000,
      normalizedIngredients: ['shea_butter'],
      keyIngredients: ['shea_butter'],
      skinTags: ['moi-kho'],
    };

    it('skips completely disjoint pairs during candidate generation (avoiding O(N^2))', () => {
      const candidates = scorer.generateCandidatePairs([
        prodA,
        prodB,
        prodDisjoint,
      ]);

      expect(candidates.get('prod-a')?.has('prod-b')).toBe(true);
      expect(candidates.get('prod-a')?.has('prod-disjoint')).toBe(false);
    });

    it('scores similar products using weighted formula and produces a Vietnamese reason', () => {
      const result = scorer.scorePair(prodA, prodB);

      // 0.35*1 + 0.25*(1/3) + 0.20*(1/3) + 0.10*(1 - 40000/440000) + 0.10*1 = ~0.6909
      expect(result.score).toBeGreaterThan(0.65);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.reason).toBeTruthy();
      expect(result.reason).toMatch(/danh mục|Niacinamide|thương hiệu|da dầu/i);
    });

    it('computes RGB/Lab Delta E distance for try_on_color and ranks closer shades higher', () => {
      expect(hexToRgb('#C84B31')).toEqual({ r: 200, g: 75, b: 49 });
      const lab = rgbToLab({ r: 200, g: 75, b: 49 });
      expect(lab.L).toBeGreaterThan(0);

      const closeDelta = computeColorDeltaE('#C84B31', '#CA4F35');
      const farDelta = computeColorDeltaE('#C84B31', '#2244CC');
      expect(closeDelta).toBeLessThan(5);
      expect(farDelta).toBeGreaterThan(40);

      const lipBase: ProductSimilarityFeatures = {
        id: 'lip-base',
        categoryId: 'cat-lip',
        brandId: 'brand-lip',
        effectivePrice: 300000,
        normalizedIngredients: ['shea_butter'],
        skinTags: ['son-li'],
        tryOnColorHexes: ['#C84B31'],
      };
      const lipCloseShade: ProductSimilarityFeatures = {
        ...lipBase,
        id: 'lip-close',
        tryOnColorHexes: ['#CC4E34'],
      };
      const lipFarShade: ProductSimilarityFeatures = {
        ...lipBase,
        id: 'lip-far',
        tryOnColorHexes: ['#1E3A8A'],
      };

      const closeResult = scorer.scorePair(lipBase, lipCloseShade);
      const farResult = scorer.scorePair(lipBase, lipFarShade);
      expect(closeResult.score).toBeGreaterThan(farResult.score);
      expect(closeResult.colorDeltaE).toBeLessThan(5);
    });

    it('ranks at most Top K similar products per source product', () => {
      const products: ProductSimilarityFeatures[] = Array.from(
        { length: 16 },
        (_, i) => ({
          id: `p-${i}`,
          categoryId: 'cat-serum',
          brandId: i % 2 === 0 ? 'b-1' : 'b-2',
          effectivePrice: 300000 + i * 10000,
          normalizedIngredients: ['niacinamide', 'vitamin_b5'],
          skinTags: ['da-dau'],
        }),
      );

      const ranked = scorer.rankTopSimilar(products, 12);
      expect(ranked.get('p-0')?.length).toBe(12);
      expect(ranked.get('p-0')?.every((r) => r.targetProductId !== 'p-0')).toBe(
        true,
      );
    });
  });

  describe('SkincareRoutineRules', () => {
    it('provides structured skincare and makeup routine complement rules', () => {
      expect(SKINCARE_ROUTINE_RULES.length).toBeGreaterThanOrEqual(6);
      expect(detectRoutineStep('Sữa rửa mặt dịu nhẹ')).toBe('cleanser');
      expect(detectRoutineStep('Kem chống nắng kiềm dầu')).toBe('sunscreen');

      const complements = findRoutineComplements('Sữa rửa mặt');
      expect(complements.length).toBeGreaterThan(0);

      const matched = matchRoutineRule('Serum BHA giảm mụn', 'Kem chống nắng SPF50+');
      expect(matched).not.toBeNull();
      expect(matched?.reason).toBeTruthy();
    });
  });

  describe('IngredientConflictPolicy', () => {
    const policy = new IngredientConflictPolicy();

    it('excludes BHA/AHA or pure Vitamin C when Retinoid is in cart', () => {
      const resBha = policy.evaluate({
        cartIngredientKeys: ['retinoid'],
        candidateIngredientKeys: ['bha', 'niacinamide'],
        customerSkinTags: [],
      });
      expect(resBha.excluded).toBe(true);
      expect(resBha.reason).toBeTruthy();

      const resVitC = policy.evaluate({
        cartIngredientKeys: ['retinoid'],
        candidateIngredientKeys: ['vitamin_c'],
        customerSkinTags: [],
      });
      expect(resVitC.excluded).toBe(true);
    });

    it('boosts soothing/barrier-repair actives (Vitamin B5, Ceramide, Centella) with treatments', () => {
      const res = policy.evaluate({
        cartIngredientKeys: ['retinoid'],
        candidateIngredientKeys: ['vitamin_b5', 'ceramide'],
        customerSkinTags: [],
      });
      expect(res.excluded).toBe(false);
      expect(res.penaltyMultiplier).toBeGreaterThan(1.0);
    });

    it('penalizes drying alcohol for sensitive or dry skin customers', () => {
      const resSensitive = policy.evaluate({
        cartIngredientKeys: [],
        candidateIngredientKeys: ['drying_alcohol', 'niacinamide'],
        customerSkinTags: ['da-nhay-cam'],
      });
      expect(resSensitive.excluded).toBe(false);
      expect(resSensitive.penaltyMultiplier).toBeLessThan(0.6);
      expect(resSensitive.reason).toContain('cồn khô');

      const resDry = policy.evaluate({
        cartIngredientKeys: [],
        candidateIngredientKeys: ['drying_alcohol'],
        customerSkinTags: ['da-kho'],
      });
      expect(resDry.penaltyMultiplier).toBeLessThan(0.6);
    });
  });
});
