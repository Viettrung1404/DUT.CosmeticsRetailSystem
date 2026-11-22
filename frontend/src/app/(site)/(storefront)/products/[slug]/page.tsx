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
import { ProductReviews } from "@/features/catalog/product-reviews";
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

async function ReviewsContent({
  productId,
  avgRating,
  totalReviews,
  variants,
}: {
  productId: string;
  avgRating: number;
  totalReviews: number;
  variants: Array<{ option1Value?: string | null; option2Value?: string | null }>;
}) {
  const variantNames = variants
    .map((v) => [v.option1Value, v.option2Value].filter(Boolean).join(" · "))
    .filter(Boolean);

  try {
    const reviews = await getReviews(productId);
    return (
      <ProductReviews
        productId={productId}
        avgRating={reviews.avgRating || avgRating}
        totalReviews={reviews.total || totalReviews}
        histogram={reviews.histogram}
        initialReviews={reviews.items}
        variantNames={variantNames}
      />
    );
  } catch {
    return (
      <ProductReviews
        productId={productId}
        avgRating={avgRating}
        totalReviews={totalReviews}
        variantNames={variantNames}
      />
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
        <span className="breadcrumb-separator">&gt;</span>
        <Link href="/products">Sản phẩm</Link>
        {product.categoryName && (
          <>
            <span className="breadcrumb-separator">&gt;</span>
            <span>{product.categoryName}</span>
          </>
        )}
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-current">{product.name}</span>
      </nav>
      <div className="pdp-main">
        <ProductGallery
          images={gallery}
          name={product.name}
          productId={product.id}
          slug={product.slug}
          videoUrl={product.videoUrl}
        />
        <div className="pdp-summary">
          <div className="pdp-header">
            <div className="pdp-title-row">
              <h1 className="pdp-title">{product.name}</h1>
            </div>
            <div className="pdp-meta-row">
              <span>
                Thương hiệu:{" "}
                <strong className="pdp-brand-name">{product.brandName || "GLOWUP BEAUTY"}</strong>
              </span>
              <span className="pdp-meta-sep">|</span>
              <span>
                Mã SKU: <strong>{product.variants[0]?.sku || "GLW-01"}</strong>
              </span>
            </div>
            <div className="pdp-rating-row">
              <div className="pdp-rating-score">
                <span className="pdp-score-num">
                  {product.avgRating ? product.avgRating.toFixed(1) : "4.9"}
                </span>
                <span className="pdp-stars">★★★★★</span>
              </div>
              <span className="pdp-rating-sep">|</span>
              <div className="pdp-rating-stat">
                <strong>{product.totalReviews || "1k"}</strong> <span>Đánh Giá</span>
              </div>
              <span className="pdp-rating-sep">|</span>
              <div className="pdp-rating-stat">
                <strong>
                  {product.totalSold
                    ? product.totalSold >= 1000
                      ? `${(product.totalSold / 1000).toFixed(0)}k+`
                      : product.totalSold
                    : "8k+"}
                </strong>{" "}
                <span>Đã Bán</span>
              </div>
              <button type="button" className="pdp-report-btn">
                Tố cáo
              </button>
            </div>
          </div>
          <ProductPurchase
            productId={product.id}
            slug={product.slug}
            productName={product.name}
            brandName={product.brandName}
            basePrice={product.basePrice}
            salePrice={product.salePrice}
            effectivePrice={product.effectivePrice}
            variants={product.variants}
            images={product.images}
            option1Name={product.option1Name}
            option2Name={product.option2Name}
            canTryOn={/\bson\b|lip(?:stick| tint| gloss| mousse| lacquer)/i.test(product.name)}
          />
        </div>
      </div>
      <ProductTabs
        productName={product.name}
        description={product.description || product.shortDescription || "Thông tin sản phẩm đang được cập nhật."}
        shortDescription={product.shortDescription}
        howToUse={product.howToUse}
        specifications={product.specifications}
        ingredients={product.ingredients ?? []}
        brand={product.brandName}
        category={product.categoryName}
        reviewCount={product.totalReviews}
        primaryImage={product.primaryImage}
        galleryImages={gallery}
        reviews={
          <Suspense fallback={<p>Đang tải đánh giá...</p>}>
            <ReviewsContent
              productId={product.id}
              avgRating={product.avgRating}
              totalReviews={product.totalReviews}
              variants={product.variants}
            />
          </Suspense>
        }
      />
      <Suspense fallback={null}>
        <RelatedContent productId={product.id} />
      </Suspense>
    </main>
  );
}
