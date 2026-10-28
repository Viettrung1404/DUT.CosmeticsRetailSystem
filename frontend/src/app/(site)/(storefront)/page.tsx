import Link from "next/link";
import {
  getBrands,
  getCategories,
  getFlashCards,
  getPosts,
  getProducts,
} from "@/features/catalog/server";
import { CatalogImage, ProductGrid, SectionTitle } from "@/features/catalog/components";
import { BrandCarousel, CategoryCarousel, DealCarousel } from "@/features/catalog/home-carousels";
import { FlashCountdown, HomeMotion } from "@/features/catalog/home-motion";

export const metadata = {
  title: "GlowUp | Mỹ phẩm và chăm sóc sắc đẹp",
  description: "Khám phá sản phẩm chăm sóc da và trang điểm tại GlowUp.",
};
export default async function HomePage() {
  const [categories, bestsellers, brands, posts, flash] = await Promise.allSettled([
    getCategories(),
    getProducts({ sortBy: "bestseller", limit: 5 }),
    getBrands(16),
    getPosts(),
    getFlashCards(),
  ]);
  const cats = categories.status === "fulfilled" ? categories.value : [];
  const popular = bestsellers.status === "fulfilled" ? bestsellers.value.data : [];
  const displayCategories = [...cats, ...cats.flatMap((category) => category.children)].slice(0, 6);
  const brandList = brands.status === "fulfilled" ? brands.value : [];
  const articles = posts.status === "fulfilled" ? posts.value.items : [];
  const deals = flash.status === "fulfilled" ? flash.value : [];
  const dealEndDate = deals.map((deal) => deal.endDate).sort()[0];
  return (
    <main id="main-content" className="home-page site-container">
      <HomeMotion />
      <section className="home-hero">
        <div
          className="home-hero-main"
          style={{
            backgroundImage:
              "linear-gradient(90deg,rgba(49,20,30,.65),rgba(49,20,30,.05)),url('/images/stitch/home/editorial-1.jpg')",
          }}
        >
          <div className="home-hero-copy">
            <span className="home-kicker">GLOWUP BEAUTY RETAIL</span>
            <h1>Sắc Đẹp Theo Cách Của Bạn</h1>
            <p>Khám phá thế giới mỹ phẩm và chăm sóc da dành riêng cho bạn.</p>
            <Link className="home-white-button" href="/products">
              Khám phá ngay →
            </Link>
          </div>
        </div>
        <div className="home-hero-side">
          <Link
            href="/categories/cham-soc-da"
            className="home-mini-hero"
            style={{
              backgroundImage:
                "linear-gradient(90deg,rgba(37,35,42,.64),transparent),url('/images/stitch/home/editorial-2.jpg')",
            }}
          >
            <span>Dưỡng Da Căng Mọng</span>
            <strong>Khởi đầu từ làn da khỏe</strong>
            <small>Mua ngay →</small>
          </Link>
          <Link
            href="/categories/trang-diem"
            className="home-mini-hero"
            style={{
              backgroundImage:
                "linear-gradient(90deg,rgba(71,16,42,.64),transparent),url('/images/stitch/home/editorial-3.jpg')",
            }}
          >
            <span>Bộ sưu tập mới</span>
            <strong>BST Son Velvet Mới</strong>
            <small>Khám phá →</small>
          </Link>
        </div>
      </section>
      <section className="home-trust" aria-label="Lợi ích khi mua sắm">
        <div>
          <span>✦</span>
          <strong>100% Mỹ Phẩm Chính Hãng</strong>
          <small>Nguồn gốc rõ ràng</small>
        </div>
        <div>
          <span>◷</span>
          <strong>Giao Hàng Thuận Tiện</strong>
          <small>Theo dõi đơn hàng dễ dàng</small>
        </div>
        <div>
          <span>♡</span>
          <strong>Tích Điểm GlowUp Rewards</strong>
          <small>Ưu đãi dành cho thành viên</small>
        </div>
      </section>
      <section className="home-section">
        <SectionTitle
          title="Khám Phá Theo Danh Mục"
          href="/products"
          linkText="Xem tất cả danh mục"
        />
        {displayCategories.length ? (
          <CategoryCarousel categories={displayCategories} />
        ) : (
          <p className="catalog-empty">Danh mục đang được cập nhật.</p>
        )}
      </section>
      <section className="home-section home-deals">
        <div className="home-deal-title">
          <div>
            <span className="home-kicker">ƯU ĐÃI DÀNH CHO BẠN</span>
            <h2>DEAL ĐẸP CÓ HẠN ⚡</h2>
          </div>
          {dealEndDate && <FlashCountdown endDate={dealEndDate} />}
          <Link href="/flash-sale">Xem tất cả →</Link>
        </div>
        <DealCarousel cards={deals} />
      </section>
      <section className="home-section">
        <SectionTitle
          title="Bán Chạy Nhất"
          href="/products?sortBy=bestseller"
          linkText="Xem thêm sản phẩm"
        />
        <ProductGrid products={popular} />
      </section>
      <section className="home-editorials">
        <Link
          href="/categories/cham-soc-da"
          style={{
            backgroundImage:
              "linear-gradient(90deg,rgba(34,29,35,.6),transparent),url('/images/stitch/home/editorial-4.jpg')",
          }}
        >
          <span>BỘ SƯU TẬP CHĂM SÓC DA</span>
          <h3>Bắt Đầu Từ Làn Da Khỏe</h3>
          <small>Khám phá ngay →</small>
        </Link>
        <Link
          href="/categories/trang-diem"
          style={{
            backgroundImage:
              "linear-gradient(90deg,rgba(50,20,37,.6),transparent),url('/images/stitch/home/editorial-5.jpg')",
          }}
        >
          <span>GLOWUP MAKEUP</span>
          <h3>Bộ Sưu Tập Sắc Son Thời Thượng</h3>
          <small>Khám phá ngay →</small>
        </Link>
      </section>
      <section className="home-section home-brand-section">
        <SectionTitle
          title="Thương Hiệu Được Yêu Thích"
          href="/brands"
          linkText="Xem thương hiệu"
        />
        {brandList.length ? (
          <BrandCarousel brands={brandList} />
        ) : (
          <p className="catalog-empty">Thương hiệu đang được cập nhật.</p>
        )}
      </section>
      <section className="home-section home-concerns">
        <SectionTitle title="Khám Phá Theo Nhu Cầu Da Của Bạn" />
        <div>
          {[
            { icon: "💧", title: "Dưỡng ẩm sâu", tag: "dưỡng ẩm" },
            { icon: "✦", title: "Kiềm dầu & Lỗ chân lông", tag: "kiềm dầu" },
            { icon: "♡", title: "Phục hồi nhạy cảm", tag: "phục hồi" },
            { icon: "☀", title: "Làm sáng & Mờ thâm", tag: "làm sáng" },
            { icon: "◷", title: "Chống lão hóa", tag: "chống lão hóa" },
          ].map((item) => (
            <Link key={item.tag} href={`/products?tag=${encodeURIComponent(item.tag)}`}>
              <span>{item.icon}</span>
              <strong>{item.title}</strong>
            </Link>
          ))}
        </div>
      </section>
      <section className="home-section home-blog">
        <SectionTitle title="Góc Đẹp GlowUp" href="/blog" linkText="Xem tất cả bài viết" />
        {articles.length ? (
          <div className="home-articles">
            {articles.map((article) => (
              <Link href={`/blog/${article.slug}`} key={article.id}>
                <CatalogImage src={article.featuredImage} alt={article.title} />
                <div>
                  <small>{article.category?.name || "Góc làm đẹp"}</small>
                  <h3>{article.title}</h3>
                  <p>{article.excerpt?.replace(/<[^>]*>/g, "")}</p>
                  <span>Đọc bài viết →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="catalog-empty">Bài viết đang được cập nhật.</p>
        )}
      </section>
    </main>
  );
}
export const dynamic = "force-dynamic";
