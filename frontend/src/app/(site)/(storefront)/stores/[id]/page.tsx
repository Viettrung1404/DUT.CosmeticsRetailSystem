import { StoreScreen, publicDetail } from "@/features/catalog/marketing-pages";
import { getStore } from "@/features/catalog/server";
import { metadataTitle } from "@/shared/config/metadata";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const s = await publicDetail(() => params.then(({ id }) => getStore(id)));
  return {
    title: metadataTitle(s.name, "Chi tiết cửa hàng"),
    description: s.address,
    alternates: { canonical: `/stores/${s.id}` },
  };
}
export default async function Page({ params }: Props) {
  return <StoreScreen id={(await params).id} />;
}
