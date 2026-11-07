"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { 
  Sparkles, 
  Tag, 
  Gift, 
  Clock, 
  ShoppingBag, 
  Copy, 
  Check, 
  ShieldCheck, 
  Truck, 
  HeartHandshake, 
  Percent,
  Award,
  ZoomIn
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";
import ImageLightboxModal, { LightboxImageItem } from "@/components/ImageLightboxModal";

export default function OffersPage() {
  const { addItem } = useCartStore();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const promoCodes = [
    {
      code: "RADIANT20",
      discount: "20% OFF",
      description: "Áp dụng cho dòng Serum & Tinh chất Bio-Peptide đơn hàng từ 1.500.000₫",
      expiry: "HSD: 31/10/2026",
      tag: "HOTTEST",
    },
    {
      code: "GLOWGIFT",
      discount: "QUÀ TẶNG 450K",
      description: "Tặng Thanh lăn thạch anh hồng Rose Quartz Gua Sha cho đơn từ 2.000.000₫",
      expiry: "HSD: 15/11/2026",
      tag: "GIFT TIER",
    },
    {
      code: "FREESHIP",
      discount: "FREE SHIP 0Đ",
      description: "Miễn phí vận chuyển hỏa tốc lạnh tiêu chuẩn Thụy Sĩ toàn quốc",
      expiry: "HSD: Vô thời hạn",
      tag: "ALL ORDERS",
    },
  ];

  const bundleOffers = [
    {
      id: "bundle-glass-skin",
      name: "Atelier Duo: Peptide Glaze + Ceramide Cream",
      originalPrice: 2850000,
      salePrice: 2280000,
      discount: "-20%",
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
      desc: "Bộ đôi tái tạo màng ẩm tế bào da, giảm nếp nhăn vi mô và duy trì độ căng bóng dewy suốt 24h.",
      badge: "Best Seller Bundle",
    },
    {
      id: "bundle-sun-defense",
      name: "Solar Shield Duo: Edelweiss SPF 50+ & Cleansing Milk",
      originalPrice: 1950000,
      salePrice: 1560000,
      discount: "-20%",
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
      desc: "Bảo vệ màng khoáng không hạt nano kết hợp sữa rửa mặt thảo mộc núi Alpine dịu nhẹ.",
      badge: "Summer Essential",
    },
    {
      id: "bundle-vault-deluxe",
      name: "The Nocturnal Cell-Repair Vault (Full Set 4 món)",
      originalPrice: 4200000,
      salePrice: 3150000,
      discount: "-25%",
      image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800",
      desc: "Hộp quà tặng hoàng gia gồm Retinol sinh học Thụy Sĩ, Dầu dưỡng khô và Mặt nạ ngủ lụa tơ tằm.",
      badge: "VIP Vault Exclusive",
    },
  ];

  const giftTiers = [
    {
      minSpend: "1.000.000₫",
      giftTitle: "Sample Vault Mini (3x 5ml)",
      giftDesc: "3 mẫu thử serum phục hồi tế bào gốc độc quyền.",
      icon: Gift,
    },
    {
      minSpend: "2.000.000₫",
      giftTitle: "Rose Quartz Gua Sha Tool",
      giftDesc: "Thanh thạch anh hồng thủ công nâng cơ mặt trị giá 450.000₫.",
      icon: Sparkles,
    },
    {
      minSpend: "3.500.000₫",
      giftTitle: "Bespoke Silk Pouch & Full Cream",
      giftDesc: "Túi nhung cao cấp kèm Kem dưỡng Ceramide 30ml trị giá 950.000₫.",
      icon: Award,
    },
  ];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Đã sao chép mã ưu đãi: ${code}`, {
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
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleAddBundle = (bundle: typeof bundleOffers[0]) => {
    addItem({
      id: bundle.id,
      productId: bundle.id,
      name: bundle.name,
      price: bundle.salePrice,
      image: bundle.image,
      quantity: 1,
    });
    toast.success(`Đã thêm combo "${bundle.name}" vào giỏ hàng!`, {
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

  return (
    <div className="min-h-screen bg-transparent text-on-surface pb-20">
      
      {/* Top Banner Accent */}
      <div className="bg-surface-container-high text-primary border-b border-outline-variant/30 py-2.5 text-center text-xs tracking-wider font-medium">
        ✨ Quà tặng sinh nhật độc quyền và tích điểm thưởng Glow Points cho mọi đơn hàng Atelier VIP
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">

        {/* =========================================================================
            HERO HEADER
        ========================================================================= */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-outline-variant/40 bg-surface text-primary text-[11px] font-bold uppercase tracking-widest mb-4 shadow-xs">
            <Tag className="h-3.5 w-3.5" /> Exclusive Privileges & Seasonal Offers
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight text-primary-text mb-4">
            Đặc Quyền Ưu Đãi & Quà Tặng Atelier
          </h1>
          <p className="text-secondary-text text-sm sm:text-base leading-relaxed">
            Khám phá những gói đặc quyền chăm sóc da chuyên sâu, mã ưu đãi mùa hoa Alpine và quà tặng thủ công sang trọng chỉ dành cho thành viên Glow-Up.
          </p>
        </div>


        {/* =========================================================================
            PROMO VOUCHER CODES SECTION
        ========================================================================= */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary-text flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" /> Mã Giảm Giá Đang Kích Hoạt
            </h2>
            <span className="text-xs text-secondary-text">Chạm để sao chép mã tự động</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {promoCodes.map((promo) => (
              <div 
                key={promo.code}
                className="relative rounded-3xl luxury-card p-6 luxury-card-hover flex flex-col justify-between group"
              >
                <div className="absolute top-4 right-4">
                  <span className="rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {promo.tag}
                  </span>
                </div>

                <div>
                  <div className="text-2xl font-serif font-bold text-primary mb-1">
                    {promo.discount}
                  </div>
                  <div className="text-xs font-bold text-primary-text uppercase tracking-wider mb-3">
                    Code: <span className="text-secondary font-mono font-black">{promo.code}</span>
                  </div>
                  <p className="text-xs text-secondary-text leading-relaxed mb-6">
                    {promo.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-secondary-text flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {promo.expiry}
                  </span>

                  <button
                    onClick={() => handleCopyCode(promo.code)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low border border-outline-variant/60 px-4 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-on-primary hover:border-primary transition shadow-xs active:scale-95"
                  >
                    {copiedCode === promo.code ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Đã chép
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Chép mã
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* =========================================================================
            GIFT TIERS SECTION
        ========================================================================= */}
        <div className="mb-20 luxury-card rounded-3xl p-8 sm:p-12 shadow-card">
          <div className="max-w-2xl mb-10">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary block mb-1">
              COMPLIMENTARY RITUAL GIFTS
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary-text tracking-tight">
              Quà Tặng Theo Giá Trị Đơn Hàng
            </h2>
            <p className="text-xs sm:text-sm text-secondary-text mt-1">
              Hệ thống tự động kích hoạt quà tặng vào giỏ hàng của bạn khi đạt các hạn mức sau:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {giftTiers.map((tier, idx) => {
              const IconComp = tier.icon;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl border border-pink-100/70 bg-white/95 p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-primary hover:-translate-y-1 transition-all duration-300"
                >
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-high text-primary mb-4">
                      <IconComp className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-surface-container px-2.5 py-1 rounded-md inline-block mb-3">
                      Đơn từ {tier.minSpend}
                    </span>
                    <h3 className="text-base font-serif font-bold text-primary-text mb-2">
                      {tier.giftTitle}
                    </h3>
                    <p className="text-xs text-secondary-text leading-relaxed">
                      {tier.giftDesc}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-outline-variant/20 mt-6 flex items-center justify-between text-xs font-bold text-primary">
                    <span>Tự động áp dụng</span>
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* =========================================================================
            SEASONAL BUNDLE OFFERS (COMBO KHUYẾN MÃI)
        ========================================================================= */}
        <div className="mb-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary block mb-1">
                LIMITED EDITION SETS
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary-text tracking-tight">
                Bộ Combo Công Thức Tiết Kiệm Đến 25%
              </h2>
              <p className="text-xs sm:text-sm text-secondary-text mt-1">
                Kết hợp các hoạt chất hiệp đồng giúp tăng cường hiệu quả dưỡng ẩm và phục hồi da tối ưu.
              </p>
            </div>

            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-full border border-pink-100/80 bg-white/90 px-6 py-2.5 text-xs font-bold text-primary-text hover:border-primary hover:text-primary transition self-start md:self-auto shadow-xs"
            >
              Xem Tất Cả Sản Phẩm
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {bundleOffers.map((bundle) => (
              <div 
                key={bundle.id}
                className="rounded-3xl luxury-card p-6 luxury-card-hover flex flex-col text-left group"
              >
                <div 
                  onClick={() => setLightboxIndex(bundleOffers.findIndex(b => b.id === bundle.id))}
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-container-low mb-5 cursor-zoom-in group/img"
                  title="Nhấn để phóng to ảnh trọn bộ ưu đãi"
                >
                  <Image
                    src={bundle.image}
                    alt={bundle.name}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="flex items-center gap-1.5 rounded-full bg-surface/95 text-primary-text px-3 py-1.5 text-xs font-bold shadow-md border border-white/60">
                      <ZoomIn className="h-3.5 w-3.5 text-primary" /> Phóng to ảnh
                    </span>
                  </div>
                  <span className="absolute top-3 left-3 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white z-10 pointer-events-none">
                    {bundle.badge}
                  </span>
                  <span className="absolute top-3 right-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-on-primary z-10 pointer-events-none">
                    {bundle.discount}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-serif font-bold text-primary-text mb-2 line-clamp-1">
                  {bundle.name}
                </h3>
                <p className="text-xs text-secondary-text leading-relaxed mb-6 flex-1 font-normal">
                  {bundle.desc}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20 mt-auto">
                  <div>
                    <span className="text-[11px] text-secondary-text line-through block font-medium">
                      {bundle.originalPrice.toLocaleString('vi-VN')}₫
                    </span>
                    <span className="text-lg font-serif font-bold text-primary">
                      {bundle.salePrice.toLocaleString('vi-VN')}₫
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddBundle(bundle)}
                    className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-sm hover:bg-secondary transition flex items-center gap-1.5 active:scale-95"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> Thêm Vào Giỏ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* =========================================================================
            VIP MEMBER PERKS CALLOUT
        ========================================================================= */}
        <div className="mb-20 rounded-3xl border border-outline-variant/40 bg-surface-container-low p-8 sm:p-12 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary block mb-2">
              MEMBERSHIP ADVANTAGES
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-primary mb-3">
              Gia Nhập Radiant Atelier Để Nhận Thêm 10% Cho Đơn Hàng Đầu Tiên
            </h3>
            <p className="text-xs sm:text-sm text-secondary-text leading-relaxed">
              Thành viên chính thức được tích lũy 1 điểm Glow Points cho mỗi 1.000₫ chi tiêu, nhận quà sinh nhật phiên bản giới hạn, và quyền mua trước các đợt phát hành nguyên liệu mùa vụ giới hạn từ Geneva.
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-xs font-bold text-on-primary shadow-sm hover:bg-secondary transition text-center active:scale-95"
            >
              Đăng Ký Thành Viên Ngay
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-surface px-6 py-3 text-xs font-bold text-primary hover:bg-surface-container transition text-center"
            >
              Đã Có Tài Khoản? Đăng Nhập
            </Link>
          </div>
        </div>


        {/* =========================================================================
            BOTTOM TRUST PILLARS
        ========================================================================= */}
        <div className="border-t border-outline-variant/30 pt-10 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-primary mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">Swiss-Formulated</h4>
            <p className="text-[11px] text-on-surface-variant mt-1">Hoạt chất sinh học lâm sàng</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-primary mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">100% Chính Hãng</h4>
            <p className="text-[11px] text-on-surface-variant mt-1">Bảo quản chai thủy tinh tím UV</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-primary mb-3">
              <Truck className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">Giao Hàng Miễn Phí</h4>
            <p className="text-[11px] text-on-surface-variant mt-1">Đơn hàng từ 1.000.000₫</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-primary mb-3">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">Đổi Trả 30 Ngày</h4>
            <p className="text-[11px] text-on-surface-variant mt-1">Hỗ trợ miễn phí tận tâm</p>
          </div>
        </div>

      </div>

      {/* Fullscreen Bundle Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        images={bundleOffers.map(b => ({
          url: b.image,
          title: b.name,
          caption: b.desc,
          badge: b.discount,
          location: b.badge,
        }))}
        currentIndex={lightboxIndex ?? 0}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  );
}
