import Link from "next/link";
import { CatalogImage } from "@/features/catalog/components";
import { getBrands } from "@/features/catalog/server";
export const metadata = { title: "Thương hiệu | GlowUp" };
export default async function BrandsPage() {
  const brands = await getBrands(100);
  return (
    <main id="main-content" className="catalog-page site-container">
      <nav className="catalog-breadcrumb">
        <Link href="/">Trang chủ</Link> / Thương hiệu
      </nav>
      <div className="catalog-heading">
        <div>
          <p className="catalog-overline">GLOWUP BEAUTY RETAIL</p>
          <h1>Thương Hiệu Được Yêu Thích</h1>
        </div>
      </div>
      {brands.length ? (
        <div className="home-brands">
          {brands.map((brand) => (
            <Link href={`/products?brandId=${brand.id}`} key={brand.id}>
              {brand.logoUrl ? (
                <CatalogImage src={brand.logoUrl} alt={brand.name} />
              ) : (
                <span>{brand.name.slice(0, 2).toUpperCase()}</span>
              )}
              <strong>{brand.name}</strong>
            </Link>
          ))}
        </div>
      ) : (
        <p className="catalog-empty">Thương hiệu đang được cập nhật.</p>
      )}
    </main>
  );
}
export const dynamic = "force-dynamic";
