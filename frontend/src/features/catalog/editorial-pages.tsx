import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  ShieldCheck,
  Sparkles,
  BookOpen,
  MessageCircle,
  HelpCircle,
  UserCheck,
} from "lucide-react";
import {
  getBlogCategories,
  getBlogPosts,
  getBlogCategoryPosts,
  getBlogPost,
  getProducts,
} from "./server";
import { CatalogImage, ProductCard } from "./components";
import {
  ContentBadge,
  ContentBreadcrumb,
  ContentEmpty,
  ContentPagination,
  contentDate,
} from "./content-layout";
import { publicDetail } from "./marketing-pages";
import { BlogView } from "./blog-view";
import { ArticleActions } from "./article-actions";

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
  const category = categorySlug
    ? categories.find((item) => item.slug === categorySlug)
    : undefined;
  if (categorySlug && !category) notFound();

  const posts = category
    ? await getBlogCategoryPosts(category.id, page)
    : await getBlogPosts(page);

  const featured = page === 1 ? posts.items[0] : undefined;
  const cards = featured ? posts.items.slice(1) : posts.items;

  return (
    <main id="main-content" className="content-page">
      <section className="content-hero content-hero-center">
        <div className="content-container">
          <ContentBreadcrumb
            current={category?.name || "Góc làm đẹp"}
            parent={category ? { href: "/blog", label: "Góc làm đẹp" } : undefined}
          />
          <ContentBadge>TẠP CHÍ LÀM ĐẸP & DƯỠNG DA KHOA HỌC</ContentBadge>
          <h1>{category?.name || "Góc Đẹp GlowUp Magazine"}</h1>
          <p>
            {category?.description ||
              "Cập nhật xu hướng dưỡng da chuẩn y khoa, phân tích hoạt chất chuyên sâu và cẩm nang lựa chọn mỹ phẩm chính hãng từ chuyên gia."}
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
                <div className="editorial-feature-meta">
                  <ContentBadge>{featured.category?.name || "BÀI VIẾT NỔI BẬT"}</ContentBadge>
                  <span className="editorial-readtime">
                    <Clock size={13} /> 4 phút đọc
                  </span>
                </div>
                <h2>{featured.title}</h2>
                <p>{textOnly(featured.excerpt)}</p>
                <div className="editorial-feature-footer">
                  <span className="content-primary">
                    Đọc toàn bộ bài viết <ArrowRight size={16} />
                  </span>
                  {featured.publishedAt && (
                    <small className="editorial-date">
                      <CalendarDays size={13} /> {contentDate(featured.publishedAt)}
                    </small>
                  )}
                </div>
              </div>
            </Link>
          </section>
        )}

        <section className="content-section">
          <div className="content-section-heading">
            <h2>{category ? `Bài viết trong “${category.name}”` : "Khám phá kiến thức mới"}</h2>
            <span className="editorial-section-sub">
              Tổng hợp kinh nghiệm và lời khuyên từ Hội đồng Dược sĩ GlowUp
            </span>
          </div>

          {cards.length ? (
            <div className="editorial-grid">
              {cards.map((post) => (
                <Link className="editorial-card" href={`/blog/${post.slug}`} key={post.id}>
                  <div className="editorial-card-thumb">
                    <CatalogImage src={post.featuredImage} alt={post.title} />
                    <span className="editorial-card-badge">
                      {post.category?.name || "Góc làm đẹp"}
                    </span>
                  </div>
                  <div>
                    <div className="editorial-card-meta">
                      <span>
                        <Clock size={12} /> 4 phút đọc
                      </span>
                      {post.publishedAt && (
                        <span>
                          <CalendarDays size={12} /> {contentDate(post.publishedAt)}
                        </span>
                      )}
                    </div>
                    <h2>{post.title}</h2>
                    <p>{textOnly(post.excerpt)}</p>
                    <span className="editorial-card-cta">
                      Đọc bài viết <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            !featured && (
              <ContentEmpty title="Bài viết đang được cập nhật">
                Đội ngũ chuyên môn đang hoàn thiện thêm bài viết mới cho chuyên mục này.
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

        {/* Beauty newsletter CTA matching Hasaki/BeautyBox */}
        <section className="blog-newsletter-banner">
          <div className="newsletter-copy">
            <span className="newsletter-pill">
              <Sparkles size={14} /> GLOWUP BEAUTY CLUB
            </span>
            <h3>Đăng Ký Nhận Cẩm Nang Làm Đẹp & Ưu Đãi 10%</h3>
            <p>
              Nhận bài viết phân tích hoạt chất, routine phục hồi da mới nhất và voucher giảm 10%
              cho đơn hàng đầu tiên của bạn.
            </p>
          </div>
          <div className="newsletter-action">
            <Link href="/faq" className="newsletter-btn">
              Xem Câu Hỏi Thường Gặp <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export async function BlogArticleScreen({ slug }: { slug: string }) {
  const post = await publicDetail(() => getBlogPost(slug));
  const { html, headings } = articleHeadings(post.content);

  // Calculate realistic reading time
  const words = post.content.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const readingTimeMin = Math.max(2, Math.ceil(words / 150));

  // Fetch 3 related posts for recommendation at bottom
  const allPosts = await getBlogPosts(1).catch(() => ({ items: [], total: 0 }));
  const relatedPosts = allPosts.items.filter((item) => item.slug !== slug).slice(0, 3);

  // Fetch recommended products for shoppable section
  const catalogProducts = await getProducts({ limit: 4 }).catch(() => ({ data: [] }));
  const recommendedProducts = catalogProducts.data.slice(0, 4);

  return (
    <main id="main-content" className="content-page">
      <div className="content-container">
        <ContentBreadcrumb
          current={post.title}
          parent={{ href: "/blog", label: "Góc làm đẹp" }}
        />

        <header className="article-header">
          <div className="article-header-top">
            <ContentBadge>{post.category?.name || "GÓC ĐẸP GLOWUP"}</ContentBadge>
            <span className="article-expert-pill">
              <ShieldCheck size={14} /> Tham vấn y khoa: Dược sĩ Da liễu GlowUp
            </span>
          </div>

          <h1>{post.title}</h1>
          {post.excerpt && <p className="article-lead">{textOnly(post.excerpt)}</p>}

          <div className="article-meta">
            <span>
              <UserCheck size={14} /> {post.author?.fullName || "Ban Chuyên Môn GlowUp"}
            </span>
            {post.publishedAt && (
              <span>
                <CalendarDays size={14} /> {contentDate(post.publishedAt)}
              </span>
            )}
            <span>
              <Clock size={14} /> {readingTimeMin} phút đọc
            </span>
            <span className="article-views">
              <BookOpen size={14} /> Đã xem: {post.viewsCount || 1}
            </span>
          </div>
        </header>

        {post.featuredImage && (
          <div className="article-cover-wrap">
            <CatalogImage className="article-cover" src={post.featuredImage} alt={post.title} />
          </div>
        )}

        <div className="article-layout">
          <aside className="policy-sidebar article-sticky-sidebar">
            {headings.length > 0 ? (
              <div className="sidebar-box">
                <h2>Trong bài viết này</h2>
                <nav className="article-toc" aria-label="Mục lục bài viết">
                  {headings.map((item) => (
                    <a key={item.id} href={`#${item.id}`}>
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            ) : (
              <div className="sidebar-box">
                <h2>Góc Đẹp GlowUp</h2>
                <Link href="/blog">
                  Khám phá bài viết khác <ArrowRight size={15} />
                </Link>
              </div>
            )}

            {/* Social Share actions */}
            <ArticleActions title={post.title} />

            {/* Skin Care Assistance Card */}
            <div className="sidebar-skin-card">
              <div className="skin-card-badge">
                <Sparkles size={14} /> TƯ VẤN ROUTINE
              </div>
              <h3>Chưa Rõ Da Bạn Hợp Sản Phẩm Nào?</h3>
              <p>
                Đội ngũ Dược sĩ GlowUp sẵn sàng phân tích tình trạng da và thiết kế chu trình phù hợp.
              </p>
              <Link href="/faq" className="skin-card-btn">
                <HelpCircle size={15} /> Hỏi đáp nhanh
              </Link>
            </div>
          </aside>

          <div className="article-main-column">
            <article className="article-body" dangerouslySetInnerHTML={{ __html: html }} />

            {/* Medical Expert E-A-T Signature */}
            <div className="article-expert-signature">
              <div className="expert-avatar">
                <ShieldCheck size={28} />
              </div>
              <div className="expert-info">
                <h4>Biên soạn & Kiểm duyệt chuyên môn</h4>
                <p>
                  Bài viết được tổng hợp từ các tài liệu Dược mỹ phẩm chuẩn hóa và kiểm nghiệm thực
                  tế bởi Hội đồng Dược sĩ GlowUp. Thông tin mang tính chất định hướng khoa học, giúp
                  bạn xây dựng chu trình dưỡng da an toàn và hiệu quả nhất.
                </p>
              </div>
            </div>

            {/* Shoppable Products embedded in article */}
            {recommendedProducts.length > 0 && (
              <section className="article-shoppable-section">
                <div className="shoppable-header">
                  <div>
                    <span className="shoppable-badge">
                      <Sparkles size={14} /> GỢI Ý MUA SẮM
                    </span>
                    <h3>Sản Phẩm Được Chuyên Gia Khuyên Dùng</h3>
                  </div>
                  <Link href="/products" className="shoppable-link">
                    Xem tất cả sản phẩm <ArrowRight size={15} />
                  </Link>
                </div>
                <div className="shoppable-grid">
                  {recommendedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}

            {/* Related Articles Section */}
            {relatedPosts.length > 0 && (
              <section className="article-related-section">
                <div className="content-section-heading">
                  <h2>Bài viết cùng chuyên đề bạn có thể quan tâm</h2>
                </div>
                <div className="editorial-grid">
                  {relatedPosts.map((related) => (
                    <Link
                      className="editorial-card"
                      href={`/blog/${related.slug}`}
                      key={related.id}
                    >
                      <div className="editorial-card-thumb">
                        <CatalogImage src={related.featuredImage} alt={related.title} />
                      </div>
                      <div>
                        <small>{related.category?.name || "Góc làm đẹp"}</small>
                        <h2>{related.title}</h2>
                        <p>{textOnly(related.excerpt)}</p>
                        <span>Đọc bài viết →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <BlogView slug={post.slug} />
      </div>
    </main>
  );
}
