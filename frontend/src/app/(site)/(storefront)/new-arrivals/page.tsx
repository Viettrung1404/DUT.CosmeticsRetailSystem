import { getCategories } from "@/features/catalog/server";
import { ProductListing, type ListingParams } from "@/features/catalog/listing";
export const metadata = { title: "Hàng mới về | GlowUp" };
export default async function NewArrivalsPage({
  searchParams,
}: {
  searchParams: Promise<ListingParams>;
}) {
  const [params, categories] = await Promise.all([searchParams, getCategories()]);
  return (
    <ProductListing
      title="Bộ sưu tập mới vừa lên kệ"
      intro="Những sản phẩm mới được cập nhật trên GlowUp"
      base="/new-arrivals"
      params={{ ...params, sortBy: "newest" }}
      categories={categories}
    />
  );
}
