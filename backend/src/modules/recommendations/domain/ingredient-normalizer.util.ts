/**
 * Bộ từ điển và hàm chuẩn hóa hoạt chất mỹ phẩm giữa tên INCI tiếng Anh và tên tiếng Việt (~31 nhóm phổ biến).
 */
export type CanonicalIngredientKey = string;

export interface IngredientDictionaryEntry {
  readonly key: CanonicalIngredientKey;
  readonly displayNameVi: string;
  readonly aliases: readonly string[];
}

export const COSMETIC_INGREDIENT_DICTIONARY: readonly IngredientDictionaryEntry[] =
  [
    {
      key: 'bha',
      displayNameVi: 'BHA (Salicylic Acid)',
      aliases: [
        'salicylic acid',
        'bha',
        'betaine salicylate',
        'willow bark extract',
        'salix alba',
        'chiet xuat vo cay lieu',
      ],
    },
    {
      key: 'aha',
      displayNameVi: 'AHA',
      aliases: [
        'glycolic acid',
        'lactic acid',
        'mandelic acid',
        'citric acid',
        'malic acid',
        'tartaric acid',
        'aha',
      ],
    },
    {
      key: 'pha',
      displayNameVi: 'PHA',
      aliases: ['gluconolactone', 'lactobionic acid', 'pha'],
    },
    {
      key: 'vitamin_b5',
      displayNameVi: 'Vitamin B5',
      aliases: [
        'panthenol',
        'd-panthenol',
        'dl-panthenol',
        'provitamin b5',
        'vitamin b5',
        'b5',
      ],
    },
    {
      key: 'niacinamide',
      displayNameVi: 'Niacinamide (Vitamin B3)',
      aliases: ['niacinamide', 'nicotinamide', 'vitamin b3', 'b3'],
    },
    {
      key: 'vitamin_c',
      displayNameVi: 'Vitamin C',
      aliases: [
        'ascorbic acid',
        'l-ascorbic acid',
        'ethyl ascorbic acid',
        '3-o-ethyl ascorbic acid',
        'sodium ascorbyl phosphate',
        'magnesium ascorbyl phosphate',
        'ascorbyl glucoside',
        'vitamin c',
        'vit c',
      ],
    },
    {
      key: 'retinoid',
      displayNameVi: 'Retinoid / Retinol',
      aliases: [
        'retinol',
        'retinal',
        'retinaldehyde',
        'tretinoin',
        'adapalene',
        'retinyl palmitate',
        'hydroxypinacolone retinoate',
        'retinoid',
      ],
    },
    {
      key: 'centella',
      displayNameVi: 'Rau má (Centella Asiatica)',
      aliases: [
        'centella asiatica',
        'madecassoside',
        'asiaticoside',
        'asiatic acid',
        'madecassic acid',
        'cica',
        'rau ma',
      ],
    },
    {
      key: 'hyaluronic_acid',
      displayNameVi: 'Hyaluronic Acid (HA)',
      aliases: [
        'hyaluronic acid',
        'sodium hyaluronate',
        'hydrolyzed hyaluronic acid',
        'sodium acetylated hyaluronate',
        'ha',
      ],
    },
    {
      key: 'ceramide',
      displayNameVi: 'Ceramide',
      aliases: [
        'ceramide',
        'ceramide np',
        'ceramide ap',
        'ceramide eop',
        'ceramide ns',
        'phytosphingosine',
      ],
    },
    {
      key: 'peptide',
      displayNameVi: 'Peptide',
      aliases: [
        'peptide',
        'copper tripeptide',
        'palmitoyl tripeptide',
        'acetyl hexapeptide',
        'matrixyl',
        'argireline',
      ],
    },
    {
      key: 'azelaic_acid',
      displayNameVi: 'Azelaic Acid',
      aliases: ['azelaic acid', 'potassium azeloyl diglycinate', 'azelaic'],
    },
    {
      key: 'arbutin',
      displayNameVi: 'Alpha-Arbutin',
      aliases: ['alpha-arbutin', 'alpha arbutin', 'beta-arbutin', 'arbutin'],
    },
    {
      key: 'tranexamic_acid',
      displayNameVi: 'Tranexamic Acid',
      aliases: ['tranexamic acid', 'txa'],
    },
    {
      key: 'kojic_acid',
      displayNameVi: 'Kojic Acid',
      aliases: ['kojic acid'],
    },
    {
      key: 'benzoyl_peroxide',
      displayNameVi: 'Benzoyl Peroxide',
      aliases: ['benzoyl peroxide', 'bpo'],
    },
    {
      key: 'tea_tree',
      displayNameVi: 'Tràm trà (Tea Tree)',
      aliases: ['melaleuca alternifolia', 'tea tree', 'tram tra'],
    },
    {
      key: 'green_tea',
      displayNameVi: 'Trà xanh (Green Tea)',
      aliases: ['camellia sinensis', 'green tea', 'egcg', 'tra xanh'],
    },
    {
      key: 'zinc',
      displayNameVi: 'Kẽm (Zinc)',
      aliases: ['zinc pca', 'zinc oxide', 'zinc gluconate', 'kem'],
    },
    {
      key: 'squalane',
      displayNameVi: 'Squalane',
      aliases: ['squalane', 'squalene'],
    },
    {
      key: 'shea_butter',
      displayNameVi: 'Bơ hạt mỡ (Shea Butter)',
      aliases: ['butyrospermum parkii', 'shea butter', 'bo hat mo'],
    },
    {
      key: 'glycerin',
      displayNameVi: 'Glycerin',
      aliases: ['glycerin', 'glycerol'],
    },
    {
      key: 'snail_mucin',
      displayNameVi: 'Dịch nhầy ốc sên',
      aliases: ['snail secretion filtrate', 'snail mucin', 'oc sen'],
    },
    {
      key: 'propolis',
      displayNameVi: 'Keo ong (Propolis)',
      aliases: ['propolis', 'keo ong'],
    },
    {
      key: 'bakuchiol',
      displayNameVi: 'Bakuchiol',
      aliases: ['bakuchiol'],
    },
    {
      key: 'mugwort',
      displayNameVi: 'Ngải cứu (Mugwort)',
      aliases: ['artemisia', 'mugwort', 'ngai cuu'],
    },
    {
      key: 'aloe_vera',
      displayNameVi: 'Nha đam (Aloe Vera)',
      aliases: ['aloe barbadensis', 'aloe vera', 'nha dam', 'lo hoi'],
    },
    {
      key: 'chamomile',
      displayNameVi: 'Cúc la mã / Bisabolol',
      aliases: ['chamomilla recutita', 'bisabolol', 'chamomile', 'cuc la ma'],
    },
    {
      key: 'uv_filter',
      displayNameVi: 'Hoạt chất chống nắng',
      aliases: [
        'ethylhexyl methoxycinnamate',
        'avobenzone',
        'titanium dioxide',
        'tinosorb',
        'uvinul',
        'octinoxate',
        'chong nang',
        'spf',
      ],
    },
    {
      key: 'drying_alcohol',
      displayNameVi: 'Cồn khô',
      aliases: [
        'alcohol denat',
        'sd alcohol',
        'isopropyl alcohol',
        'ethanol',
        'con kho',
      ],
    },
    {
      key: 'fragrance',
      displayNameVi: 'Hương liệu',
      aliases: ['fragrance', 'parfum', 'huong lieu'],
    },
  ];

export const INGREDIENT_SYNONYM_GROUPS: Record<
  CanonicalIngredientKey,
  readonly string[]
> = Object.fromEntries(
  COSMETIC_INGREDIENT_DICTIONARY.map((entry) => [entry.key, entry.aliases]),
);

const DISPLAY_NAME_BY_KEY = new Map<CanonicalIngredientKey, string>(
  COSMETIC_INGREDIENT_DICTIONARY.map((entry) => [
    entry.key,
    entry.displayNameVi,
  ]),
);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Chuẩn hóa chuỗi tiếng Việt về chữ thường không dấu để so khớp ổn định.
 */
export function stripVietnameseDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

const COMPILED_INGREDIENT_PATTERNS: ReadonlyArray<{
  key: CanonicalIngredientKey;
  patterns: readonly RegExp[];
}> = COSMETIC_INGREDIENT_DICTIONARY.map((entry) => ({
  key: entry.key,
  patterns: entry.aliases.map(
    (alias) =>
      new RegExp(
        `(?:^|[^a-z0-9])${escapeRegex(stripVietnameseDiacritics(alias))}(?:$|[^a-z0-9])`,
        'i',
      ),
  ),
}));

/**
 * Chuẩn hóa 1 tên hoạt chất hoặc đoạn text thành danh sách key chuẩn tương ứng.
 */
export function normalizeIngredientName(
  rawName: string,
): CanonicalIngredientKey[] {
  const cleaned = stripVietnameseDiacritics(rawName ?? '');
  if (!cleaned) {
    return [];
  }

  const matchedKeys: CanonicalIngredientKey[] = [];
  for (const group of COMPILED_INGREDIENT_PATTERNS) {
    if (group.patterns.some((pattern) => pattern.test(cleaned))) {
      matchedKeys.push(group.key);
    }
  }
  return matchedKeys;
}

/**
 * Chuẩn hóa mảng tên hoạt chất thành tập các canonical key duy nhất.
 * Nếu chuỗi không nằm trong từ điển nhưng được truyền riêng lẻ như 1 tên thành phần, giữ dạng chuẩn hóa fallback.
 */
export function normalizeIngredientNames(
  rawNames: readonly string[] | null | undefined,
  includeUnknownFallback = false,
): CanonicalIngredientKey[] {
  if (!rawNames?.length) {
    return [];
  }
  const normalized = new Set<CanonicalIngredientKey>();

  for (const raw of rawNames) {
    const cleaned = stripVietnameseDiacritics(raw ?? '');
    if (!cleaned) continue;

    const matches = normalizeIngredientName(cleaned);
    if (matches.length > 0) {
      for (const key of matches) {
        normalized.add(key);
      }
    } else if (includeUnknownFallback) {
      normalized.add(cleaned);
    }
  }

  return Array.from(normalized);
}

/**
 * Trích xuất các hoạt chất chuẩn từ văn bản mô tả, hướng dẫn sử dụng hoặc truy vấn tìm kiếm.
 */
export function extractNormalizedIngredientsFromText(
  text: string | null | undefined,
): CanonicalIngredientKey[] {
  if (!text) {
    return [];
  }
  return normalizeIngredientName(text);
}

/**
 * Trả về tên hiển thị tiếng Việt thân thiện cho canonical key.
 */
export function getIngredientDisplayNameVi(key: CanonicalIngredientKey): string {
  return DISPLAY_NAME_BY_KEY.get(key) ?? key;
}
