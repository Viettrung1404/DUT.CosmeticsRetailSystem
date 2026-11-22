import { ContentLoading } from "@/shared/ui/content-loading";

export default function BrandsLoading() {
  return (
    <main id="main-content" className="site-container loading-state">
      <ContentLoading variant="cards" label="Đang tải danh sách thương hiệu…" />
    </main>
  );
}
