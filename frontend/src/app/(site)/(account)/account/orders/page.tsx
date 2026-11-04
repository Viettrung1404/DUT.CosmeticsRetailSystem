import { ContentLoading } from "@/shared/ui/content-loading";
import { Suspense } from "react";
import { OrdersPage } from "@/features/account/account-pages";
export const metadata = { title: "Đơn hàng của tôi" };
export default function Page() {
  return (
    <Suspense fallback={<ContentLoading variant="list" />}>
      <OrdersPage />
    </Suspense>
  );
}
