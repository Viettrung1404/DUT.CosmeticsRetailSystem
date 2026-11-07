/**
 * Dynamic Currency Formatter based on active locale.
 * Currency remains VND (no rate conversion), only the representation changes:
 * - 'vi' locale: Vietnamese standard format (e.g. "350.000 ₫")
 * - 'en' locale: English international format with currency code suffix (e.g. "350,000 VND")
 */

export type LocaleCode = "vi" | "en" | string;

export function formatCurrency(
  amount: number | null | undefined,
  locale: LocaleCode = "vi"
): string {
  const value = typeof amount === "number" && !isNaN(amount) ? amount : 0;

  if (locale === "en") {
    // International standard format with currency code suffix: "350,000 VND"
    const formattedNumber = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);
    return `${formattedNumber} VND`;
  }

  // Standard Vietnamese format: "350.000 ₫"
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default formatCurrency;
