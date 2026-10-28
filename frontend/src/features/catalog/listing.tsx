import Link from "next/link";
import { getFacets, getProducts, type Category } from "./server";
import { parseListingParams, type ListingParams } from "./filters";
import { CatalogListingClient } from "./listing-client";

export type { ListingParams } from "./filters";
export async function ProductListing({
  title,
  intro,
  base,
  params,
  category,
  categories,
}: {
  title: string;
  intro?: string;
  base: string;
  params: ListingParams;
  category?: Category;
  categories?: Category[];
}) {
  const filters = parseListingParams(params);
  const [result, facets] = await Promise.all([
    getProducts({ ...filters, categoryId: category?.id }),
    getFacets().catch(() => null),
  ]);
  return (
    <main id="main-content" className="catalog-page site-container">
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span>/</span>
        <span>{title}</span>
      </nav>
      <div className="catalog-heading">
        <div>
          <p className="catalog-overline">GLOWUP BEAUTY RETAIL</p>
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
        </div>
      </div>
      <CatalogListingClient
        base={base}
        categoryId={category?.id}
        categories={categories}
        facets={facets}
        initialFilters={filters}
        initialResult={result}
      />
    </main>
  );
}
