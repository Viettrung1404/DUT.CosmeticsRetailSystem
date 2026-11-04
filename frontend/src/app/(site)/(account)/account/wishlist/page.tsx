import { ContentLoading } from "@/shared/ui/content-loading";
import { Suspense } from "react";
import { WishlistPage } from "@/features/post-purchase/account-benefits";
export const metadata = { title: "Sản phẩm yêu thích" };
export default function Page() {
  return (
    <Suspense fallback={<ContentLoading variant="cards" />}>
      <WishlistPage />
    </Suspense>
  );
}
