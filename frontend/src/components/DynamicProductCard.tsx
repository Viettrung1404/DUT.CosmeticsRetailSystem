"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/hooks/useCurrency";
import { Heart, Plus, Check, Loader2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";

export interface ProductVariant {
  name: string;
  priceMultiplier?: number;
  price?: number;
  sku?: string;
}

export interface DynamicProductProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image: string;
  hoverImage?: string;
  images?: string[];
  category?: string;
  rating?: number;
  reviews?: number;
  badge?: string;
  description?: string;
  variants?: ProductVariant[];
}

export default function DynamicProductCard({
  id,
  name,
  slug,
  price,
  originalPrice,
  image,
  hoverImage,
  images,
  category = "Swiss Formulation",
  rating = 4.9,
  reviews = 128,
  badge = "Bestseller",
  description = "Hoạt chất sinh học phục hồi màng tế bào chuẩn Thụy Sĩ.",
  variants = [
    { name: "30ml", priceMultiplier: 1 },
    { name: "50ml", priceMultiplier: 1.45 },
    { name: "100ml", priceMultiplier: 2.3 },
  ],
}: DynamicProductProps) {
  const tProd = useTranslations("product");
  const { formatPrice } = useCurrency();
  const { addItem } = useCartStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(variants[0] || { name: "Standard" });
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isInMiddle, setIsInMiddle] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Tập hợp danh sách các ảnh của sản phẩm để chuyển động liên tục
  const allImages = useMemo(() => {
    if (images && images.length > 0) return images;
    const list = [image];
    if (hoverImage && hoverImage !== image) {
      list.push(hoverImage);
    }
    return list;
  }, [image, hoverImage, images]);

  // Nhận diện khi sản phẩm nằm ở khoảng giữa trang (viewport)
  useEffect(() => {
    const el = cardRef.current;
    if (!el || allImages.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInMiddle(entry.isIntersecting);
        });
      },
      {
        root: null,
        // Kích hoạt khi thẻ nằm trong khoảng giữa màn hình (-15% lề trên và dưới)
        rootMargin: "-15% 0px -15% 0px",
        threshold: 0.25,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [allImages.length]);

  // Tự động chuyển đổi ảnh liên tục khi sản phẩm nằm ở giữa trang
  useEffect(() => {
    if (!isInMiddle || allImages.length <= 1) return;

    const interval = setInterval(() => {
      setActiveImgIndex((prev) => (prev + 1) % allImages.length);
    }, 2800);

    return () => clearInterval(interval);
  }, [isInMiddle, allImages.length]);

  // Tính giá theo variant được chọn
  const currentPrice = selectedVariant.price 
    ? selectedVariant.price 
    : Math.round(price * (selectedVariant.priceMultiplier || 1));

  const currentOriginalPrice = originalPrice 
    ? Math.round(originalPrice * (selectedVariant.priceMultiplier || 1))
    : undefined;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAdding || isAdded) return;

    setIsAdding(true);

    setTimeout(() => {
      addItem({
        id: `${id}-${selectedVariant.name}`,
        productId: id,
        name: name,
        price: currentPrice,
        image: allImages[0] || image,
        quantity: 1,
        variant: selectedVariant.name,
      });

      setIsAdding(false);
      setIsAdded(true);

      toast.success(`Đã thêm ${name} (${selectedVariant.name}) vào giỏ!`, {
        style: {
          borderRadius: "12px",
          background: "#211a1c",
          color: "#fff",
          fontSize: "12px",
        },
      });

      // Reset trạng thái sau 1.8s
      setTimeout(() => {
        setIsAdded(false);
      }, 1800);
    }, 350);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    toast(isWishlisted ? "Đã xóa khỏi danh sách yêu thích" : "Đã thêm vào danh sách yêu thích!", {
      icon: isWishlisted ? "🤍" : "💖",
      style: {
        borderRadius: "12px",
        background: "#211a1c",
        color: "#fff",
        fontSize: "12px",
      },
    });
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev + 1) % allImages.length);
  };

  return (
    <div 
      ref={cardRef}
      className={`group relative rounded-3xl luxury-card p-4 transition-all duration-500 flex flex-col justify-between ${
        isInMiddle 
          ? "border-primary/60 shadow-xl -translate-y-1.5 ring-1 ring-primary/25" 
          : "border-white/80 shadow-card hover:shadow-xl hover:border-primary/40 hover:-translate-y-1"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div>
        {/* Khung ảnh sản phẩm tự chuyển đổi liên tục khi ở giữa trang */}
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-surface-container-low mb-4">
          
          {/* Render các ảnh với hiệu ứng Crossfade mượt mà */}
          {allImages.map((imgSrc, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                idx === activeImgIndex
                  ? "opacity-100 scale-100 z-1"
                  : "opacity-0 scale-95 z-0 pointer-events-none"
              }`}
            >
              <Image
                src={imgSrc}
                alt={`${name} - góc nhìn ${idx + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          ))}

          {/* Top Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
            {badge && (
              <span className="rounded-full bg-surface/95 backdrop-blur-md px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-primary border border-outline-variant/30 shadow-2xs">
                {badge}
              </span>
            )}
            {allImages.length > 1 && isInMiddle && (
              <span className="rounded-full bg-primary/90 backdrop-blur-md px-2.5 py-0.5 text-[8px] font-bold text-on-primary animate-pulse shadow-xs">
                Live View {activeImgIndex + 1}/{allImages.length}
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            className={`absolute top-3 right-3 z-10 h-8 w-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 shadow-2xs ${
              isWishlisted 
                ? "bg-surface text-secondary shadow-sm" 
                : "bg-surface/80 text-on-surface-variant hover:text-primary hover:bg-surface"
            }`}
            aria-label={tProd("wishlist")}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? "fill-secondary text-secondary" : ""}`} />
          </button>

          {/* Navigation Arrows khi hover nếu có nhiều ảnh */}
          {allImages.length > 1 && isHovered && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-surface/85 backdrop-blur-md text-on-surface flex items-center justify-center hover:bg-surface hover:text-primary transition shadow-md active:scale-90"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-surface/85 backdrop-blur-md text-on-surface flex items-center justify-center hover:bg-surface hover:text-primary transition shadow-md active:scale-90"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Dots Indicator thanh lịch dạng Dark Capsule Pill khớp ảnh thiết kế */}
          {allImages.length > 1 && (
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-md">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveImgIndex(idx);
                  }}
                  className={`rounded-full transition-all duration-300 cursor-pointer ${
                    idx === activeImgIndex ? "w-5 h-2 bg-white shadow-xs" : "w-2 h-2 bg-white/40 hover:bg-white/80"
                  }`}
                  aria-label={`Image ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Quick View Button on Hover */}
          <Link
            href={`/product/${slug}`}
            className="absolute bottom-9 left-3 right-3 py-2 rounded-xl bg-surface/90 backdrop-blur-md text-[11px] font-bold text-on-surface text-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 flex items-center justify-center gap-1.5 shadow-md hover:bg-surface hover:text-primary z-10"
          >
            <Eye className="h-3.5 w-3.5" /> {tProd("viewDetails")}
          </Link>
        </div>

        {/* Rating & Category */}
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80">
            {category}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-amber-500 text-[11px]">★</span>
            <span className="font-bold text-on-surface text-[11px]">{rating}</span>
            <span className="text-[10px] text-on-surface-variant">({reviews})</span>
          </div>
        </div>

        {/* Title */}
        <Link href={`/product/${slug}`}>
          <h3 className="text-sm sm:text-base font-bold text-on-surface group-hover:text-primary transition-colors mb-1.5 line-clamp-1 font-serif">
            {name}
          </h3>
        </Link>

        {/* Short description */}
        <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed mb-3.5 font-normal">
          {description}
        </p>

        {/* Dynamic Variant Selector Pills (Chọn nhanh dung tích) */}
        {variants.length > 0 && (
          <div className="mb-3.5 pt-2 border-t border-outline-variant/15 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-on-surface-variant font-medium mr-1">{tProd("size")}</span>
            {variants.map((v) => {
              const isSelected = selectedVariant.name === v.name;
              return (
                <button
                  key={v.name}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedVariant(v);
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    isSelected
                      ? "bg-surface-container border border-primary text-primary shadow-2xs"
                      : "bg-surface border border-outline-variant/40 text-on-surface-variant hover:border-primary/60"
                  }`}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Price & Quick Add Button */}
      <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between mt-auto">
        <div>
          <div className="text-base font-serif font-bold text-primary">
            {formatPrice(currentPrice)}
          </div>
          {currentOriginalPrice && currentOriginalPrice > currentPrice && (
            <span className="text-[10px] text-on-surface-variant/60 line-through">
              {formatPrice(currentOriginalPrice)}
            </span>
          )}
        </div>

        {/* Dynamic Quick Add Button với hiệu ứng Animation */}
        <button
          onClick={handleQuickAdd}
          disabled={isAdding}
          className={`rounded-full px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs min-w-[105px] justify-center ${
            isAdded
              ? "bg-emerald-600 text-white"
              : isAdding
              ? "bg-primary/80 text-white cursor-wait"
              : "border border-outline-variant/60 bg-surface text-on-surface hover:bg-primary hover:text-white hover:border-primary"
          }`}
        >
          {isAdding ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{tProd("adding")}</span>
            </>
          ) : isAdded ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>{tProd("added")}</span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              <span>{tProd("addToCart")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
