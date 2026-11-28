import { PromotionsScreen, requestedPage } from "@/features/catalog/marketing-pages";
export const dynamic = "force-dynamic";
export const metadata = { title: "Khuyến mãi", alternates: { canonical: "/promotions" } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params.tab === "flash-sale" ? "flash-sale" : "campaigns";
  return <PromotionsScreen page={requestedPage(params.page)} initialTab={initialTab} />;
}
