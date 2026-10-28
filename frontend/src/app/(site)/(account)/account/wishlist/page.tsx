import { Suspense } from "react";
import { WishlistPage } from "@/features/post-purchase/account-benefits";
export const metadata = { title: "Sản phẩm yêu thích | GlowUp" };
export default function Page() {
  return (
    <Suspense fallback={<p>Đang tải…</p>}>
      <WishlistPage />
    </Suspense>
  );
}
