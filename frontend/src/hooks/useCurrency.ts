"use client";

import { useLocale } from "next-intl";
import { formatCurrency, LocaleCode } from "@/utils/formatCurrency";

/**
 * React hook to automatically format price values based on current active locale.
 *
 * Example:
 * const { formatPrice, locale } = useCurrency();
 * formatPrice(350000) // -> "350.000 ₫" (vi) or "₫350,000" (en)
 */
export function useCurrency() {
  const currentLocale = useLocale() as LocaleCode;

  const formatPrice = (amount: number | null | undefined): string => {
    return formatCurrency(amount, currentLocale);
  };

  return {
    locale: currentLocale,
    formatPrice,
    isVietnamese: currentLocale === "vi",
    isEnglish: currentLocale === "en",
  };
}

export default useCurrency;
