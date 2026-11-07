"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { 
  Heart, 
  ShoppingBag, 
  Share2, 
  Bell, 
  Plus, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Gift, 
  Flame, 
  Droplets,
  Package,
  RotateCcw,
  ZoomIn
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import ImageLightboxModal from "@/components/ImageLightboxModal";

interface WishlistItem {
  id: string;
  slug: string;
  name: string;
  badge: string;
  badgeType: "pink" | "green" | "gold" | "grey";
  image: string;
  rating: number;
  reviewsCount: number;
  shortDesc: string;
  variantLabel: string;
  price: number;
  inStock: boolean;
  stockStatus: "in-stock" | "low-stock" | "restocking";
  stockText: string;
  category: "serums" | "body" | "tools" | "lip" | "creams";
}

const INITIAL_WISHLIST: WishlistItem[] = [
  {
    id: "wish-01",
    slug: "peptide-glaze-elixir",
    name: "Peptide Glaze Elixir",
    badge: "Best Seller",
    badgeType: "pink",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    reviewsCount: 182,
    shortDesc: "Illuminating & Firming Serum with micro-gold suspended peptides",
    variantLabel: "Size: 30ml exact dropper",
    price: 540000,
    inStock: true,
    stockStatus: "in-stock",
    stockText: "Còn hàng",
    category: "serums",
  },
  {
    id: "wish-02",
    slug: "dewy-velvet-lip-oil",
    name: "Dewy Velvet Lip Oil",
    badge: "Hydrating Tint",
    badgeType: "pink",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    reviewsCount: 91,
    shortDesc: "Plumping nourishment infused with cold-pressed rosehip & botanical squalane",
    variantLabel: "Rose Quartz (11ml)",
    price: 280000,
    inStock: true,
    stockStatus: "in-stock",
    stockText: "Còn hàng",
    category: "lip",
  },
  {
    id: "wish-03",
    slug: "cloud-ceramides-cream",
    name: "Cloud Ceramides Cream",
    badge: "Allure Winner 2024",
    badgeType: "green",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
    rating: 5.0,
    reviewsCount: 144,
    shortDesc: "Intensive multi-molecular lipid barrier cream with soothing snow mushroom",
    variantLabel: "Size: 50ml Jar",
    price: 480000,
    inStock: true,
    stockStatus: "in-stock",
    stockText: "Còn hàng",
    category: "creams",
  },
  {
    id: "wish-04",
    slug: "swiss-bio-retinol-nectar",
    name: "Swiss Bio-Retinol Nectar",
    badge: "Clean Formula",
    badgeType: "pink",
    image: "https://images.unsplash.com/photo-1608248597359-5970377ebff2?w=800",
    rating: 4.9,
    reviewsCount: 84,
    shortDesc: "Gentle bakuchiol & botanical emulsion accelerates cellular renewal for nocturnal renewal.",
    variantLabel: "Size: 30ml Pipette",
    price: 680000,
    inStock: true,
    stockStatus: "low-stock",
    stockText: "Sắp hết hàng - Còn 3 lọ",
    category: "serums",
  },
  {
    id: "wish-05",
    slug: "sculpting-gua-sha",
    name: "Sculpting Gua Sha",
    badge: "100% Genuine Crystal",
    badgeType: "grey",
    image: "https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    reviewsCount: 312,
    shortDesc: "Hand-crafted rose quartz facial contours lifter with ergonomic precision curves.",
    variantLabel: "Material: Grade-A Quartz",
    price: 320000,
    inStock: false,
    stockStatus: "restocking",
    stockText: "Đang về thêm hàng",
    category: "tools",
  },
  {
    id: "wish-06",
    slug: "soleil-glow-body-shimmer",
    name: "Soleil Glow Body Shimmer",
    badge: "Body Radiance",
    badgeType: "gold",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    reviewsCount: 205,
    shortDesc: "Silky dry-touch illuminating oil scented with bergamot and Tahitian gardenia",
    variantLabel: "Size: 100ml Glass Pump",
    price: 640000,
    inStock: true,
    stockStatus: "in-stock",
    stockText: "Còn hàng",
    category: "body",
  },
];

export default function WishlistPage() {
  const { addItem } = useCartStore();
  const { formatPrice } = useCurrency();
  const tNav = useTranslations("nav");
  const tProd = useTranslations("product");
  const [items, setItems] = useState<WishlistItem[]>(INITIAL_WISHLIST);
  const [activeFilter, setActiveFilter] = useState<"all" | "in-stock" | "restocking" | "serums">("all");
  const [sortBy, setSortBy] = useState("recently-saved");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleToggleHeart = (item: WishlistItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success(`Đã xóa "${item.name}" khỏi danh sách yêu thích`, {
      style: { background: "#211a1c", color: "#fff", borderRadius: "12px" },
      iconTheme: { primary: "#FFA6C9", secondary: "#211a1c" },
    });
  };

  const handleAddToCart = (item: WishlistItem) => {
    addItem({
      id: item.id,
      productId: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1,
    });
    toast.success(`Đã thêm "${item.name}" vào giỏ hàng!`, {
      style: { background: "#211a1c", color: "#fff", borderRadius: "12px" },
      iconTheme: { primary: "#FFA6C9", secondary: "#211a1c" },
    });
  };

  const handleMoveAllToBag = () => {
    const availableItems = items.filter((i) => i.inStock);
    if (availableItems.length === 0) {
      toast.error("Không có sản phẩm nào khả dụng để chuyển vào giỏ!");
      return;
    }
    availableItems.forEach((i) => {
      addItem({
        id: i.id,
        productId: i.id,
        name: i.name,
        price: i.price,
        image: i.image,
        quantity: 1,
      });
    });
    toast.success(`Đã thêm tất cả ${availableItems.length} sản phẩm vào giỏ hàng!`, {
      style: { background: "#211a1c", color: "#fff", borderRadius: "12px" },
      iconTheme: { primary: "#FFA6C9", secondary: "#211a1c" },
    });
  };

  const handleNotifyRestock = (item: WishlistItem) => {
    toast.success(`Đã đăng ký nhận thông báo khi có hàng lại cho "${item.name}"!`, {
      style: { background: "#211a1c", color: "#fff", borderRadius: "12px" },
      iconTheme: { primary: "#FFA6C9", secondary: "#211a1c" },
    });
  };

  const filteredItems = items.filter((item) => {
    if (activeFilter === "in-stock") return item.inStock;
    if (activeFilter === "restocking") return !item.inStock;
    if (activeFilter === "serums") return item.category === "serums";
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
  });

  return (
    <div className="bg-transparent min-h-screen text-text-primary pb-24 relative overflow-hidden font-poppins">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
          <Link href="/" className="hover:text-primary-rose transition-colors">{tNav("home")}</Link>
          <span>/</span>
          <span className="text-text-primary">{tNav("wishlist")}</span>
        </div>

        {/* Header Title Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-pink-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#732845] block mb-1">
              GlowUp Swiss Atelier
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#211a1c] tracking-tight">
              {tNav("wishlist")} ({items.length})
            </h1>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleMoveAllToBag}
              className="rounded-full bg-[#732845] hover:bg-[#5c2037] text-white px-7 py-3 text-xs font-bold uppercase tracking-wider transition shadow-sm active:scale-95 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Thêm Tất Cả Vào Giỏ</span>
            </button>
          )}
        </div>

        {/* Grid Wishlist Items */}
        {sortedItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {sortedItems.map((item, index) => (
              <div 
                key={item.id}
                className="luxury-card rounded-3xl p-5 flex flex-col justify-between group hover:shadow-lg transition-all duration-300 border border-[#F3E5E8] bg-white"
              >
                <div>
                  {/* Image container */}
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-pink-50/50 mb-4 cursor-pointer" onClick={() => setLightboxIndex(index)}>
                    <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    
                    {/* Badge */}
                    <span className="absolute top-3 left-3 rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#732845] border border-pink-100 shadow-2xs">
                      {item.badge}
                    </span>

                    {/* Delete Heart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleHeart(item);
                      }}
                      className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-[#732845] flex items-center justify-center shadow-xs transition active:scale-90"
                      title="Xóa khỏi yêu thích"
                    >
                      <Heart className="h-4 w-4 fill-[#732845] text-[#732845]" />
                    </button>
                  </div>

                  {/* Product Title */}
                  <h3 className="text-base font-serif font-bold text-[#211a1c] mb-1 group-hover:text-[#732845] transition-colors leading-snug">
                    <Link href={`/product/${item.slug}`}>
                      {item.name}
                    </Link>
                  </h3>

                  <p className="text-xs text-secondary-text leading-relaxed font-normal mb-3 line-clamp-2">
                    {item.shortDesc}
                  </p>
                </div>

                {/* Price & Action Button */}
                <div className="pt-4 border-t border-pink-100/70 flex items-center justify-between gap-3">
                  <span className="text-lg font-serif font-bold text-[#065F46]">
                    {formatPrice(item.price)}
                  </span>

                  {item.inStock ? (
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="rounded-full bg-[#065F46] hover:bg-[#044a36] text-white px-5 py-2.5 text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>{tProd("addToCart")}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleNotifyRestock(item)}
                      className="rounded-full bg-[#FAF0F3] hover:bg-[#FFE8F0] border border-pink-200 text-[#732845] px-4 py-2.5 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 active:scale-95"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      <span>Nhắc khi có hàng</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 rounded-3xl p-8 bg-white border border-[#F3E5E8] shadow-sm">
            <Heart className="h-12 w-12 text-[#FFA6C9] mx-auto stroke-1 mb-4" />
            <h3 className="text-xl font-serif font-bold text-[#211a1c] mb-2">
              Danh sách lưu của bạn đang trống
            </h3>
            <p className="text-xs text-secondary-text max-w-sm mx-auto mb-6">
              Hãy khám phá các công thức sinh học Thụy Sĩ và lưu lại sản phẩm bạn yêu thích.
            </p>
            <Link
              href="/shop"
              className="inline-flex rounded-full bg-[#732845] text-white px-6 py-2.5 text-xs font-bold hover:bg-[#5c2037] transition"
            >
              Khám Phá Sản Phẩm
            </Link>
          </div>
        )}

      </div>

      {/* Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        images={sortedItems.map(i => ({
          url: i.image,
          title: i.name,
          caption: i.shortDesc,
          badge: i.badge,
          location: i.variantLabel,
        }))}
        currentIndex={lightboxIndex ?? 0}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  );
}
