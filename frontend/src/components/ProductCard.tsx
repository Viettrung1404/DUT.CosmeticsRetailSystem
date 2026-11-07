"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Heart, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

export interface UnifiedProduct {
  id: string;
  name: string;
  slug: string;
  price?: number;
  basePrice?: number;
  salePrice?: number | null;
  originalPrice?: number;
  brand?: string;
  brandName?: string;
  rating?: number;
  avgRating?: number;
  reviews?: number;
  totalReviews?: number;
  badge?: string;
  gallery?: string[];
  images?: Array<{ imageUrl: string; isPrimary?: boolean }>;
  primaryImage?: string;
}

export default function ProductCard({ product }: { product: UnifiedProduct }) {
  const { addItem } = useCartStore();
  const { formatPrice } = useCurrency();
  const t = useTranslations("product");

  // Normalize fields between backend NestJS API and mock data
  const finalPrice = product.salePrice || product.price || product.basePrice || 0;
  const originalPrice = product.originalPrice || (product.salePrice ? product.basePrice : 0) || 0;
  
  const displayImage =
    product.primaryImage ||
    product.images?.find((img) => img.isPrimary)?.imageUrl ||
    product.images?.[0]?.imageUrl ||
    product.gallery?.[0] ||
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800";

  const brandName = product.brandName || product.brand || "GlowUp Swiss";
  const rating = product.avgRating ?? product.rating ?? 5.0;
  const reviewsCount = product.totalReviews ?? product.reviews ?? 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: finalPrice,
      image: displayImage,
      quantity: 1,
    });
    toast.success(`${t("added")}: "${product.name}"`, {
      style: {
        borderRadius: "14px",
        background: "#064e3b",
        color: "#ffffff",
      },
      iconTheme: {
        primary: "#FFA6C9",
        secondary: "#064e3b",
      },
    });
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl luxury-card p-3.5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl border border-white/80 h-full">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#FEF0F3]">
        <Link href={`/product/${product.slug}`} className="block h-full w-full">
          <Image
            src={displayImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        </Link>

        {/* Wishlist Button */}
        <button
          aria-label={t("addToWishlist")}
          className="absolute right-3 top-3 rounded-full bg-white/80 p-2 text-text-secondary backdrop-blur-sm transition hover:bg-white hover:text-primary-rose"
        >
          <Heart className="h-4 w-4" />
        </button>

        {/* Badge */}
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-primary-rose px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            {product.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
          <span className="font-medium uppercase tracking-wider">{brandName}</span>
        </div>

        <Link
          href={`/product/${product.slug}`}
          className="mb-2 line-clamp-2 text-sm font-semibold text-text-primary transition hover:text-primary-rose"
        >
          {product.name}
        </Link>

        <div className="mb-3 flex items-center gap-1 text-xs text-status-warning">
          <span>★</span>
          <span className="font-medium text-text-primary">{Number(rating).toFixed(1)}</span>
          <span className="text-text-secondary">({reviewsCount})</span>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-primary-rose">
              {formatPrice(finalPrice)}
            </span>
            {originalPrice > finalPrice && (
              <span className="text-xs text-text-secondary line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            aria-label={t("addToCart")}
            title={t("addToCart")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-text-primary text-white transition hover:bg-primary-rose active:scale-95 shadow-sm"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
