"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function HeroCarousel({ slides }: { slides: ReactNode[] }) {
  const [index, setIndex] = useState(1);
  const [animated, setAnimated] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [generation, setGeneration] = useState(0);
  const moving = useRef(false);
  const count = slides.length;
  const active = (index - 1 + count) % count;

  useEffect(() => {
    if (count < 2 || hovered || focused || stopped) return;
    const timer = window.setInterval(() => {
      if (document.hidden || moving.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      moving.current = true;
      setAnimated(true);
      setIndex((value) => value + 1);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [count, hovered, focused, stopped, generation]);

  function move(next: number) {
    if (moving.current) return;
    moving.current = true;
    setAnimated(true);
    setIndex(next);
    setGeneration((value) => value + 1);
  }

  function settle() {
    moving.current = false;
    if (index === 0 || index === count + 1) {
      setAnimated(false);
      setIndex(index === 0 ? count : 1);
    }
  }

  const loop = count > 1 ? [slides[count - 1], ...slides, slides[0]] : slides;
  return (
    <section
      className="home-hero-carousel"
      aria-label="Bộ sưu tập và ưu đãi nổi bật"
      aria-roledescription="băng chuyền"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (count < 2) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(index + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}
    >
      <div
        className="home-hero-track"
        style={{
          transform: `translateX(-${count > 1 ? index * 100 : 0}%)`,
          transition: animated ? "transform 420ms ease-in-out" : "none",
        }}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && event.propertyName === "transform") settle();
        }}
      >
        {loop.map((slide, position) => (
          <div
            key={position}
            className="home-hero-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${((position - 1 + count) % count) + 1} / ${count}`}
            aria-hidden={position !== (count > 1 ? index : 0)}
            inert={position !== (count > 1 ? index : 0)}
          >
            {slide}
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <button
            className="home-hero-arrow home-hero-prev"
            type="button"
            aria-label="Banner trước"
            onClick={() => move(index - 1)}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            className="home-hero-arrow home-hero-next"
            type="button"
            aria-label="Banner tiếp theo"
            onClick={() => move(index + 1)}
          >
            <ChevronRight size={22} />
          </button>
          <div className="home-hero-pagination" aria-label="Chọn banner">
            {slides.map((_, position) => (
              <button
                key={position}
                type="button"
                className="home-hero-dot"
                aria-label={`Đến banner ${position + 1}`}
                aria-current={active === position ? "true" : undefined}
                onClick={() => {
                  if (active !== position) move(position + 1);
                }}
              />
            ))}
          </div>
          <button
            className="home-hero-toggle"
            type="button"
            aria-label={stopped ? "Phát tự động" : "Tạm dừng tự động"}
            onClick={() => setStopped((value) => !value)}
          >
            {stopped ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </>
      )}
    </section>
  );
}
