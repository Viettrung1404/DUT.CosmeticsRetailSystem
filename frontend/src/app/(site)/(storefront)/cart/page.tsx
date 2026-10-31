import Link from "next/link";
import { CartContents } from "@/features/catalog/cart-contents";
import { ProductGrid } from "@/features/catalog/components";
import { getProducts } from "@/features/catalog/server";
export const metadata = { title: "Giỏ hàng | GlowUp", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function CartPage() {
  const products = await getProducts({ limit: 4 });
  return (
    <main id="main-content" className="catalog-page site-container cart-screen">
      <nav className="catalog-breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span>/</span>
        <span>Giỏ hàng</span>
      </nav>
      <CartContents />
      <section className="cart-recommendations">
        <h2>Gợi ý sản phẩm dành cho bạn</h2>
        <ProductGrid products={products.data} />
      </section>
    </main>
  );
}
