import { notFound } from "next/navigation";
import { findCategory, getCategories } from "@/features/catalog/server";
import { ProductListing, type ListingParams } from "@/features/catalog/listing";
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ListingParams>;
}) {
  const [{ slug }, query, categories] = await Promise.all([params, searchParams, getCategories()]);
  const category = findCategory(categories, slug);
  if (!category) notFound();
  return (
    <ProductListing
      title={category.name}
      intro={`Khám phá sản phẩm ${category.name.toLowerCase()} tại GlowUp`}
      base={`/categories/${slug}`}
      params={query}
      category={category}
      categories={category.children.length ? category.children : categories}
    />
  );
}
