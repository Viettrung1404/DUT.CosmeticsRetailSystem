import { Suspense } from "react";
import { CheckoutPage } from "@/features/checkout/checkout-page";
import { ContentLoading } from "@/shared/ui/content-loading";

export const metadata = { title: "Thanh toán", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <main id="main-content" className="site-container checkout-container">
      <Suspense fallback={<ContentLoading variant="checkout" label="Đang tải thông tin thanh toán…" />}>
        <CheckoutPage />
      </Suspense>
    </main>
  );
}
