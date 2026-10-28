import { Suspense } from "react";
import { PaymentResult } from "@/features/checkout/payment-result";
export const metadata = { title: "Kết quả thanh toán | GlowUp" };
export default function Page() {
  return (
    <main id="main-content" className="catalog-page site-container">
      <Suspense fallback={<p>Đang tải…</p>}>
        <PaymentResult />
      </Suspense>
    </main>
  );
}
