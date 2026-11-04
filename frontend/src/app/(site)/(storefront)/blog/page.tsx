import { BlogScreen } from "@/features/catalog/editorial-pages";
import { requestedPage } from "@/features/catalog/marketing-pages";
export const dynamic = "force-dynamic";
export const metadata = { title: "Góc làm đẹp", alternates: { canonical: "/blog" } };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return <BlogScreen page={requestedPage((await searchParams).page)} />;
}
