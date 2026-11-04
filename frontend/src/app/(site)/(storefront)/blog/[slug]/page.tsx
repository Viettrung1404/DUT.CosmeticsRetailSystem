import { BlogArticleScreen } from "@/features/catalog/editorial-pages";
import { publicDetail } from "@/features/catalog/marketing-pages";
import { getBlogPost } from "@/features/catalog/server";
import { metadataTitle } from "@/shared/config/metadata";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const p = await publicDetail(() => params.then(({ slug }) => getBlogPost(slug)));
  return {
    title: metadataTitle(p.metaTitle, p.title),
    description: p.metaDescription || p.excerpt?.replace(/<[^>]*>/g, "") || undefined,
    alternates: { canonical: `/blog/${p.slug}` },
  };
}
export default async function Page({ params }: Props) {
  return <BlogArticleScreen slug={(await params).slug} />;
}
