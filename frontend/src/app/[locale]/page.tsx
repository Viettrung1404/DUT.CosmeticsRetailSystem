"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { 
  Sparkles, 
  Heart, 
  Leaf, 
  ShieldCheck, 
  CheckCircle2, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";
import DynamicProductCard from "@/components/DynamicProductCard";
import AutoPromoBanner from "@/components/AutoPromoBanner";
import FlashSaleSection from "@/components/FlashSaleSection";
import ImageLightboxModal, { LightboxImageItem } from "@/components/ImageLightboxModal";
import { mapApiProductToFrontend } from "@/utils/mapProduct";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/hooks/useCurrency";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

const HOMEPAGE_HERO_SLIDES: (LightboxImageItem & { id: number; title: string; badgeKey: string; captionKey: string })[] = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=1600",
    title: "Radiance Refined · Geneva Atelier",
    badgeKey: "hero.slide1Badge",
    location: "Geneva, Switzerland",
    captionKey: "hero.slide1Caption",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=1600",
    title: "Swiss Bio-Peptide Serum Ritual",
    badgeKey: "hero.slide2Badge",
    location: "Cellular Bio-Park, Geneva",
    captionKey: "hero.slide2Caption",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=1600",
    title: "Alpine Botanical Harvest",
    badgeKey: "hero.slide3Badge",
    location: "Alpine Biological Station, Valais",
    captionKey: "hero.slide3Caption",
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1600",
    title: "Cleanroom Laboratory A-9",
    badgeKey: "hero.slide4Badge",
    location: "Geneva Cantonal Bio-Park",
    captionKey: "hero.slide4Caption",
  },
];

export default function HomePage() {
  const tHome = useTranslations("home");
  const tProd = useTranslations("product");
  const { formatPrice } = useCurrency();
  const { addItem } = useCartStore();
  const [activeTab, setActiveTab] = useState("all");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [heroSlide, setHeroSlide] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Auto-sliding Hero banner (pauses on hover or modal open)
  useEffect(() => {
    if (isHeroPaused || lightboxIndex !== null) return;
    const timer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % HOMEPAGE_HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isHeroPaused, lightboxIndex]);

  // Tải danh sách sản phẩm thực tế từ Database backend
  useEffect(() => {
    async function loadBackendProducts() {
      try {
        const res = await fetch(`${BASE_URL}/customer/products?limit=8`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json && json.data && Array.isArray(json.data.data)) {
            const mapped = json.data.data.map(mapApiProductToFrontend).map((p: any) => ({
              id: p.id,
              slug: p.slug,
              name: p.name,
              price: p.price,
              originalPrice: p.originalPrice,
              rating: p.rating,
              reviews: p.reviews,
              badge: p.badge || "Live Database",
              category: "all,bestsellers,new,awards",
              categoryLabel: p.category,
              description: p.shortDescription || p.description,
              image: p.gallery[0] || "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800",
              images: p.gallery,
              variants: p.variants?.map((v: any) => ({
                name: v.label,
                priceMultiplier: 1,
                price: v.price,
              })),
            }));
            if (mapped.length > 0) {
              setDbProducts(mapped);
            }
          }
        }
      } catch (err) {
        console.log("Using showcase products fallback:", err);
      }
    }
    loadBackendProducts();
  }, []);

  const handleToggleWishlist = (id: string, name: string) => {
    const next = new Set(wishlist);
    if (next.has(id)) {
      next.delete(id);
      toast.success(tHome("toasts.wishlistRemoved", { name }));
    } else {
      next.add(id);
      toast.success(tHome("toasts.wishlistAdded", { name }), { icon: "💖" });
    }
    setWishlist(next);
  };

  const handleQuickAdd = (product: { id: string; name: string; price: number; image: string }) => {
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
    toast.success(tHome("toasts.cartAdded", { name: product.name }), {
      style: {
        borderRadius: "16px",
        background: "#211a1c",
        color: "#ffffff",
      },
      iconTheme: {
        primary: "#ffa6c9",
        secondary: "#211a1c",
      },
    });
  };

  // Trending Products Data matching Stitch with dynamic auto-cycling images
  const trendingProducts = [
    {
      id: "trend-01",
      slug: "peptide-glaze-elixir",
      name: "Peptide Glaze Elixir",
      price: 540000,
      originalPrice: 650000,
      rating: 4.9,
      reviews: 382,
      badge: "BESTSELLER",
      category: "all,bestsellers,awards",
      categoryLabel: "Phục Hồi Tế Bào",
      description: "Tinh chất siêu cấp ẩm với ma trận peptide hoạt tính và nước băng tan Valais Thụy Sĩ.",
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
      ],
      variants: [
        { name: "30ml", priceMultiplier: 1 },
        { name: "50ml", priceMultiplier: 1.4 },
        { name: "100ml", priceMultiplier: 2.2 },
      ]
    },
    {
      id: "trend-02",
      slug: "dewy-velvet-lip-oil",
      name: "Dewy Velvet Lip Oil",
      price: 320000,
      originalPrice: 380000,
      rating: 4.8,
      reviews: 215,
      badge: "NEW IN",
      category: "all,new",
      categoryLabel: "Dưỡng Môi Căng Bóng",
      description: "Dầu dưỡng bóng hữu cơ chiết xuất từ hạt mâm xôi tuyết và peptide định hình làn môi.",
      image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800",
      ],
      variants: [
        { name: "Rose Glaze", priceMultiplier: 1 },
        { name: "Berry Glow", priceMultiplier: 1 },
        { name: "Peach Nectar", priceMultiplier: 1 },
      ]
    },
    {
      id: "trend-03",
      slug: "cloud-ceramides-cream",
      name: "Cloud Ceramides Cream",
      price: 680000,
      originalPrice: 790000,
      rating: 5.0,
      reviews: 192,
      badge: "LUXURY FAVORITE",
      category: "all,bestsellers,awards",
      categoryLabel: "Củng Cố Hàng Rào Da",
      description: "Kem dưỡng mây tái tạo hàng rào sinh học với 5 loại ceramide sinh học và hoa nhung tuyết.",
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800",
      ],
      variants: [
        { name: "50ml", priceMultiplier: 1 },
        { name: "100ml", priceMultiplier: 1.7 },
      ]
    },
    {
      id: "trend-04",
      slug: "soleil-glow-body-shimmer",
      name: "Soleil Glow Body Shimmer",
      price: 490000,
      originalPrice: 580000,
      rating: 4.7,
      reviews: 284,
      badge: "SEASONAL",
      category: "all,bestsellers",
      categoryLabel: "Dưỡng Thể Ánh Nhũ",
      description: "Dầu khô thẩm thấu tức thì với tinh thể ngọc trai tự nhiên cho làn da óng ả chuẩn nắng Thụy Sĩ.",
      image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
      ],
      variants: [
        { name: "100ml", priceMultiplier: 1 },
        { name: "200ml", priceMultiplier: 1.6 },
      ]
    },
  ];

  const currentProductPool = dbProducts.length > 0 ? dbProducts : trendingProducts;

  const filteredTrending = currentProductPool.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "bestsellers") return p.category.includes("bestsellers");
    if (activeTab === "new") return p.category.includes("new");
    if (activeTab === "awards") return p.category.includes("awards");
    return true;
  });

  return (
    <div className="bg-transparent min-h-screen text-on-surface font-sans">
      
      {/* 1. TOP ANNOUNCEMENT TICKER */}
      <div className="bg-surface-container-high text-primary border-b border-outline-variant/30 py-2.5 text-center text-xs tracking-wider font-medium flex items-center justify-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
        <span>{tHome("ticker.gift")}</span>
        <span className="opacity-60 hidden sm:inline">|</span>
        <Link href="/shop" className="underline hover:text-secondary font-semibold">
          {tHome("ticker.explore")}
        </Link>
      </div>

      {/* BANNER TỰ CHUYỂN ĐỘNG ẢNH ĐA TẦNG (TokyoLife Style Auto-Promo Banner) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <AutoPromoBanner />
      </section>

      {/* 2. HERO SECTION */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        {/* Luminous Rose Quartz Ambient Bloom Aura (Matches Mockup top-left & top-right glow) */}
        <div className="pointer-events-none absolute -top-10 -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#FFA6C9]/55 via-[#FFD0DE]/40 to-transparent blur-3xl -z-10" />
        <div className="pointer-events-none absolute top-10 right-0 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-[#FFA6C9]/55 via-[#FFB8D2]/40 to-transparent blur-3xl -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-container text-primary text-xs font-bold uppercase tracking-widest mb-6 self-start border border-outline-variant/40 shadow-2xs">
              <Sparkles className="h-3 w-3" /> {tHome("hero.badge")}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-bold tracking-tight text-primary-text leading-[1.12] mb-6 font-serif">
              {tHome("hero.titlePart1")}<br />
              <span className="italic font-serif text-primary font-normal">{tHome("hero.titlePart2")}</span>
            </h1>

            <p className="text-sm sm:text-base text-secondary-text leading-relaxed mb-8 max-w-lg font-normal">
              {tHome("hero.description")}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-on-primary shadow-sm hover:bg-secondary transition-all hover:-translate-y-0.5 active:scale-95"
              >
                {tHome("hero.exploreCollection")}
              </Link>
              <Link
                href="/our-science"
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant/60 bg-surface px-7 py-3.5 text-xs font-bold text-primary-text hover:border-primary hover:text-primary transition shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" /> {tHome("hero.takeQuiz")}
              </Link>
            </div>

            {/* Trust highlights */}
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-outline-variant/30 text-xs text-secondary-text font-medium">
              <div className="flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-600" />
                <span>{tHome("hero.vegan")}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>{tHome("hero.swissTested")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                <span>{tHome("hero.crueltyFree")}</span>
              </div>
            </div>

          </div>

          {/* Right Hero Image Showcase - Interactive Auto-Sliding Banner & Lightbox Modal */}
          <div className="lg:col-span-6 relative">
            <div 
              onMouseEnter={() => setIsHeroPaused(true)}
              onMouseLeave={() => setIsHeroPaused(false)}
              className="relative min-h-[480px] sm:min-h-[520px] lg:h-[560px] w-full overflow-hidden rounded-[36px] shadow-2xl bg-black border border-outline-variant/40 flex flex-col justify-between group"
            >
              {/* Images Layer with Crossfade */}
              {HOMEPAGE_HERO_SLIDES.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-zoom-in ${
                    heroSlide === idx ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
                  }`}
                  onClick={() => setLightboxIndex(idx)}
                >
                  <Image
                    src={slide.url}
                    alt={slide.title || "Radiance Refined Model"}
                    fill
                    priority={idx === 0}
                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
                </div>
              ))}

              {/* Top Control Bar with Badge & Zoom Button */}
              <div className="relative z-20 p-4 sm:p-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 rounded-2xl bg-surface/95 backdrop-blur-md px-3.5 py-2 shadow-md border border-white/60 text-xs font-bold text-primary-text">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="uppercase tracking-wider text-[11px]">{tHome(HOMEPAGE_HERO_SLIDES[heroSlide].badgeKey)}</span>
                </div>

                <button
                  onClick={() => setLightboxIndex(heroSlide)}
                  className="flex items-center gap-1.5 rounded-full bg-black/60 hover:bg-primary text-white backdrop-blur-md px-3.5 py-2 text-xs font-bold transition shadow-md active:scale-95 border border-white/20"
                  title={tHome("hero.zoomImage")}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tHome("hero.zoomImage")}</span>
                </button>
              </div>

              {/* Center Navigation Arrows */}
              <div className="relative z-20 px-3 flex items-center justify-between pointer-events-none">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeroSlide((prev) => (prev - 1 + HOMEPAGE_HERO_SLIDES.length) % HOMEPAGE_HERO_SLIDES.length);
                  }}
                  className="h-10 w-10 rounded-full bg-surface/90 hover:bg-surface text-primary-text hover:text-primary flex items-center justify-center shadow-lg transition active:scale-95 pointer-events-auto border border-white/40"
                  title={tHome("hero.prevImage")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeroSlide((prev) => (prev + 1) % HOMEPAGE_HERO_SLIDES.length);
                  }}
                  className="h-10 w-10 rounded-full bg-surface/90 hover:bg-surface text-primary-text hover:text-primary flex items-center justify-center shadow-lg transition active:scale-95 pointer-events-auto border border-white/40"
                  title={tHome("hero.nextImage")}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Bottom Atelier Highlight Card - Non-blocking floating glassmorphism */}
              <div className="relative z-20 p-4 sm:p-5">
                <div className="rounded-3xl bg-surface/95 backdrop-blur-md p-4 sm:p-5 shadow-2xl border border-white/60">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                        {tHome(HOMEPAGE_HERO_SLIDES[heroSlide].badgeKey)}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-primary-text font-serif">
                        {HOMEPAGE_HERO_SLIDES[heroSlide].title}
                      </span>
                    </div>
                    <span className="text-base font-serif font-bold text-primary">
                      {formatPrice(trendingProducts[0].price)}
                    </span>
                  </div>

                  <p className="text-[11px] text-secondary-text mt-2 mb-3 leading-snug line-clamp-1">
                    {tHome(HOMEPAGE_HERO_SLIDES[heroSlide].captionKey)}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    {/* Slide Dots */}
                    <div className="flex items-center gap-1.5">
                      {HOMEPAGE_HERO_SLIDES.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHeroSlide(dotIdx);
                          }}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            heroSlide === dotIdx ? "w-6 bg-primary" : "w-2 bg-secondary-text/30 hover:bg-secondary-text/60"
                          }`}
                          aria-label={`Slide ${dotIdx + 1}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-secondary-text mr-2">
                        {heroSlide + 1} / {HOMEPAGE_HERO_SLIDES.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAdd(trendingProducts[0]);
                        }}
                        className="rounded-full bg-primary text-on-primary px-3.5 py-1.5 text-[11px] font-bold hover:bg-secondary transition flex items-center gap-1 shadow-xs active:scale-95"
                      >
                        <Plus className="h-3 w-3" /> {tHome("hero.quickAdd")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 2.5 FLASH SALE & REAL-TIME COUNTDOWN TIMER (Giai đoạn 2: FOMO & Thúc đẩy chuyển đổi) */}
      <FlashSaleSection />

      {/* 3. SECTION: SHOP BY RITUAL (4 Curated Category Cards) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-primary block mb-2">
            {tHome("rituals.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-primary-text">
            {tHome("rituals.title")}
          </h2>
          <p className="text-xs sm:text-sm text-secondary-text mt-2">
            {tHome("rituals.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: tHome("rituals.categories.skincare.title"),
              pill: tHome("rituals.categories.skincare.pill"),
              desc: tHome("rituals.categories.skincare.desc"),
              image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
              link: "/categories",
            },
            {
              title: tHome("rituals.categories.makeup.title"),
              pill: tHome("rituals.categories.makeup.pill"),
              desc: tHome("rituals.categories.makeup.desc"),
              image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800",
              link: "/categories",
            },
            {
              title: tHome("rituals.categories.haircare.title"),
              pill: tHome("rituals.categories.haircare.pill"),
              desc: tHome("rituals.categories.haircare.desc"),
              image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&q=80&w=800",
              link: "/categories",
            },
            {
              title: tHome("rituals.categories.bodycare.title"),
              pill: tHome("rituals.categories.bodycare.pill"),
              desc: tHome("rituals.categories.bodycare.desc"),
              image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800",
              link: "/categories",
            },
          ].map((cat) => (
            <Link
              key={cat.title}
              href={cat.link}
              className="group relative aspect-[4/5] rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-outline-variant/30 flex flex-col justify-between p-6"
            >
              <Image
                src={cat.image}
                alt={cat.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 group-hover:from-black/90 transition-colors" />

              {/* Top Pill Badge */}
              <div className="relative z-10 self-start">
                <span className="rounded-full bg-surface/90 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-text">
                  {cat.pill}
                </span>
              </div>

              {/* Bottom Content */}
              <div className="relative z-10 text-white">
                <h3 className="text-2xl font-bold font-serif mb-1">{cat.title}</h3>
                <p className="text-xs text-white/80 line-clamp-2 leading-relaxed mb-4 font-normal">
                  {cat.desc}
                </p>
                <div className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold text-white group-hover:bg-white group-hover:text-[#211a1c] transition-all duration-300 shadow-sm mt-1">
                  <span>{tHome("rituals.explore")}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>


      {/* 4. SECTION: COMMUNITY FAVORITES / TRENDING RIGHT NOW */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary block mb-2">
              {tHome("trending.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-primary-text">
              {tHome("trending.title")}
            </h2>
            <p className="text-xs sm:text-sm text-secondary-text mt-1">
              {tHome("trending.subtitle")}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "all", label: tHome("trending.tabs.all") },
              { id: "bestsellers", label: tHome("trending.tabs.bestsellers") },
              { id: "new", label: tHome("trending.tabs.new") },
              { id: "awards", label: tHome("trending.tabs.awards") },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-surface border border-outline-variant/60 text-secondary-text hover:border-primary hover:text-primary-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid with Dynamic In-Middle Auto-Cycling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTrending.map((product) => (
            <DynamicProductCard
              key={product.id}
              id={product.id}
              slug={product.slug}
              name={product.name}
              price={product.price}
              originalPrice={product.originalPrice}
              image={product.image}
              images={product.images}
              badge={product.badge}
              category={product.categoryLabel}
              rating={product.rating}
              reviews={product.reviews}
              description={product.description}
              variants={product.variants}
            />
          ))}
        </div>

        {/* View All CTA - Luxury Callout Component */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-pink-200/80 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left hover:shadow-xl hover:border-primary/40 transition-all duration-300">
            {/* Ambient accent background blur */}
            <div className="pointer-events-none absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-[#FFA6C9]/20 blur-2xl" />

            <div className="relative z-10 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFE3ED] text-[#D23F72] text-[10px] font-bold uppercase tracking-wider mb-2.5 shadow-2xs">
                <Sparkles className="h-3 w-3" /> {tHome("trending.cta.badge")}
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-primary-text mb-1.5">
                {tHome("trending.cta.title")}
              </h3>
              <p className="text-xs sm:text-sm text-secondary-text leading-relaxed">
                {tHome("trending.cta.subtitle")}
              </p>
            </div>

            <Link
              href="/shop"
              className="relative z-10 group inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-primary shadow-md hover:bg-secondary hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <span>{tHome("trending.cta.button")}</span>
            </Link>
          </div>
        </div>
      </section>


      {/* 5. SECTION: THE GLOW STANDARD (Uncompromising Purity & Elegance) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-[36px] border border-pink-100/80 bg-[#FAF0F3] p-8 sm:p-14 shadow-card grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D23F72] block mb-2">
              {tHome("botanical.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-primary-text mb-4 leading-tight">
              {tHome("botanical.titlePart1")}<br />{tHome("botanical.titlePart2")}
            </h2>
            <p className="text-xs sm:text-sm text-secondary-text leading-relaxed mb-8 max-w-lg font-normal">
              {tHome("botanical.description")}
            </p>

            <div className="space-y-4 mb-8">
              {[
                {
                  title: tHome("botanical.features.f1Title"),
                  desc: tHome("botanical.features.f1Desc"),
                  icon: Sparkles,
                },
                {
                  title: tHome("botanical.features.f2Title"),
                  desc: tHome("botanical.features.f2Desc"),
                  icon: ShieldCheck,
                },
                {
                  title: tHome("botanical.features.f3Title"),
                  desc: tHome("botanical.features.f3Desc"),
                  icon: CheckCircle2,
                },
              ].map((item, idx) => {
                const IconComp = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-3.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFE3ED] text-[#D23F72] shrink-0 mt-0.5 shadow-2xs">
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-primary-text">{item.title}</h4>
                      <p className="text-[11px] text-secondary-text">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              href="/our-science"
              className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-xs font-bold text-on-primary shadow-sm hover:bg-secondary transition active:scale-95"
            >
              {tHome("botanical.readScience")}
            </Link>
          </div>

          <div 
            onClick={() => setLightboxIndex(2)}
            className="lg:col-span-5 relative aspect-square sm:aspect-[4/3] lg:aspect-square w-full rounded-3xl overflow-hidden shadow-md border border-outline-variant/30 cursor-zoom-in group"
            title={tHome("botanical.zoomImage")}
          >
            <Image
              src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=900"
              alt="Botanical bottles and eucalyptus leaves"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-surface/95 text-primary-text px-4 py-2 text-xs font-bold backdrop-blur-md shadow-md border border-white/60">
                <ZoomIn className="h-4 w-4 text-primary" /> {tHome("botanical.zoomImage")}
              </span>
            </div>
          </div>

        </div>
      </section>


      {/* 6. SECTION: REAL GLOW STORIES (Testimonials) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-primary block mb-2">
            {tHome("stories.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-primary-text">
            {tHome("stories.title")}
          </h2>
          <p className="text-xs sm:text-sm text-secondary-text mt-2">
            {tHome("stories.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              text: tHome("stories.r1Text"),
              author: "Sophia R.",
              location: tHome("stories.r1Location"),
              avatar: "SR",
            },
            {
              text: tHome("stories.r2Text"),
              author: "Claire M.",
              location: tHome("stories.r2Location"),
              avatar: "CM",
            },
            {
              text: tHome("stories.r3Text"),
              author: "Mia K.",
              location: tHome("stories.r3Location"),
              avatar: "MK",
            },
          ].map((item, idx) => (
            <div 
              key={idx}
              className="rounded-3xl border border-outline-variant/40 bg-surface p-7 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex text-amber-500 text-xs mb-4">
                  {"★".repeat(5)}
                </div>
                <p className="text-xs sm:text-sm text-secondary-text leading-relaxed mb-6 font-medium italic">
                  &quot;{item.text}&quot;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/20">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-primary text-xs font-bold">
                  {item.avatar}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary-text">{item.author}</h4>
                  <span className="text-[10px] text-secondary-text">{item.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fullscreen Image Lightbox Modal for Homepage */}
      <ImageLightboxModal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        images={HOMEPAGE_HERO_SLIDES}
        currentIndex={lightboxIndex ?? 0}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  );
}