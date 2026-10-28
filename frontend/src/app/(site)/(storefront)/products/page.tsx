import { getCategories } from "@/features/catalog/server";
import { ProductListing, type ListingParams } from "@/features/catalog/listing";
export const metadata = { title: "Tất cả sản phẩm | GlowUp" };
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ListingParams>;
}) {
  const [params, categories] = await Promise.all([searchParams, getCategories()]);
  return (
    <ProductListing
      title="Tất cả sản phẩm"
      intro="Mỹ phẩm và sản phẩm chăm sóc da dành cho bạn"
      base="/products"
      params={params}
      categories={categories}
    />
  );
}
