import { CmsPage, cmsMetadata } from "@/features/catalog/cms-page";
const slug = "chinh-sach-doi-tra";
export const dynamic = "force-dynamic";
export const generateMetadata = () => cmsMetadata(slug);
export default function Page() {
  return <CmsPage slug={slug} />;
}
