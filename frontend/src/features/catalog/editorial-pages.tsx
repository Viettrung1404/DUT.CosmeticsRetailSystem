import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays } from "lucide-react";
import { getBlogCategories, getBlogPosts, getBlogCategoryPosts, getBlogPost } from "./server";
import { CatalogImage } from "./components";
import {
  ContentBadge,
  ContentBreadcrumb,
  ContentEmpty,
  ContentPagination,
  contentDate,
} from "./content-layout";
import { publicDetail } from "./marketing-pages";
import { BlogView } from "./blog-view";
export function articleHeadings(content: string) {
  const headings: { id: string; text: string }[] = [];
  const html = content.replace(
    /<h([23])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
    (_match, level, text) => {
      const id = `section-${headings.length + 1}`;
      headings.push({
        id,
        text: text
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'"),
      });
      return `<h${level} id="${id}">${text}</h${level}>`;
    },
  );
  return { html, headings };
}
const textOnly = (value?: string | null) => value?.replace(/<[^>]*>/g, "") || "";
export async function BlogScreen({ page, categorySlug }: { page: number; categorySlug?: string }) {
  const categories = await getBlogCategories();
  const category = categorySlug ? categories.find((item) => item.slug === categorySlug) : undefined;
  if (categorySlug && !category) notFound();
  const posts = category ? await getBlogCategoryPosts(category.id, page) : await getBlogPosts(page);
  const featured = page === 1 ? posts.items[0] : undefined;
  const cards = featured ? posts.items.slice(1) : posts.items;
  return (
    <main id="main-content" className="content-page">
      <section className="content-hero content-hero-center">
        <div className="content-container">
          <ContentBreadcrumb
            current={category?.name || "Góc đẹp GlowUp"}
            parent={category ? { href: "/blog", label: "Góc đẹp GlowUp" } : undefined}
          />
          <ContentBadge>TẠP CHÍ LÀM ĐẸP</ContentBadge>
          <h1>{category?.name || "Góc Đẹp GlowUp"}</h1>
          <p>
            {category?.description ||
              "Cảm hứng làm đẹp, bí quyết chăm sóc da và những câu chuyện dành cho bạn."}
          </p>
        </div>
      </section>
      <div className="content-container">
        <nav className="content-pills" aria-label="Danh mục bài viết" style={{ marginTop: 24 }}>
          <Link href="/blog" aria-current={!category ? "page" : undefined}>
            Tất cả bài viết
          </Link>
          {categories.map((item) => (
            <Link
              key={item.id}
              href={`/blog/category/${item.slug}`}
              aria-current={category?.id === item.id ? "page" : undefined}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        {featured && (
          <section className="content-section">
            <Link className="editorial-feature" href={`/blog/${featured.slug}`}>
              <CatalogImage src={featured.featuredImage} alt={featured.title} />
              <div>
                <ContentBadge>{featured.category?.name || "BÀI VIẾT NỔI BẬT"}</ContentBadge>
                <h2>{featured.title}</h2>
                <p>{textOnly(featured.excerpt)}</p>
                <span className="content-primary">
                  Đọc bài viết <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          </section>
        )}
        <section className="content-section">
          <div className="content-section-heading">
            <h2>{category ? "Bài viết trong chuyên mục" : "Khám phá thêm"}</h2>
          </div>
          {cards.length ? (
            <div className="editorial-grid">
              {cards.map((post) => (
                <Link className="editorial-card" href={`/blog/${post.slug}`} key={post.id}>
                  <CatalogImage src={post.featuredImage} alt={post.title} />
                  <div>
                    <small>{post.category?.name || "GÓC LÀM ĐẸP"}</small>
                    <h2>{post.title}</h2>
                    <p>{textOnly(post.excerpt)}</p>
                    <span>Đọc bài viết →</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            !featured && (
              <ContentEmpty title="Bài viết đang được cập nhật">
                Quay lại để khám phá các nội dung làm đẹp mới từ GlowUp.
              </ContentEmpty>
            )
          )}
          <ContentPagination
            page={page}
            total={posts.total}
            limit={12}
            base={category ? `/blog/category/${category.slug}` : "/blog"}
          />
        </section>
      </div>
    </main>
  );
}
export async function BlogArticleScreen({ slug }: { slug: string }) {
  const post = await publicDetail(() => getBlogPost(slug));
  const { html, headings } = articleHeadings(post.content);
  return (
    <main id="main-content" className="content-page">
      <div className="content-container">
        <ContentBreadcrumb
          current={post.title}
          parent={{ href: "/blog", label: "Góc đẹp GlowUp" }}
        />
        <header className="article-header">
          <ContentBadge>{post.category?.name || "GÓC ĐẸP GLOWUP"}</ContentBadge>
          <h1>{post.title}</h1>
          {post.excerpt && <p>{textOnly(post.excerpt)}</p>}
          <div className="article-meta">
            {post.author?.fullName && <span>Bởi {post.author.fullName}</span>}
            {post.publishedAt && (
              <span>
                <CalendarDays size={14} style={{ display: "inline", marginRight: 5 }} />
                {contentDate(post.publishedAt)}
              </span>
            )}
          </div>
        </header>
        {post.featuredImage && (
          <CatalogImage className="article-cover" src={post.featuredImage} alt={post.title} />
        )}
        <div className="article-layout">
          {headings.length > 0 ? (
            <aside className="policy-sidebar">
              <h2>Trong bài viết này</h2>
              {headings.map((item) => (
                <a key={item.id} href={`#${item.id}`}>
                  {item.text}
                </a>
              ))}
            </aside>
          ) : (
            <aside className="policy-sidebar">
              <h2>Góc đẹp GlowUp</h2>
              <Link href="/blog">
                Khám phá bài viết khác <ArrowRight size={15} />
              </Link>
            </aside>
          )}
          <article className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        <BlogView slug={post.slug} />
      </div>
    </main>
  );
}
