import { BlogArticleScreen } from "@/features/catalog/editorial-pages";
import { publicDetail } from "@/features/catalog/marketing-pages";
import { getBlogPost } from "@/features/catalog/server";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const p = await publicDetail(() => params.then(({ slug }) => getBlogPost(slug)));
  return {
    title: p.metaTitle || p.title,
    description: p.metaDescription || p.excerpt?.replace(/<[^>]*>/g, "") || undefined,
    alternates: { canonical: `/blog/${p.slug}` },
  };
}
export default async function Page({ params }: Props) {
  return <BlogArticleScreen slug={(await params).slug} />;
}
