import { ContentLoading } from "@/shared/ui/content-loading";

export default function ProductsLoading() {
  return (
    <main id="main-content" className="site-container loading-state">
      <ContentLoading variant="cards" label="Đang tải danh sách sản phẩm…" />
    </main>
  );
}
