import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/shared/api/errors";
import { CatalogImage } from "@/features/catalog/components";
import { getBlogPost } from "@/features/catalog/server";
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let post;
  try {
    post = await getBlogPost(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <main id="main-content" className="catalog-page site-container blog-post">
      <nav className="catalog-breadcrumb">
        <Link href="/">Trang chủ</Link> / <Link href="/blog">Góc đẹp GlowUp</Link> / {post.title}
      </nav>
      <h1>{post.title}</h1>
      {post.featuredImage && <CatalogImage src={post.featuredImage} alt={post.title} />}
      <article dangerouslySetInnerHTML={{ __html: post.content }} />
    </main>
  );
}
