import Link from "next/link";
import { getCategories } from "@/features/catalog/server";
import { ProductListing, type ListingParams } from "@/features/catalog/listing";
export const metadata = { title: "Tìm kiếm | GlowUp" };
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<ListingParams>;
}) {
  const [params, categories] = await Promise.all([searchParams, getCategories()]);
  const query = params.q?.trim();
  if (!query)
    return (
      <main id="main-content" className="catalog-page site-container">
        <nav className="catalog-breadcrumb">
          <Link href="/">Trang chủ</Link> / Tìm kiếm
        </nav>
        <h1>Tìm sản phẩm bạn yêu thích</h1>
        <form action="/search" className="search-page-form">
          <input
            name="q"
            type="search"
            placeholder="Nhập tên sản phẩm hoặc thương hiệu"
            required
            maxLength={200}
          />
          <button className="button">Tìm kiếm</button>
        </form>
      </main>
    );
  return (
    <ProductListing
      title={`Kết quả tìm kiếm cho “${query}”`}
      intro="Khám phá sản phẩm phù hợp với bạn"
      base="/search"
      params={{ ...params, q: query }}
      categories={categories}
    />
  );
}
