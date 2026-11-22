import { ContentLoading } from "@/shared/ui/content-loading";

export default function PromotionsLoading() {
  return (
    <main id="main-content" className="site-container loading-state">
      <ContentLoading variant="cards" label="Đang tải chương trình khuyến mãi…" />
    </main>
  );
}
