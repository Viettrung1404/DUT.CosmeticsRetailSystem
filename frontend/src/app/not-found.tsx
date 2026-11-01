import { NotFoundContent } from "@/features/catalog/not-found-content";
import { SiteHeader, SiteFooter } from "@/widgets/site-shell";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <NotFoundContent />
      <SiteFooter />
    </>
  );
}
