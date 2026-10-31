import { PromotionScreen, requestedPage, publicDetail } from "@/features/catalog/marketing-pages";
import { getPromotion } from "@/features/catalog/server";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> };
export async function generateMetadata({ params }: Props) {
  const p = await publicDetail(() => params.then(({ id }) => getPromotion(id)));
  return {
    title: p.name,
    description: p.description || undefined,
    alternates: { canonical: `/promotions/${p.id}` },
  };
}
export default async function Page({ params, searchParams }: Props) {
  return <PromotionScreen id={(await params).id} page={requestedPage((await searchParams).page)} />;
}
