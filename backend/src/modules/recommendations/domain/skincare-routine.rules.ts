import { stripVietnameseDiacritics } from './ingredient-normalizer.util';

export type RoutineStep =
  | 'cleanser'
  | 'exfoliant'
  | 'toner'
  | 'serum'
  | 'treatment'
  | 'moisturizer'
  | 'sunscreen'
  | 'mask'
  | 'lip_makeup'
  | 'base_makeup'
  | 'eye_makeup';

export interface RoutineComplementRule {
  readonly sourceStep: RoutineStep;
  readonly targetStep: RoutineStep;
  readonly sourceCategoryKeywords: readonly string[];
  readonly targetCategoryKeywords: readonly string[];
  readonly priority: number;
  readonly reason: string;
}

const STEP_KEYWORDS: Readonly<Record<RoutineStep, readonly string[]>> = {
  cleanser: ['sua rua mat', 'tay trang', 'cleanser', 'micellar', 'lam sach'],
  exfoliant: ['tay te bao chet', 'tay da chet', 'exfoli', 'peel'],
  toner: ['toner', 'nuoc hoa hong', 'nuoc can bang', 'lotion duong'],
  serum: ['serum', 'tinh chat', 'essence', 'ampoule'],
  treatment: ['dac tri', 'tri mun', 'treatment', 'retinol', 'chong lao hoa'],
  moisturizer: ['kem duong', 'sua duong', 'duong am', 'gel duong', 'moisturizer', 'cream'],
  sunscreen: ['kem chong nang', 'chong nang', 'sunscreen', 'spf', 'chong tia uv'],
  mask: ['mat na', 'mask', 'ngu mat na'],
  lip_makeup: ['son', 'lipstick', 'lip balm', 'son duong', 'son kem', 'son thoi'],
  base_makeup: ['kem nen', 'cushion', 'phan phu', 'kem lot', 'foundation', 'che khuyet diem'],
  eye_makeup: ['mascara', 'ke mat', 'eyeliner', 'phan mat', 'ke may'],
};

export const SKINCARE_ROUTINE_RULES: readonly RoutineComplementRule[] = [
  {
    sourceStep: 'cleanser',
    targetStep: 'toner',
    sourceCategoryKeywords: STEP_KEYWORDS.cleanser,
    targetCategoryKeywords: STEP_KEYWORDS.toner,
    priority: 0.92,
    reason: 'Cân bằng độ pH ngay sau bước làm sạch',
  },
  {
    sourceStep: 'cleanser',
    targetStep: 'moisturizer',
    sourceCategoryKeywords: STEP_KEYWORDS.cleanser,
    targetCategoryKeywords: STEP_KEYWORDS.moisturizer,
    priority: 0.85,
    reason: 'Khóa ẩm và bảo vệ hàng rào da sau khi rửa mặt',
  },
  {
    sourceStep: 'toner',
    targetStep: 'serum',
    sourceCategoryKeywords: STEP_KEYWORDS.toner,
    targetCategoryKeywords: STEP_KEYWORDS.serum,
    priority: 0.9,
    reason: 'Tăng cường dưỡng chất chuyên sâu sau bước toner',
  },
  {
    sourceStep: 'serum',
    targetStep: 'moisturizer',
    sourceCategoryKeywords: STEP_KEYWORDS.serum,
    targetCategoryKeywords: STEP_KEYWORDS.moisturizer,
    priority: 0.94,
    reason: 'Khóa ẩm giúp phát huy tối đa hiệu quả tinh chất',
  },
  {
    sourceStep: 'serum',
    targetStep: 'sunscreen',
    sourceCategoryKeywords: STEP_KEYWORDS.serum,
    targetCategoryKeywords: STEP_KEYWORDS.sunscreen,
    priority: 0.9,
    reason: 'Bảo vệ da ban ngày khi sử dụng hoạt chất treatment',
  },
  {
    sourceStep: 'treatment',
    targetStep: 'sunscreen',
    sourceCategoryKeywords: STEP_KEYWORDS.treatment,
    targetCategoryKeywords: STEP_KEYWORDS.sunscreen,
    priority: 0.95,
    reason: 'Chống nắng bắt buộc để bảo vệ da đang dùng đặc trị',
  },
  {
    sourceStep: 'exfoliant',
    targetStep: 'moisturizer',
    sourceCategoryKeywords: STEP_KEYWORDS.exfoliant,
    targetCategoryKeywords: STEP_KEYWORDS.moisturizer,
    priority: 0.88,
    reason: 'Làm dịu và cấp ẩm lại sau bước tẩy tế bào chết',
  },
  {
    sourceStep: 'moisturizer',
    targetStep: 'sunscreen',
    sourceCategoryKeywords: STEP_KEYWORDS.moisturizer,
    targetCategoryKeywords: STEP_KEYWORDS.sunscreen,
    priority: 0.86,
    reason: 'Hoàn thiện bước bảo vệ da ban ngày',
  },
  {
    sourceStep: 'sunscreen',
    targetStep: 'cleanser',
    sourceCategoryKeywords: STEP_KEYWORDS.sunscreen,
    targetCategoryKeywords: STEP_KEYWORDS.cleanser,
    priority: 0.89,
    reason: 'Làm sạch kỹ lớp kem chống nắng cuối ngày',
  },
  {
    sourceStep: 'base_makeup',
    targetStep: 'lip_makeup',
    sourceCategoryKeywords: STEP_KEYWORDS.base_makeup,
    targetCategoryKeywords: STEP_KEYWORDS.lip_makeup,
    priority: 0.8,
    reason: 'Hoàn thiện lớp trang điểm đồng điệu',
  },
  {
    sourceStep: 'lip_makeup',
    targetStep: 'cleanser',
    sourceCategoryKeywords: STEP_KEYWORDS.lip_makeup,
    targetCategoryKeywords: STEP_KEYWORDS.cleanser,
    priority: 0.78,
    reason: 'Làm sạch dịu nhẹ lớp trang điểm môi cuối ngày',
  },
];

/**
 * Nhận diện bước trong chu trình từ tên danh mục hoặc tên sản phẩm.
 */
export function detectRoutineStep(text: string | null | undefined): RoutineStep | null {
  const normalized = stripVietnameseDiacritics(text ?? '');
  if (!normalized) return null;

  for (const [step, keywords] of Object.entries(STEP_KEYWORDS) as Array<
    [RoutineStep, readonly string[]]
  >) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return step;
    }
  }
  return null;
}

/**
 * Lấy danh sách luật bổ trợ theo sản phẩm nguồn (đã sắp xếp giảm dần theo độ ưu tiên).
 */
export function findRoutineComplements(
  sourceText: string,
): RoutineComplementRule[] {
  const step = detectRoutineStep(sourceText);
  if (!step) return [];

  return SKINCARE_ROUTINE_RULES.filter((rule) => rule.sourceStep === step).sort(
    (a, b) => b.priority - a.priority,
  );
}

/**
 * Kiểm tra cặp sản phẩm nguồn -> đích có khớp luật bổ trợ chu trình hay không.
 */
export function matchRoutineRule(
  sourceText: string,
  targetText: string,
): RoutineComplementRule | null {
  const sourceStep = detectRoutineStep(sourceText);
  const targetStep = detectRoutineStep(targetText);
  if (!sourceStep || !targetStep || sourceStep === targetStep) {
    return null;
  }

  return (
    SKINCARE_ROUTINE_RULES.find(
      (rule) => rule.sourceStep === sourceStep && rule.targetStep === targetStep,
    ) ?? null
  );
}
