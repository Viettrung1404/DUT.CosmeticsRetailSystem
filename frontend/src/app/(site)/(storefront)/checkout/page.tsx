import Link from "next/link";
import { CheckoutPage } from "@/features/checkout/checkout-page";
import { CheckoutSteps } from "@/features/account/account-ui";
export const metadata = { title: "Thanh toán | GlowUp", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <main id="main-content" className="catalog-page site-container">
      <nav className="catalog-breadcrumb">
        <Link href="/cart">Giỏ hàng</Link>
        <span>/</span>
        <span>Thanh toán</span>
      </nav>
      <CheckoutSteps current={1} />
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
