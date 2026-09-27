/**
 * Format order number as ORDYYYYMMDDXXXX (no hyphens) according to database spec.
 * E.g., ORD202609270001
 */
export function formatOrderNumber(date: Date, sequence: number): string {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const seq = sequence.toString().padStart(4, '0');

  return `ORD${yyyy}${mm}${dd}${seq}`;
}
