import { Suspense } from "react";
import { OrdersPage } from "@/features/account/account-pages";
export const metadata = { title: "Đơn hàng của tôi | GlowUp" };
export default function Page() {
  return (
    <Suspense fallback={<p>Đang tải…</p>}>
      <OrdersPage />
    </Suspense>
  );
}
