import Link from "next/link";
import { CartContents } from "@/features/catalog/cart-contents";
export const metadata = { title: "Giỏ hàng | GlowUp" };
export default function CartPage() {
  return (
    <main id="main-content" className="catalog-page site-container">
      <nav className="catalog-breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span>/</span>
        <span>Giỏ hàng</span>
      </nav>
      <div className="catalog-heading">
        <div>
          <p className="catalog-overline">GLOWUP BEAUTY RETAIL</p>
          <h1>Giỏ hàng của bạn</h1>
        </div>
      </div>
      <CartContents />
    </main>
  );
}
