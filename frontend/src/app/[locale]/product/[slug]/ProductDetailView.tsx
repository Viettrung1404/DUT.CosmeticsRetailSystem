"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/hooks/useCurrency";
import { 
  Heart, 
  ShieldCheck, 
  RefreshCcw, 
  Droplets, 
  Leaf, 
  Minus, 
  Plus, 
  ShoppingBag, 
  Check, 
  Sparkles,
  PackageCheck,
  Share2,
  Zap,
  Clock,
  Flame,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";
import ImageLightboxModal, { LightboxImageItem } from "@/components/ImageLightboxModal";

interface Variant {
  id: string;
  name: string;
  label: string;
  option1Value?: string;
  option2Value?: string;
  price: number;
  stock: number;
  stockQuantity: number;
  sku: string;
  isActive?: boolean;
}

interface IngredientItem {
  id?: string;
  ingredientName?: string;
  percentage?: string;
  isKeyIngredient?: boolean;
}

interface ProductDetailProps {
  product: {
    id: string;
    slug: string;
    name: string;
    sku?: string;
    category: string;
    categorySlug: string;
    brand: string;
    price: number;
    originalPrice: number;
    rating: number;
    reviews: number;
    totalSold?: number;
    badge?: string;
    description: string;
    shortDescription?: string;
    ingredients: string[];
    rawIngredients?: (string | IngredientItem)[];
    tags?: string[];
    option1Name?: string;
    option2Name?: string;
    gallery: string[];
    variants: Variant[];
  };
  relatedProducts: any[];
}

export default function ProductDetailView({ product, relatedProducts }: ProductDetailProps) {
  const tProd = useTranslations("product");
  const tNav = useTranslations("nav");
  const { formatPrice } = useCurrency();
  const { addItem } = useCartStore();

  // Active gallery image
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Active variant state
  const hasVariants = product.variants && product.variants.length > 0;
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const selectedVariant = hasVariants ? product.variants[selectedVariantIndex] : null;

  // Active pricing & stock based on variant
  const currentPrice = selectedVariant?.price || product.price;
  const currentStock = selectedVariant ? selectedVariant.stockQuantity : 100;
  const isOutOfStock = currentStock <= 0;

  // Quantity state
  const [qty, setQty] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Lightbox & Auto-sliding state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAutoSlide, setIsAutoSlide] = useState(false);

  // Auto-play gallery slides when toggled
  useEffect(() => {
    if (!isAutoSlide || isLightboxOpen || product.gallery.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % product.gallery.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoSlide, isLightboxOpen, product.gallery.length]);

  const lightboxImages: LightboxImageItem[] = (
    product.gallery.length > 0 
      ? product.gallery 
      : ["https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900"]
  ).map((img, idx) => ({
    url: img,
    title: `${product.name} — Góc chụp ${idx + 1}/${product.gallery.length || 1}`,
    badge: product.brand,
    location: product.category,
    caption: product.shortDescription || product.description,
  }));

  // Countdown timer cho Flash Sale tại trang chi tiết sản phẩm
  const [countdownStr, setCountdownStr] = useState("04:38:22");

  useEffect(() => {
    const calcTimer = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(23, 59, 59, 999);
      const diff = Math.max(0, target.getTime() - now.getTime());
      const h = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, "0");
      const m = String(Math.floor((diff / 1000 / 60) % 60)).padStart(2, "0");
      const s = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");
      return `${h}:${m}:${s}`;
    };

    const interval = setInterval(() => {
      setCountdownStr(calcTimer());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error(tProd("outOfStock"));
      return;
    }

    const itemName = selectedVariant
      ? `${product.name} (${selectedVariant.label})`
      : product.name;

    addItem({
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      productId: product.id,
      name: itemName,
      price: currentPrice,
      image: product.gallery[0] || "",
      quantity: qty,
    });

    toast.success(tProd("added"), {
      style: {
        borderRadius: "12px",
        background: "#2B2025",
        color: "#fff",
      },
      iconTheme: {
        primary: "#FFA6C9",
        secondary: "#2B2025",
      },
    });
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="bg-transparent min-h-screen text-text-primary pb-20 relative overflow-hidden">
      
      {/* Luminous Rose Quartz Ambient Bloom Aura */}
      <div className="pointer-events-none absolute -top-10 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#FFA6C9]/55 via-[#FFB8D2]/35 to-transparent blur-3xl -z-10" />
      <div className="pointer-events-none absolute top-1/2 -left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#FFA6C9]/40 via-[#FFD0DE]/25 to-transparent blur-3xl -z-10" />

      {/* Top Banner Accent */}
      <div className="bg-[#FAF3F5] border-b border-nude/40 py-2.5 text-center text-xs tracking-wider text-text-secondary font-medium">
        ✨ Miễn phí vận chuyển hỏa tốc toàn quốc • Tặng kèm mẫu thử serum phục hồi độc quyền
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative">
        
        {/* Breadcrumbs */}
        <div className="mb-8 flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
          <Link href="/" className="hover:text-primary-rose transition-colors">{tNav("home")}</Link>
          <span>/</span>
          <Link href="/categories" className="hover:text-primary-rose transition-colors">{tNav("categories")}</Link>
          <span>/</span>
          <Link href={`/category/${product.categorySlug}`} className="hover:text-primary-rose transition-colors">{product.category}</Link>
          <span>/</span>
          <span className="text-text-primary truncate max-w-xs">{product.name}</span>
        </div>

        {/* Hero Product Section */}
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-start">
          
          {/* Left: Interactive Image Gallery with Auto-Slide & Fullscreen Lightbox */}
          <div className="flex flex-col gap-4 sticky top-24">
            <div 
              onMouseEnter={() => setIsAutoSlide(false)}
              className="relative aspect-[4/5] sm:min-h-[460px] overflow-hidden rounded-3xl border border-nude/40 bg-black shadow-sm group cursor-zoom-in"
              onClick={() => setIsLightboxOpen(true)}
              title="Nhấn để xem ảnh phóng to đầy đủ"
            >
              <Image 
                src={product.gallery[activeImageIndex] || product.gallery[0] || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900"} 
                alt={product.name} 
                fill 
                className="object-cover transition-all duration-700 group-hover:scale-105" 
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
              
              {/* Product Badge */}
              {product.badge && (
                <div className="absolute top-4 left-4 rounded-full bg-[#D23F72] px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-xs z-10 pointer-events-none">
                  {product.badge}
                </div>
              )}

              {/* Action Buttons Top Right: Zoom & Share */}
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                  className="h-9 px-3 rounded-full bg-white/90 hover:bg-white text-text-primary backdrop-blur-md flex items-center gap-1.5 text-xs font-bold transition shadow-sm active:scale-95"
                  title="Phóng to ảnh xem chi tiết"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">Phóng to</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="h-9 w-9 rounded-full bg-white/90 hover:bg-white backdrop-blur-md flex items-center justify-center text-text-secondary hover:text-text-primary transition shadow-sm active:scale-95"
                  title="Chia sẻ sản phẩm"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

              {/* Prev / Next Navigation Arrows on Main Image */}
              {product.gallery.length > 1 && (
                <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex items-center justify-between z-10 pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev - 1 + product.gallery.length) % product.gallery.length);
                    }}
                    className="h-10 w-10 rounded-full bg-white/90 hover:bg-white text-text-primary hover:text-primary flex items-center justify-center shadow-lg transition active:scale-95 pointer-events-auto border border-nude/30"
                    title="Ảnh trước"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev + 1) % product.gallery.length);
                    }}
                    className="h-10 w-10 rounded-full bg-white/90 hover:bg-white text-text-primary hover:text-primary flex items-center justify-center shadow-lg transition active:scale-95 pointer-events-auto border border-nude/30"
                    title="Ảnh tiếp theo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Image Counter & Click Hint Bar at Bottom */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                <span className="rounded-full bg-black/60 backdrop-blur-md text-white px-3 py-1 text-[11px] font-mono font-bold border border-white/20">
                  {activeImageIndex + 1} / {Math.max(product.gallery.length, 1)}
                </span>

                <span className="flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-md text-text-primary px-3 py-1 text-[11px] font-bold shadow-xs">
                  <ZoomIn className="h-3.5 w-3.5 text-primary" /> Nhấp để xem ảnh đầy đủ
                </span>
              </div>
            </div>
            
            {/* Gallery Thumbnails */}
            {product.gallery.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {product.gallery.map((image, index) => (
                  <button 
                    key={index} 
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition bg-surface ${
                      activeImageIndex === index 
                        ? "border-primary shadow-sm scale-95 ring-2 ring-primary/20" 
                        : "border-transparent hover:border-outline-variant/60 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image src={image} alt={`${product.name} thumbnail ${index + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info & Purchase Action */}
          <div className="flex flex-col rounded-3xl border border-outline-variant/40 bg-surface p-6 sm:p-10 shadow-sm">
            
            {/* Brand & Category badges */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {product.brand} • {product.category}
              </span>
              {product.sku && (
                <span className="text-[11px] font-mono text-secondary-text bg-surface-container-high px-2.5 py-0.5 rounded-md">
                  SKU: {selectedVariant ? selectedVariant.sku : product.sku}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="mb-3 text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-primary-text tracking-tight">
              {product.name}
            </h1>
            
            {/* Rating & Sold count */}
            <div className="mb-6 flex items-center gap-3 text-xs sm:text-sm">
              <div className="flex text-amber-500 text-xs">
                {"★".repeat(Math.round(product.rating || 5))}
                {"☆".repeat(5 - Math.round(product.rating || 5))}
              </div>
              <span className="font-bold text-primary-text">{product.rating || "5.0"}</span>
              <span className="text-secondary-text">({product.reviews || 0} {tProd("reviews")})</span>
              {product.totalSold !== undefined && product.totalSold > 0 && (
                <>
                  <span className="text-secondary-text">•</span>
                  <span className="text-secondary-text font-medium">{product.totalSold.toLocaleString()} sold</span>
                </>
              )}
            </div>

            {/* Short Description */}
            {product.shortDescription && (
              <p className="mb-6 text-xs sm:text-sm text-secondary-text leading-relaxed bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
                🌿 {product.shortDescription}
              </p>
            )}

            {/* Flash Sale Mini-Timer & Scarcity Box (Chỉ hiển thị khi sản phẩm thực sự đang có ưu đãi giảm giá) */}
            {product.originalPrice > currentPrice && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#FFF0F5] to-[#FAF0F3] border border-pink-200/90 shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#D23F72]">
                    <Zap className="h-3.5 w-3.5 fill-[#D23F72] text-[#D23F72] animate-bounce" />
                    <span>FLASH SALE</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-white bg-[#211a1c] px-2.5 py-0.5 rounded-md shadow-xs">
                    <Clock className="h-3 w-3 text-amber-300" />
                    <span>{countdownStr}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-secondary-text mb-1.5">
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span>Đang có <strong className="text-primary font-bold">18 người</strong> cùng xem</span>
                  </span>
                  <span className="font-semibold text-[#D23F72]">Chỉ còn 7 suất ưu đãi</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-pink-200/70 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#D23F72] w-[82%]" />
                </div>
              </div>
            )}

            {/* Price section */}
            <div className="mb-8 flex items-baseline gap-4 pb-6 border-b border-outline-variant/30">
              <span className="text-3xl font-serif font-bold text-primary">
                {formatPrice(currentPrice)}
              </span>
              {product.originalPrice > currentPrice && (
                <span className="text-base text-secondary-text line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              {product.originalPrice > currentPrice && (
                <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-bold text-primary">
                  {tProd("savings")} {Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)}%
                </span>
              )}
            </div>

            {/* Variants Selector */}
            {hasVariants && (
              <div className="mb-8 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-text">
                    {product.option1Name || tProd("selectOption")}
                  </h3>
                  <span className="text-xs font-semibold text-primary">
                    {selectedVariant?.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((v, idx) => {
                    const isSelected = selectedVariantIndex === idx;
                    return (
                      <button 
                        key={v.id || v.sku || idx}
                        onClick={() => setSelectedVariantIndex(idx)}
                        className={`rounded-2xl border px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-2 ${
                          isSelected 
                            ? "border-primary bg-primary text-on-primary shadow-sm" 
                            : "border-outline-variant/60 bg-surface text-secondary-text hover:border-primary hover:text-primary-text"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                        <span>{v.label}</span>
                        {v.price !== product.price && (
                          <span className={`text-[10px] ${isSelected ? "text-primary-fixed" : "text-primary font-bold"}`}>
                            ({formatPrice(v.price)})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Stock indicator */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <PackageCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">
                    {isOutOfStock ? tProd("outOfStock") : `${tProd("inStock")}: ${currentStock}`}
                  </span>
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart CTAs */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4">
              
              {/* Counter */}
              <div className="flex items-center justify-between rounded-full border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 w-full sm:w-36">
                <button 
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-secondary-text transition hover:bg-surface hover:text-primary disabled:opacity-30"
                  disabled={qty <= 1 || isOutOfStock}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-primary-text">{qty}</span>
                <button 
                  onClick={() => setQty(qty + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-secondary-text transition hover:bg-surface hover:text-primary disabled:opacity-30"
                  disabled={isOutOfStock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {/* Add to Bag Button */}
              <button 
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 flex h-12 sm:h-auto items-center justify-center gap-2 rounded-full bg-primary px-8 text-xs font-bold uppercase tracking-wider text-on-primary shadow-sm hover:bg-secondary transition active:scale-95 disabled:opacity-50"
              >
                <ShoppingBag className="h-4 w-4" />
                {isOutOfStock ? tProd("outOfStock") : tProd("addToCart")}
              </button>

              {/* Wishlist button */}
              <button 
                onClick={() => {
                  setIsWishlisted(!isWishlisted);
                  toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist!");
                }}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition ${
                  isWishlisted 
                    ? "border-secondary bg-surface-container-high text-secondary" 
                    : "border-outline-variant/60 text-secondary-text hover:border-primary hover:text-primary"
                }`}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? "fill-secondary text-secondary" : ""}`} />
              </button>
            </div>

            {/* Full Description */}
            <div className="pt-6 border-t border-outline-variant/30 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary-text mb-3">
                {tProd("description")}
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-secondary-text whitespace-pre-line font-normal">
                {product.description}
              </p>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3.5 rounded-2xl bg-surface-container-low p-4 text-xs text-secondary-text border border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <Leaf className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-medium">Hoạt chất sinh học Thụy Sĩ</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium">Kiểm nghiệm da liễu lâm sàng</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Droplets className="h-4 w-4 text-sky-500 flex-shrink-0" />
                <span className="font-medium">Cấp ẩm màng tế bào 24h</span>
              </div>
              <div className="flex items-center gap-2.5">
                <RefreshCcw className="h-4 w-4 text-[#D23F72] flex-shrink-0" />
                <span className="font-medium">Cam kết đổi trả 30 ngày</span>
              </div>
            </div>

          </div>
        </div>

        {/* Detailed Sections: Ingredients Matrix & Cross-Sell */}
        <div className="mt-16 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          
          {/* Clinical & Botanical Matrix */}
          <section className="rounded-3xl border border-nude/40 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-[#D23F72] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" /> {tProd("ingredients")}
            </div>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight mb-6">
              Bảng Thành Phần Hoạt Tính (Ingredients Matrix)
            </h2>

            {product.rawIngredients && product.rawIngredients.length > 0 ? (
              <div className="space-y-3">
                {product.rawIngredients.map((item: any, idx: number) => {
                  const isObj = typeof item === "object" && item !== null;
                  const name = isObj ? item.ingredientName : String(item);
                  const percentage = isObj ? item.percentage : null;

                  return (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FCF8F9] border border-nude/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-[#D23F72]" />
                        <span className="text-sm font-semibold text-text-primary">{name}</span>
                      </div>
                      {percentage && (
                        <span className="text-xs font-mono font-bold text-[#D23F72] bg-white px-2 py-0.5 rounded-md border border-nude/40">
                          {percentage}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-secondary">
                {product.ingredients?.map((ing, i) => (
                  <li key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF3F5]">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-rose" />
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Related Products / Complete Your Ritual */}
          <aside className="rounded-3xl border border-nude/40 bg-white p-8 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D23F72] block mb-2">
              SYNERGISTIC RITUAL
            </span>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight mb-6">
              {tProd("relatedProducts")}
            </h2>

            <div className="space-y-4">
              {relatedProducts && relatedProducts.length > 0 ? (
                relatedProducts.map((item) => (
                  <Link 
                    key={item.id} 
                    href={`/product/${item.slug}`} 
                    className="group flex gap-4 rounded-2xl border border-nude/30 bg-[#FCF8F9] p-3 transition hover:border-primary-rose hover:bg-white hover:shadow-xs"
                  >
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-white border border-nude/30">
                      <Image 
                        src={item.gallery?.[0] || item.primaryImage || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300"} 
                        alt={item.name} 
                        fill 
                        className="object-cover transition-transform group-hover:scale-105" 
                      />
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary truncate">
                        {item.brand || item.brandName || "Glow-Up"}
                      </span>
                      <h4 className="text-xs font-bold text-text-primary group-hover:text-primary-rose transition-colors truncate mb-1">
                        {item.name}
                      </h4>
                      <span className="text-xs font-serif font-bold text-primary">
                        {formatPrice(item.price || item.salePrice || item.basePrice || 0)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-xs text-text-secondary py-6 text-center">
                  Đang cập nhật các sản phẩm gợi ý cùng bộ sưu tập...
                </div>
              )}
            </div>
          </aside>

        </div>

      </div>

      {/* Fullscreen Product Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={lightboxImages}
        currentIndex={activeImageIndex}
        onNavigate={(idx) => setActiveImageIndex(idx)}
      />
    </div>
  );
}
