import Image from "next/image";
import Link from "next/link";
import type { Product, Category, ProductPage, FlashCard } from "./server";

export const formatPrice = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value)
    ? "Liên hệ"
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(value);
export function CatalogImage({
  src,
  alt,
  className = "",
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  return src && /^https?:\/\/|^\//.test(src) ? (
    <Image className={className} src={src} alt={alt} width={600} height={600} unoptimized />
  ) : (
    <div className={`catalog-image-placeholder ${className}`} aria-label={alt}>
      GLOWUP
    </div>
  );
}
export function ProductCard({ product }: { product: Product }) {
  const price = product.effectivePrice ?? product.salePrice ?? product.basePrice;
  return (
    <article className="catalog-card">
      <Link href={`/products/${product.slug}`} className="catalog-card-image">
        <CatalogImage
          src={product.primaryImage || product.images?.[0]?.imageUrl}
          alt={product.name}
        />
        {product.basePrice > price && (
          <span className="catalog-discount">
            -{Math.round((1 - price / product.basePrice) * 100)}%
          </span>
        )}
      </Link>
      <div className="catalog-card-copy">
        <p className="catalog-brand">{product.brandName || "GLOWUP"}</p>
        <Link href={`/products/${product.slug}`} className="catalog-card-title">
          {product.name}
        </Link>
        <div className="catalog-rating">
          ★ <span>{product.avgRating.toFixed(1)}</span>
          <small>({product.totalReviews})</small>
        </div>
        <div className="catalog-prices">
          <strong>{formatPrice(price)}</strong>
          {product.basePrice > price && <del>{formatPrice(product.basePrice)}</del>}
        </div>
      </div>
    </article>
  );
}
export function ProductGrid({ products }: { products: Product[] }) {
  return products.length ? (
    <div className="catalog-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  ) : (
    <div className="catalog-empty">Chưa có sản phẩm phù hợp. Hãy thử bộ lọc khác.</div>
  );
}
export function FlashGrid({ cards }: { cards: FlashCard[] }) {
  return cards.length ? (
    <div className="catalog-grid">
      {cards.map((card) => (
        <article className="catalog-card" key={`${card.promotionId}-${card.variantId}`}>
          <Link href={`/products/${card.slug}`} className="catalog-card-image">
            <CatalogImage src={card.imageUrl} alt={card.name} />
          </Link>
          <div className="catalog-card-copy">
            <p className="catalog-brand">{card.brandName || "GLOWUP"}</p>
            <Link className="catalog-card-title" href={`/products/${card.slug}`}>
              {card.name}
            </Link>
            <p className="catalog-prices">
              <strong>{formatPrice(card.effectivePrice)}</strong>
              {card.originalPrice > card.effectivePrice && (
                <del>{formatPrice(card.originalPrice)}</del>
              )}
            </p>
            <small>Còn {card.remaining} sản phẩm</small>
            {card.conditional && (
              <p className="hint">Giá ưu đãi có điều kiện; xác nhận tại checkout.</p>
            )}
          </div>
        </article>
      ))}
    </div>
  ) : (
    <div className="catalog-empty">Hiện chưa có Flash Sale đang diễn ra.</div>
  );
}
export function SectionTitle({
  title,
  href,
  linkText = "Xem tất cả",
}: {
  title: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="catalog-section-title">
      <h2>{title}</h2>
      {href && (
        <Link href={href}>
          {linkText} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}
export function CategoryTiles({ categories }: { categories: Category[] }) {
  return (
    <div className="category-tiles">
      {categories.slice(0, 6).map((category) => (
        <Link className="category-tile" key={category.id} href={`/categories/${category.slug}`}>
          <CatalogImage src={category.imageUrl} alt={category.name} />
          <strong>{category.name}</strong>
        </Link>
      ))}
    </div>
  );
}
export function Pagination({
  page,
  base,
  data,
}: {
  page: number;
  base: string;
  data: ProductPage;
}) {
  return data.meta.pageCount > 1 ? (
    <nav aria-label="Phân trang" className="catalog-pagination">
      {page > 1 && (
        <Link href={`${base}${base.includes("?") ? "&" : "?"}page=${page - 1}`}>← Trước</Link>
      )}
      <span>
        Trang {page} / {data.meta.pageCount}
      </span>
      {page < data.meta.pageCount && (
        <Link href={`${base}${base.includes("?") ? "&" : "?"}page=${page + 1}`}>Sau →</Link>
      )}
    </nav>
  ) : null;
}
