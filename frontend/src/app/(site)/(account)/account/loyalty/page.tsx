import { ContentLoading } from "@/shared/ui/content-loading";
import { Suspense } from "react";
import { LoyaltyPage } from "@/features/post-purchase/account-benefits";
export const metadata = { title: "Điểm thưởng" };
export default function Page() {
  return (
    <Suspense fallback={<ContentLoading variant="list" />}>
      <LoyaltyPage />
    </Suspense>
  );
}
