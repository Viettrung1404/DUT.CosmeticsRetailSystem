import { ContentLoading } from "@/shared/ui/content-loading";

export default function NewArrivalsLoading() {
  return (
    <main id="main-content" className="site-container loading-state">
      <ContentLoading variant="cards" label="Đang tải hàng mới về…" />
    </main>
  );
}
