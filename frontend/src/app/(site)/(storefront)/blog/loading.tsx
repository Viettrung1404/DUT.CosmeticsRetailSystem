import { ContentLoading } from "@/shared/ui/content-loading";

export default function BlogLoading() {
  return (
    <main id="main-content" className="site-container loading-state">
      <ContentLoading variant="list" label="Đang tải bài viết làm đẹp…" />
    </main>
  );
}
