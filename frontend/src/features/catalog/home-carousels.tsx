"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { CatalogImage, formatPrice } from "./components";
import type { Category, FlashCard } from "./server";

type Brand = { id: string; name: string; slug: string; logoUrl?: string | null };
type Axis = "horizontal" | "vertical";

function useVisible(desktop: number) {
  const [visible, setVisible] = useState(desktop);
  useEffect(() => {
    const update = () =>
      setVisible(window.innerWidth < 600 ? 2 : window.innerWidth < 1020 ? 3 : desktop);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [desktop]);
  return visible;
}

function LoopCarousel({
  items,
  axis,
  visible,
  label,
  interval = 4600,
}: {
  items: ReactNode[];
  axis: Axis;
  visible: number;
  label: string;
  interval?: number;
}) {
  const count = items.length;
  const [index, setIndex] = useState(count);
  const [animated, setAnimated] = useState(true);
  const [paused, setPaused] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || reduced || count <= 1) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((value) => value + (axis === "vertical" ? -1 : 1));
    }, interval);
    return () => window.clearInterval(timer);
  }, [axis, count, interval, paused, reduced, generation]);
  function move(direction: number) {
    if (count <= 1) return;
    setAnimated(true);
    setIndex((value) =>
      reduced ? count + ((value - count + direction + count) % count) : value + direction,
    );
    setGeneration((value) => value + 1);
  }
  function settle() {
    if (index >= count * 2 || index < count) {
      setAnimated(false);
      setIndex((((index % count) + count) % count) + count);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    }
  }
  if (!count) return null;
  if (count === 1) return <div className="home-loop-static">{items[0]}</div>;
  const shown = Math.min(visible, count);
  const percent = (index * 100) / shown;
  const gap = 16;
  const transform =
    axis === "horizontal"
      ? `translate3d(calc(-${percent}% - ${(index * gap) / shown}px),0,0)`
      : `translate3d(0,-${index * 96}px,0)`;
  const previous = axis === "horizontal" ? -1 : 1;
  const next = axis === "horizontal" ? 1 : -1;
  return (
    <div
      className={`home-loop home-loop-${axis}`}
      data-visible={shown}
      style={{ "--carousel-visible": shown } as CSSProperties}
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="home-loop-viewport">
        <div
          className="home-loop-track"
          style={{
            transform,
            transition:
              animated && !reduced ? "transform 620ms cubic-bezier(.22,.68,.25,1)" : "none",
          }}
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget) settle();
          }}
        >
          {[0, 1, 2].flatMap((copy) =>
            items.map((item, itemIndex) => {
              const position = copy * count + itemIndex;
              return (
                <div
                  className="home-loop-cell"
                  key={`${copy}-${itemIndex}`}
                  inert={position < index || position >= index + shown}
                >
                  {item}
                </div>
              );
            }),
          )}
        </div>
      </div>
      <button
        className="home-loop-arrow home-loop-arrow-prev"
        type="button"
        aria-label={`${label}: trước`}
        onClick={() => move(previous)}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        className="home-loop-arrow home-loop-arrow-next"
        type="button"
        aria-label={`${label}: tiếp theo`}
        onClick={() => move(next)}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export function CategoryCarousel({ categories }: { categories: Category[] }) {
  const visible = useVisible(6);
  const items = categories.map((category) => (
    <Link className="category-tile" key={category.id} href={`/categories/${category.slug}`}>
      <CatalogImage src={category.imageUrl} alt={category.name} />
      <strong>{category.name}</strong>
    </Link>
  ));
  return (
    <LoopCarousel
      items={items}
      axis="horizontal"
      visible={visible}
      label="Danh mục"
      interval={2000}
    />
  );
}

export function DealCarousel({ cards }: { cards: FlashCard[] }) {
  const visible = useVisible(5);
  if (!cards.length)
    return <div className="catalog-empty">Hiện chưa có Flash Sale đang diễn ra.</div>;
  const items = cards.map((card) => (
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
          {card.originalPrice > card.effectivePrice && <del>{formatPrice(card.originalPrice)}</del>}
        </p>
        <small>Còn {card.remaining} sản phẩm</small>
        {card.conditional && (
          <p className="hint">Giá ưu đãi có điều kiện; xác nhận tại checkout.</p>
        )}
      </div>
    </article>
  ));
  return (
    <LoopCarousel
      items={items}
      axis="horizontal"
      visible={visible}
      label="Deal có hạn"
      interval={2000}
    />
  );
}

export function BrandCarousel({ brands }: { brands: Brand[] }) {
  const visible = useVisible(8);
  const items = brands.map((brand) => (
    <Link className="home-brand-tile" key={brand.id} href={`/brands/${brand.slug}`}>
      {brand.logoUrl ? (
        <CatalogImage src={brand.logoUrl} alt={brand.name} />
      ) : (
        <span>{brand.name.slice(0, 2).toUpperCase()}</span>
      )}
      <strong>{brand.name}</strong>
    </Link>
  ));
  return (
    <LoopCarousel
      items={items}
      axis="horizontal"
      visible={visible}
      label="Thương hiệu"
      interval={2000}
    />
  );
}
