"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { CatalogImage, formatPrice, SectionTitle } from "@/features/catalog/components";
import { FavoriteButton } from "@/features/catalog/favorite-button";
import { cartQuery } from "@/features/catalog/commerce-state";
import type { RecommendationPlacement } from "@/shared/recommendations/behavior-tracker";
import { getRecentWebViews, getWebBehaviorTracker } from "@/shared/recommendations/web-tracker";

export interface RecommendedItem {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice?: number | null;
  displayPrice?: number;
  imageUrl?: string | null;
  brand?: { id: string; name: string; slug: string } | null;
  avgRating?: number;
  totalSold?: number;
  reason?: string | null;
  score?: number;
  placement?: RecommendationPlacement;
}

export interface RecommendationSectionResponse {
  placement: RecommendationPlacement;
  attributionSource: string;
  items: RecommendedItem[];
  pagination?: { page: number; totalPages: number };
}

interface RecommendationSectionProps {
  title: string;
  eyebrow?: string;
  placement: RecommendationPlacement;
  endpointUrl: string | null;
  href?: string;
  linkText?: string;
  showReasonBadge?: boolean;
  className?: string;
  paging?: { page: number; onChange: (page: number) => void };
}

const HOME_PAGE_SIZE = 15;

function RecommendationPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const shown = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (number) =>
      totalPages <= 8 || number <= 2 || number === totalPages || Math.abs(number - page) <= 2,
  );

  return (
    <nav className="rec-pagination" aria-label="Phân trang gợi ý sản phẩm">
      <button
        type="button"
        aria-label="Trang trước"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={18} />
      </button>
      {shown.map((number, index) => (
        <span className="rec-pagination-entry" key={number}>
          {number - (shown[index - 1] ?? number) > 1 && <span aria-hidden="true">…</span>}
          <button
            type="button"
            aria-label={`Trang ${number}`}
            aria-current={number === page ? "page" : undefined}
            onClick={() => onChange(number)}
          >
            {number}
          </button>
        </span>
      ))}
      <button
        type="button"
        aria-label="Trang sau"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

export function RecommendationSection({
  title,
  eyebrow,
  placement,
  endpointUrl,
  href,
  linkText,
  showReasonBadge = false,
  className = "home-section",
  paging,
}: RecommendationSectionProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const impressionTrackedRef = useRef(false);

  const { data, isLoading, isPlaceholderData, isError, refetch } =
    useQuery<RecommendationSectionResponse>({
      queryKey: ["recommendations", placement, endpointUrl],
      enabled: Boolean(endpointUrl),
    staleTime: paging ? 0 : 60_000,
    refetchOnWindowFocus: Boolean(paging),
      retry: false,
      placeholderData: paging ? keepPreviousData : undefined,
      queryFn: async ({ signal }) => {
        const res = await fetch(endpointUrl!, { credentials: "same-origin", signal });
        if (!res.ok) throw new Error("Không tải được gợi ý sản phẩm.");
        return res.json();
      },
    });

  const loading = paging ? endpointUrl === null || isLoading || isPlaceholderData : isLoading;

  useEffect(() => {
    impressionTrackedRef.current = false;
  }, [endpointUrl]);

  // Đo Viewable Impression thật: hiện >= 50% diện tích trong >= 1 giây, dedupe mỗi phiên hiển thị
  useEffect(() => {
    const section = containerRef.current;
    const el = placement === "HOME" ? section?.querySelector("article") : section;
    if (!el || loading || !data?.items.length || impressionTrackedRef.current) {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    let dwellTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5,
        );
        if (visible && !impressionTrackedRef.current) {
          if (!dwellTimer) {
            dwellTimer = setTimeout(() => {
              if (!impressionTrackedRef.current) {
                impressionTrackedRef.current = true;
                getWebBehaviorTracker().trackImpression(placement, 1);
                observer.disconnect();
              }
            }, 1000);
          }
        } else if (!visible && dwellTimer) {
          clearTimeout(dwellTimer);
          dwellTimer = null;
        }
      },
      { threshold: [0.5] },
    );

    observer.observe(el);
    return () => {
      if (dwellTimer) clearTimeout(dwellTimer);
      observer.disconnect();
    };
  }, [data?.items.length, endpointUrl, loading, placement]);

  if (!paging && !loading && !data?.items.length) {
    return null;
  }

  const attributionSource = data?.attributionSource || "rec_home";
  const pagination = data?.pagination;
  const page = isPlaceholderData ? paging?.page : pagination?.page;
  const handlePageChange = (nextPage: number) => {
    if (!paging || nextPage === page) return;
    paging.onChange(nextPage);
    containerRef.current?.scrollIntoView({ block: "start" });
  };

  const handleProductClick = (item: RecommendedItem) => {
    const tracker = getWebBehaviorTracker();
    void tracker.recordAttribution(item.id, attributionSource);
    void tracker.trackEvent({
      eventType: "SEARCH_CLICK",
      productId: item.id,
      brandId: item.brand?.id,
      source: attributionSource,
      metadata: { placement },
    });
  };

  return (
    <section ref={containerRef} className={`${className}${paging ? " rec-home" : ""}`}>
      {eyebrow && <p className="home-section-eyebrow">{eyebrow}</p>}
      <SectionTitle title={title} href={href} linkText={linkText} />
      {isError && paging ? (
        <div className="rec-feedback" role="status">
          <p>Chưa tải được gợi ý sản phẩm.</p>
          <button type="button" onClick={() => void refetch()}>
            Thử lại
          </button>
          {paging.page > 1 && (
            <button type="button" onClick={() => paging.onChange(1)}>
              Về trang 1
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="catalog-grid" aria-busy="true" aria-label="Đang tải gợi ý sản phẩm">
          {Array.from({ length: paging ? HOME_PAGE_SIZE : 4 }).map((_, idx) => (
            <div key={idx} className="catalog-card rec-skeleton-card" aria-hidden />
          ))}
        </div>
      ) : data?.items.length ? (
        <div className="catalog-grid">
          {data.items.map((item) => {
            const displayPrice = item.displayPrice ?? item.salePrice ?? item.basePrice;
            const hasDiscount = item.basePrice > displayPrice;
            const detailHref = `/products/${item.slug}?ref=${encodeURIComponent(attributionSource)}`;

            return (
              <article className="catalog-card" key={item.id}>
                <Link
                  href={detailHref}
                  className="catalog-card-image"
                  onClick={() => handleProductClick(item)}
                >
                  <CatalogImage src={item.imageUrl} alt={item.name} />
                  {hasDiscount && (
                    <span className="catalog-discount">
                      -{Math.round((1 - displayPrice / item.basePrice) * 100)}%
                    </span>
                  )}
                </Link>
                <FavoriteButton
                  productId={item.id}
                  slug={item.slug}
                  name={item.name}
                  className="catalog-favorite"
                />
                <div className="catalog-card-copy">
                  <p className="catalog-brand">{item.brand?.name || "GLOWUP"}</p>
                  <Link
                    href={detailHref}
                    className="catalog-card-title"
                    onClick={() => handleProductClick(item)}
                  >
                    {item.name}
                  </Link>
                  {showReasonBadge && item.reason && (
                    <span className="rec-reason-badge" title={item.reason}>
                      <Sparkles size={11} />
                      <span>{item.reason}</span>
                    </span>
                  )}
                  <div className="catalog-rating">
                    ★ <span>{(item.avgRating ?? 4.8).toFixed(1)}</span>
                    {typeof item.totalSold === "number" && item.totalSold > 0 && (
                      <span className="catalog-sold">
                        {" "}
                        · Đã bán{" "}
                        {item.totalSold >= 1000
                          ? `${(item.totalSold / 1000).toFixed(1)}k`
                          : item.totalSold}
                      </span>
                    )}
                  </div>
                  <div className="catalog-prices">
                    <strong>{formatPrice(displayPrice)}</strong>
                    {hasDiscount && <del>{formatPrice(item.basePrice)}</del>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="catalog-empty">Chưa có sản phẩm gợi ý.</p>
      )}
      {paging && pagination && pagination.totalPages > 1 && page && (
        <RecommendationPagination
          page={page}
          totalPages={pagination.totalPages}
          onChange={handlePageChange}
        />
      )}
    </section>
  );
}

export function HomeRecommendationsSection() {
  const [recentViews, setRecentViews] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active)
        setRecentViews(
          getRecentWebViews()
            .map(({ productId, viewedAt, dwellMs }) => `${productId}:${viewedAt}:${dwellMs}`)
            .join(","),
        );
    });
    return () => {
      active = false;
    };
  }, []);

  const params = new URLSearchParams({ limit: String(HOME_PAGE_SIZE), page: String(page) });
  if (recentViews) params.set("recentViews", recentViews);
  const endpointUrl = recentViews === null ? null : `/api/recommendations/home?${params}`;

  return (
    <RecommendationSection
      eyebrow="CÁ NHÂN HÓA"
      title="Dành riêng cho bạn"
      placement="HOME"
      endpointUrl={endpointUrl}
      href="/products"
      linkText="Khám phá thêm"
      showReasonBadge
      paging={{ page, onChange: setPage }}
    />
  );
}

export function ProductDetailRecommendations({
  productId,
  shadeHex,
}: {
  productId: string;
  shadeHex?: string;
}) {
  const similarUrl = shadeHex
    ? `/api/recommendations/products/${encodeURIComponent(productId)}/similar?limit=8&shadeHex=${encodeURIComponent(shadeHex)}`
    : `/api/recommendations/products/${encodeURIComponent(productId)}/similar?limit=8`;
  const boughtTogetherUrl = `/api/recommendations/products/${encodeURIComponent(productId)}/bought-together?limit=6`;

  return (
    <>
      <RecommendationSection
        eyebrow="GỢI Ý TƯƠNG ĐỒNG"
        title="Sản phẩm tương tự"
        placement="PRODUCT_SIMILAR"
        endpointUrl={similarUrl}
        showReasonBadge
        className="pdp-related"
      />
      <RecommendationSection
        eyebrow="COMBO HOÀN HẢO"
        title="Thường được mua cùng"
        placement="PRODUCT_BOUGHT_TOGETHER"
        endpointUrl={boughtTogetherUrl}
        showReasonBadge
        className="pdp-related"
      />
    </>
  );
}

export function CartRecommendationsSection() {
  const { data: cart } = useQuery(cartQuery());

  const productIdsQuery = useMemo(() => {
    const ids = Array.from(
      new Set(
        (cart?.items ?? []).map((item) => item.productId).filter((id): id is string => Boolean(id)),
      ),
    );
    return ids.join(",");
  }, [cart?.items]);

  const endpointUrl = productIdsQuery
    ? `/api/recommendations/cart?productIds=${encodeURIComponent(productIdsQuery)}&limit=8`
    : "/api/recommendations/cart?limit=8";

  return (
    <RecommendationSection
      eyebrow="CHU TRÌNH LÀM ĐẸP"
      title="Hoàn thiện chu trình của bạn"
      placement="CART_ROUTINE"
      endpointUrl={endpointUrl}
      showReasonBadge
      className="cart-recommendations"
    />
  );
}
