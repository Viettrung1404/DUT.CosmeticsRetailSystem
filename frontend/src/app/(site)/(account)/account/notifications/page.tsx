import { Suspense } from "react";
import { NotificationsPage } from "@/features/post-purchase/account-benefits";
export const metadata = { title: "Thông báo | GlowUp" };
export default function Page() {
  return (
    <Suspense fallback={<p>Đang tải…</p>}>
      <NotificationsPage />
    </Suspense>
  );
}
