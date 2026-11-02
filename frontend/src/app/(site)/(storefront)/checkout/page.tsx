import { CheckoutPage } from "@/features/checkout/checkout-page";
export const metadata = { title: "Thanh toán | GlowUp", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <main id="main-content" className="site-container checkout-container">
      <CheckoutPage />
    </main>
  );
}
