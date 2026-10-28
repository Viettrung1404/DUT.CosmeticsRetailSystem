import Link from "next/link";
import { CheckoutPage } from "@/features/checkout/checkout-page";
export const metadata = { title: "Thanh toán | GlowUp" };
export default function Page() {
  return (
    <main id="main-content" className="catalog-page site-container">
      <nav className="catalog-breadcrumb">
        <Link href="/cart">Giỏ hàng</Link>
        <span>/</span>
        <span>Thanh toán</span>
      </nav>
      <div className="catalog-heading">
        <div>
          <p className="catalog-overline">GLOWUP BEAUTY RETAIL</p>
          <h1>Thanh toán</h1>
        </div>
      </div>
      <CheckoutPage />
    </main>
  );
}
