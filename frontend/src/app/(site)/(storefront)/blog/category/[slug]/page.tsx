import { notFound } from "next/navigation";
import { BlogScreen } from "@/features/catalog/editorial-pages";
import { requestedPage } from "@/features/catalog/marketing-pages";
import { getBlogCategories } from "@/features/catalog/server";
import { metadataTitle } from "@/shared/config/metadata";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const c = (await getBlogCategories()).find((item) => item.slug === slug);
  if (!c) notFound();
  return {
    title: `${metadataTitle(c.name, "Chuyên mục")} – Góc làm đẹp`,
    description: c.description || undefined,
    alternates: { canonical: `/blog/category/${c.slug}` },
  };
}
export default async function Page({ params, searchParams }: Props) {
  return (
    <BlogScreen
      categorySlug={(await params).slug}
      page={requestedPage((await searchParams).page)}
    />
  );
}
