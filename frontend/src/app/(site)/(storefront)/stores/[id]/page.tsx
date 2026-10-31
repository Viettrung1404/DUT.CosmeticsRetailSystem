import { StoreScreen, publicDetail } from "@/features/catalog/marketing-pages";
import { getStore } from "@/features/catalog/server";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const s = await publicDetail(() => params.then(({ id }) => getStore(id)));
  return { title: s.name, description: s.address, alternates: { canonical: `/stores/${s.id}` } };
}
export default async function Page({ params }: Props) {
  return <StoreScreen id={(await params).id} />;
}
