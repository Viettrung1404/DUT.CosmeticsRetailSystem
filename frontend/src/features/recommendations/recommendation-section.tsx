"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { CatalogImage, formatPrice, SectionTitle } from "@/features/catalog/components";
import { FavoriteButton } from "@/features/catalog/favorite-button";
import { cartQuery } from "@/features/catalog/commerce-state";
import type { RecommendationPlacement } from "@/shared/recommendations/behavior-tracker";
import { getWebBehaviorTracker } from "@/shared/recommendations/web-tracker";

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
}: RecommendationSectionProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const impressionTrackedRef = useRef(false);

  const { data, isLoading } = useQuery<RecommendationSectionResponse | null>({
    queryKey: ["recommendations", placement, endpointUrl],
    enabled: Boolean(endpointUrl),
    staleTime: 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        const res = await fetch(endpointUrl!, {
          credentials: "same-origin",
          signal,
        });
        if (!res.ok) return null;
        const payload = (await res.json()) as RecommendationSectionResponse | null;
        return payload && Array.isArray(payload.items) ? payload : null;
      } catch {
        return null;
      }
    },
  });

  const loading = Boolean(endpointUrl) && isLoading;

  useEffect(() => {
    impressionTrackedRef.current = false;
  }, [endpointUrl]);

  // Đo Viewable Impression thật: hiện >= 50% diện tích trong >= 1 giây, dedupe mỗi phiên hiển thị
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !data?.items?.length || impressionTrackedRef.current) {
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
  }, [data?.items?.length, placement]);

  if (!loading && (!data || data.items.length === 0)) {
    return null;
  }

  const attributionSource = data?.attributionSource || "rec_home";

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
    <section ref={containerRef} className={className}>
      {eyebrow && <p className="home-section-eyebrow">{eyebrow}</p>}
      <SectionTitle title={title} href={href} linkText={linkText} />
      {loading ? (
        <div className="catalog-grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="catalog-card rec-skeleton-card" aria-hidden />
          ))}
        </div>
      ) : (
        <div className="catalog-grid">
          {data!.items.map((item) => {
            const displayPrice =
              item.displayPrice ?? item.salePrice ?? item.basePrice;
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
      )}
    </section>
  );
}

export function HomeRecommendationsSection() {
  const [recentIdsParam, setRecentIdsParam] = useState<string | null>(null);

  useEffect(() => {
    void getWebBehaviorTracker()
      .getRecentIds()
      .then((ids) => {
        setRecentIdsParam(ids.join(","));
      });
  }, []);

  const endpointUrl =
    recentIdsParam === null
      ? null
      : recentIdsParam.length > 0
        ? `/api/recommendations/home?recentIds=${encodeURIComponent(recentIdsParam)}&limit=8`
        : "/api/recommendations/home?limit=8";

  return (
    <RecommendationSection
      eyebrow="CÁ NHÂN HÓA"
      title="Dành riêng cho bạn"
      placement="HOME"
      endpointUrl={endpointUrl}
      href="/products"
      linkText="Khám phá thêm"
      showReasonBadge
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
        (cart?.items ?? [])
          .map((item) => item.productId)
          .filter((id): id is string => Boolean(id)),
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
