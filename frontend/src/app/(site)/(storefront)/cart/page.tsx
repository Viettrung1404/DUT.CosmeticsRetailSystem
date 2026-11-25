import Link from "next/link";
import { CartContents } from "@/features/catalog/cart-contents";
import { CartRecommendationsSection } from "@/features/recommendations/recommendation-section";

export const metadata = { title: "Giỏ hàng", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function CartPage() {
  return (
    <main id="main-content" className="catalog-page site-container cart-screen">
      <nav className="catalog-breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span>/</span>
        <span>Giỏ hàng</span>
      </nav>
      <CartContents />
      <CartRecommendationsSection />
    </main>
  );
}
