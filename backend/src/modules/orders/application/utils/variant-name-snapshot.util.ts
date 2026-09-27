export interface VariantSnapshotOptions {
  option1Value?: string | null;
  option2Value?: string | null;
  option3Value?: string | null;
  sku?: string | null;
}

/**
 * Creates snapshot for variant name by joining non-null option values.
 * E.g., "Đỏ Ruby / Fullsize 3.5g" or fallback to SKU / "Mặc định"
 */
export function createVariantNameSnapshot(options: VariantSnapshotOptions): string {
  const parts = [
    options.option1Value,
    options.option2Value,
    options.option3Value,
  ]
    .map((v) => (v ? v.trim() : ''))
    .filter((v) => v.length > 0);

  if (parts.length > 0) {
    return parts.join(' / ');
  }

  return (options.sku && options.sku.trim()) || 'Mặc định';
}
