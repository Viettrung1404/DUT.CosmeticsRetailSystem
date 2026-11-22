import { ContentLoading } from "@/shared/ui/content-loading";

export default function FlashSaleLoading() {
  return (
    <main id="main-content" className="site-container loading-state">
      <ContentLoading variant="cards" label="Đang tải chương trình Flash Sale…" />
    </main>
  );
}
