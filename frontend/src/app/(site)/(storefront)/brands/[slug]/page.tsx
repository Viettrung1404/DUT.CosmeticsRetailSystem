import { BrandScreen, publicDetail } from "@/features/catalog/marketing-pages";
import { getBrand } from "@/features/catalog/server";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const b = await publicDetail(() => params.then(({ slug }) => getBrand(slug)));
  return {
    title: b.metaTitle || b.name,
    description: b.metaDescription || b.description || undefined,
    alternates: { canonical: `/brands/${b.slug}` },
  };
}
export default async function Page({ params }: Props) {
  return <BrandScreen slug={(await params).slug} />;
}
