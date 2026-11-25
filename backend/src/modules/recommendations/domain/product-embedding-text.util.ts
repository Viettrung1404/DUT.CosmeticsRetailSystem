export const DEFAULT_EMBEDDING_MODEL = '@cf/baai/bge-m3';
export const EMBEDDING_DIMENSIONS = 1024;

export interface ProductEmbeddingTextInput {
  name: string;
  categoryName?: string | null;
  brandName?: string | null;
  ingredients?: readonly string[] | null;
  specifications?: unknown;
  howToUse?: string | null;
}

function cleanText(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatSpecificationsText(specs: unknown): string {
  if (!specs) return '';
  if (typeof specs === 'string') return cleanText(specs);
  if (typeof specs !== 'object') return '';

  const parts: string[] = [];
  for (const [key, value] of Object.entries(specs as Record<string, unknown>)) {
    if (value === null || value === undefined || value === '') continue;
    const formattedVal = Array.isArray(value)
      ? value.map((v) => cleanText(String(v))).filter(Boolean).join(', ')
      : cleanText(String(value));
    if (formattedVal) {
      parts.push(`${key}: ${formattedVal}`);
    }
  }
  return parts.join(', ');
}

/**
 * Chuẩn hóa văn bản sản phẩm tiếng Việt để sinh embedding nhất quán với @cf/baai/bge-m3:
 * "{name} | {category} | {brand} | Thành phần: {ingredients} | Đặc tính: {specifications} | Cách dùng: {how_to_use}"
 */
export function buildProductEmbeddingText(
  input: ProductEmbeddingTextInput,
  maxLength = 2500,
): string {
  const name = cleanText(input.name) || 'Sản phẩm mỹ phẩm';
  const category = cleanText(input.categoryName) || 'Chăm sóc sắc đẹp';
  const brand = cleanText(input.brandName) || 'GlowUp';
  const ingredients =
    (input.ingredients ?? []).map(cleanText).filter(Boolean).join(', ') ||
    'Đang cập nhật';
  const specs = formatSpecificationsText(input.specifications) || 'Tiêu chuẩn';
  const howToUse = cleanText(input.howToUse) || 'Dùng hàng ngày theo hướng dẫn';

  const combined = `${name} | ${category} | ${brand} | Thành phần: ${ingredients} | Đặc tính: ${specs} | Cách dùng: ${howToUse}`;
  return combined.slice(0, maxLength);
}

/**
 * Chuyển mảng float[1024] thành literal chuẩn PostgreSQL pgvector `halfvec(1024)`.
 */
export function formatHalfvecLiteral(
  vector: readonly number[],
  expectedDim = EMBEDDING_DIMENSIONS,
): string {
  if (!Array.isArray(vector) || vector.length !== expectedDim) {
    throw new Error(
      `Invalid embedding dimension: expected ${expectedDim}, got ${vector?.length ?? 0}`,
    );
  }

  const parts = vector.map((n) => {
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new Error('Embedding contains non-finite numeric value');
    }
    return Number(n.toFixed(6));
  });

  return `[${parts.join(',')}]`;
}
