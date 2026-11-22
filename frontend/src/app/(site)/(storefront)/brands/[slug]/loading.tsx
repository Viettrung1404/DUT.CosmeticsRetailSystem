import { ContentLoading } from "@/shared/ui/content-loading";

export default function BrandDetailLoading() {
  return (
    <main id="main-content" className="site-container loading-state">
      <ContentLoading variant="cards" label="Đang tải thương hiệu…" />
    </main>
  );
}
