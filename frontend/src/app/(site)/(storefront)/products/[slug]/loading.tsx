import { ContentLoading } from "@/shared/ui/content-loading";

export default function ProductDetailLoading() {
  return (
    <main id="main-content" className="site-container loading-state">
      <ContentLoading variant="detail" label="Đang tải thông tin sản phẩm…" />
    </main>
  );
}
