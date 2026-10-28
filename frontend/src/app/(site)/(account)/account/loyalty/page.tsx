import { Suspense } from "react";
import { LoyaltyPage } from "@/features/post-purchase/account-benefits";
export const metadata = { title: "Điểm thưởng | GlowUp" };
export default function Page() {
  return (
    <Suspense fallback={<p>Đang tải…</p>}>
      <LoyaltyPage />
    </Suspense>
  );
}
