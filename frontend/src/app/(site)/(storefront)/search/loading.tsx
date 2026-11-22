import { ContentLoading } from "@/shared/ui/content-loading";

export default function SearchLoading() {
  return (
    <main id="main-content" className="site-container loading-state">
      <ContentLoading variant="cards" label="Đang tìm kiếm sản phẩm…" />
    </main>
  );
}
