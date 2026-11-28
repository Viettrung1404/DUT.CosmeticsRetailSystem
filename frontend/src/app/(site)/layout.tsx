import type { ReactNode } from "react";
import { Suspense } from "react";
import { SiteHeader, SiteFooter } from "@/widgets/site-shell";
import { getBrands, getCategories } from "@/features/catalog/server";
import { NavigationProgressBar } from "@/shared/ui/navigation-progress-bar";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [categories, brands] = await Promise.all([
    getCategories().catch(() => []),
    getBrands(100).catch(() => []),
  ]);
  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgressBar />
      </Suspense>
      <SiteHeader categories={categories} brands={brands} />
      {children}
      <SiteFooter />
    </>
  );
}
