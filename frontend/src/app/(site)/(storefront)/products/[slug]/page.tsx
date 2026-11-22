import type { Metadata } from "next";
import { metadataTitle } from "@/shared/config/metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/shared/api/errors";
import { getProduct, getRelated, getReviews } from "@/features/catalog/server";
import { ProductGrid, SectionTitle } from "@/features/catalog/components";
import { ProductGallery } from "@/features/catalog/product-gallery";
import { ProductPurchase } from "@/features/catalog/product-purchase";
import { FavoriteButton } from "@/features/catalog/favorite-button";
import { ProductTabs } from "@/features/catalog/product-tabs";
import { ReviewForm } from "@/features/post-purchase/review-form";
import { cache, Suspense } from "react";

function plainText(html: string) {
  return html
    .replace(/<\/(?:p|h[1-6]|li|ul|ol)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s*\n\s*/g, "\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

const load = cache(async (slug: string) => {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await load(slug);
  return {
    title: metadataTitle(product.name, "Chi tiết sản phẩm"),
    description: product.shortDescription || product.name,
    openGraph: product.primaryImage ? { images: [product.primaryImage] } : undefined,
  };
}

async function ReviewsContent({ productId }: { productId: string }) {
  try {
    const reviews = await getReviews(productId);
    return (
      <div className="pdp-reviews">
        <h2>Đánh giá sản phẩm</h2>
        <ReviewForm productId={productId} />
        {reviews.items.length ? (
          reviews.items.map((review) => (
            <article key={review.id} className="pdp-review">
              <strong>{review.reviewerName || "Khách hàng GlowUp"}</strong>
              <span> {"★".repeat(review.rating)}</span>
              <p>{review.title}</p>
              <p>{review.content}</p>
            </article>
          ))
        ) : (
          <p>Chưa có đánh giá cho sản phẩm này.</p>
        )}
      </div>
    );
  } catch {
    return (
      <div className="pdp-reviews">
        <h2>Đánh giá sản phẩm</h2>
        <ReviewForm productId={productId} />
        <p>Chưa tải được đánh giá. Vui lòng thử lại sau.</p>
      </div>
    );
  }
}

async function RelatedContent({ productId }: { productId: string }) {
  try {
    const related = await getRelated(productId);
    if (!related.length) return null;
    return (
      <section className="pdp-related">
        <SectionTitle title="Sản phẩm thường được mua cùng" href="/products" />
        <ProductGrid products={related} />
      </section>
    );
  } catch {
    return null;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await load(slug);
  const gallery = product.images?.length
    ? [...product.images].sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary))
    : product.primaryImage
      ? [{ imageUrl: product.primaryImage, altText: product.name }]
      : [];

  return (
    <main id="main-content" className="pdp-page site-container">
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span>/</span>
        <Link href="/products">Sản phẩm</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <div className="pdp-main">
        <ProductGallery images={gallery} name={product.name} />
        <div className="pdp-summary">
          <p className="catalog-overline">{product.brandName || "GLOWUP BEAUTY"}</p>
          <div className="pdp-title-row">
            <h1>{product.name}</h1>
            <FavoriteButton
              productId={product.id}
              slug={product.slug}
              name={product.name}
              className="pdp-favorite"
            />
          </div>
          <p className="catalog-rating">
            ★ {product.avgRating.toFixed(1)} <span>({product.totalReviews} đánh giá)</span>
          </p>
          {product.shortDescription && <p className="pdp-short">{product.shortDescription}</p>}
          <ProductPurchase
            productId={product.id}
            variants={product.variants}
            option1Name={product.option1Name}
            option2Name={product.option2Name}
            canTryOn={/\bson\b|lip(?:stick| tint| gloss| mousse| lacquer)/i.test(product.name)}
          />
          <div className="pdp-benefits">
            <span>✓ Sản phẩm chính hãng</span>
            <span>✓ Theo dõi đơn hàng trong tài khoản</span>
            <span>✓ Đổi trả theo chính sách 7 ngày</span>
          </div>
        </div>
      </div>
      <ProductTabs
        description={plainText(
          product.description ||
            product.shortDescription ||
            "Thông tin sản phẩm đang được cập nhật.",
        )}
        ingredients={product.ingredients ?? []}
        brand={product.brandName}
        category={product.categoryName}
        reviewCount={product.totalReviews}
        reviews={
          <Suspense fallback={<p>Đang tải đánh giá...</p>}>
            <ReviewsContent productId={product.id} />
          </Suspense>
        }
      />
      <Suspense fallback={null}>
        <RelatedContent productId={product.id} />
      </Suspense>
    </main>
  );
}
