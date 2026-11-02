import { ContentLoading } from "@/shared/ui/content-loading";
import { Suspense } from "react";
import { NotificationsPage } from "@/features/post-purchase/account-benefits";
export const metadata = { title: "Thông báo | GlowUp" };
export default function Page() {
  return (
    <Suspense fallback={<ContentLoading variant="list" />}>
      <NotificationsPage />
    </Suspense>
  );
}
