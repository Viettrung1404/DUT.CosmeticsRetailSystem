import { ContentLoading } from "@/shared/ui/content-loading";

export default function Loading() {
  return (
    <main id="main-content" className="site-container checkout-container">
      <ContentLoading variant="checkout" label="Đang tải thông tin thanh toán…" />
    </main>
  );
}
