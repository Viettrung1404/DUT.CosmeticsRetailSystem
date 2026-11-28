import { ContentLoading } from "@/shared/ui/content-loading";

export default function StorefrontLoading() {
  return (
    <main id="main-content" className="site-container loading-state">
      <ContentLoading variant="cards" label="Đang tải trang chủ GlowUp…" />
    </main>
  );
}
