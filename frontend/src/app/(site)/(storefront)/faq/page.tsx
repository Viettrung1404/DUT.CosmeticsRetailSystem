import { getFaqs } from "@/features/catalog/server";
import { FaqList } from "@/features/catalog/faq-list";
export const dynamic = "force-dynamic";
export const metadata = { title: "C?u h?i th??ng g?p", alternates: { canonical: "/faq" } };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <main id="main-content" className="content-page">
      <FaqList groups={await getFaqs()} initialQuery={(await searchParams).q || ""} />
    </main>
  );
}
