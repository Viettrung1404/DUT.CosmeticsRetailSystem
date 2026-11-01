import type { ReactNode } from "react";
import { SiteHeader, SiteFooter } from "@/widgets/site-shell";
import { getBrands, getCategories } from "@/features/catalog/server";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [categories, brands] = await Promise.all([
    getCategories().catch(() => []),
    getBrands(100).catch(() => []),
  ]);
  return (
    <>
      <SiteHeader categories={categories} brands={brands} />
      {children}
      <SiteFooter />
    </>
  );
}
