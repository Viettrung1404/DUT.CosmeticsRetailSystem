import { CheckoutPage } from "@/features/checkout/checkout-page";
export const metadata = { title: "Thanh toán", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <main id="main-content" className="site-container checkout-container">
      <CheckoutPage />
    </main>
  );
}
