import { PromotionsScreen, requestedPage } from "@/features/catalog/marketing-pages";
export const dynamic = "force-dynamic";
export const metadata = { title: "Khuyến mãi", alternates: { canonical: "/promotions" } };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return <PromotionsScreen page={requestedPage((await searchParams).page)} />;
}
