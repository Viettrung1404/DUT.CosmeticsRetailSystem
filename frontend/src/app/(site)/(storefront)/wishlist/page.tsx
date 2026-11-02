import { ContentLoading } from "@/shared/ui/content-loading";
import { Suspense } from "react";
import { WishlistPage } from "@/features/post-purchase/account-benefits";

export const metadata = { title: "Sản phẩm yêu thích | GlowUp" };

export default function Page() {
  return (
    <main id="main-content" className="site-container account-main">
      <Suspense fallback={<ContentLoading variant="cards" />}>
        <WishlistPage />
      </Suspense>
    </main>
  );
}
