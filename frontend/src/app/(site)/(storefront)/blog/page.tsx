import Link from "next/link";
import { CatalogImage } from "@/features/catalog/components";
import { getBlogPosts } from "@/features/catalog/server";
export const metadata = { title: "Góc Đẹp GlowUp" };
export default async function BlogPage() {
  const posts = await getBlogPosts();
  return (
    <main id="main-content" className="catalog-page site-container">
      <nav className="catalog-breadcrumb">
        <Link href="/">Trang chủ</Link> / Góc đẹp GlowUp
      </nav>
      <div className="catalog-heading">
        <div>
          <p className="catalog-overline">GLOWUP BEAUTY RETAIL</p>
          <h1>Góc Đẹp GlowUp</h1>
        </div>
      </div>
      {posts.items.length ? (
        <div className="home-articles">
          {posts.items.map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.id}>
              <CatalogImage src={post.featuredImage} alt={post.title} />
              <div>
                <small>{post.category?.name || "Góc làm đẹp"}</small>
                <h3>{post.title}</h3>
                <p>{post.excerpt?.replace(/<[^>]*>/g, "")}</p>
                <span>Đọc bài viết →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="catalog-empty">Bài viết đang được cập nhật.</p>
      )}
    </main>
  );
}
export const dynamic = "force-dynamic";
