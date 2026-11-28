import { ContentLoading } from "@/shared/ui/content-loading";

export default function CartLoading() {
  return (
    <main id="main-content" className="site-container loading-state">
      <ContentLoading variant="cart" label="Đang tải giỏ hàng…" />
    </main>
  );
}
