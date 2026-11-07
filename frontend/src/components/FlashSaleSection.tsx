"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/hooks/useCurrency";
import { 
  Zap, 
  Flame, 
  Clock, 
  ShoppingBag, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  Check, 
  ShieldCheck, 
  Truck, 
  RotateCcw,
  Sparkles
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";

interface FlashDealItem {
  id: string;
  slug: string;
  brand: string;
  name: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  image: string;
  stockTotal: number;
  stockSold: number;
  badgeService?: string;
  isHot?: boolean;
}

interface TimeSlot {
  id: string;
  label: string;
  subLabel: string;
  status: "ended" | "active" | "upcoming";
  items: FlashDealItem[];
}

const FLASH_TIME_SLOTS: TimeSlot[] = [
  {
    id: "slot-1",
    label: "09:00 - 12:00",
    subLabel: "Đã kết thúc",
    status: "ended",
    items: [
      {
        id: "deal-09-01",
        slug: "peptide-glaze-elixir",
        brand: "GLOW-UP SWISS",
        name: "Tinh Chất Phục Hồi Peptide Glaze Elixir 30ml",
        originalPrice: 780000,
        salePrice: 499000,
        discountPercent: 36,
        image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
        stockTotal: 50,
        stockSold: 50,
        badgeService: "GIAO 2H",
        isHot: true,
      },
      {
        id: "deal-09-02",
        slug: "nuoc-tay-trang-bioderma-sensibio-h2o",
        brand: "BIODERMA",
        name: "Nước Tẩy Trang Dành Cho Da Nhạy Cảm 500ml",
        originalPrice: 520000,
        salePrice: 349000,
        discountPercent: 33,
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
        stockTotal: 40,
        stockSold: 40,
        badgeService: "CHÍNH HÃNG",
      },
      {
        id: "deal-09-03",
        slug: "kem-chong-nang-la-roche-posay-anthelios",
        brand: "LA ROCHE-POSAY",
        name: "Kem Chống Nắng Kiểm Soát Dầu Anthelios UVmune 50ml",
        originalPrice: 560000,
        salePrice: 395000,
        discountPercent: 29,
        image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800",
        stockTotal: 30,
        stockSold: 30,
        badgeService: "GIAO 2H",
      },
    ],
  },
  {
    id: "slot-2",
    label: "15:00 - 18:00",
    subLabel: "Đang diễn ra",
    status: "active",
    items: [
      {
        id: "deal-act-01",
        slug: "peptide-glaze-elixir",
        brand: "GLOW-UP SWISS",
        name: "Tinh Chất Căng Bóng Peptide Glaze Elixir 50ml",
        originalPrice: 780000,
        salePrice: 540000,
        discountPercent: 31,
        image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
        stockTotal: 50,
        stockSold: 46,
        badgeService: "GIAO 2H",
        isHot: true,
      },
      {
        id: "deal-act-02",
        slug: "dewy-velvet-lip-oil",
        brand: "GLOW-UP SWISS",
        name: "Dầu Dưỡng Môi Dewy Velvet Lip Oil - Rose Quartz",
        originalPrice: 480000,
        salePrice: 320000,
        discountPercent: 33,
        image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800",
        stockTotal: 60,
        stockSold: 54,
        badgeService: "CHÍNH HÃNG",
        isHot: true,
      },
      {
        id: "deal-act-03",
        slug: "cloud-ceramides-cream",
        brand: "GLOW-UP SWISS",
        name: "Kem Dưỡng Tế Bào Mầm Cloud Ceramides Cream 50ml",
        originalPrice: 950000,
        salePrice: 680000,
        discountPercent: 28,
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
        stockTotal: 40,
        stockSold: 37,
        badgeService: "TẶNG QUÀ",
        isHot: true,
      },
      {
        id: "deal-act-04",
        slug: "serum-duong-am-tra-xanh-innisfree-green-tea-seed",
        brand: "INNISFREE",
        name: "Serum Trà Xanh Dưỡng Ẩm Chuyên Sâu Green Tea Seed 80ml",
        originalPrice: 650000,
        salePrice: 495000,
        discountPercent: 24,
        image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800",
        stockTotal: 45,
        stockSold: 39,
        badgeService: "GIAO 2H",
      },
      {
        id: "deal-act-05",
        slug: "cerave-foaming-facial-cleanser",
        brand: "CERAVE",
        name: "Sữa Rửa Mặt Cho Da Dầu Mụn Foaming Cleanser 473ml",
        originalPrice: 460000,
        salePrice: 339000,
        discountPercent: 26,
        image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800",
        stockTotal: 50,
        stockSold: 44,
        badgeService: "GIAO 2H",
      },
      {
        id: "deal-act-06",
        slug: "cryo-alpine-barrier-balm",
        brand: "GLOW-UP SWISS",
        name: "Sáp Khóa Ẩm Tế Bào Tuyết Alpine Cryo Barrier Balm",
        originalPrice: 890000,
        salePrice: 590000,
        discountPercent: 34,
        image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800",
        stockTotal: 30,
        stockSold: 21,
        badgeService: "ĐỘC BẢN",
      },
      {
        id: "deal-act-07",
        slug: "laroche-posay-b5-serum",
        brand: "LA ROCHE-POSAY",
        name: "Dưỡng Chất Phục Hồi Da Hyalu B5 Serum 30ml",
        originalPrice: 1200000,
        salePrice: 849000,
        discountPercent: 29,
        image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
        stockTotal: 35,
        stockSold: 29,
        badgeService: "CHÍNH HÃNG",
      },
      {
        id: "deal-act-08",
        slug: "soleil-glow-body-shimmer",
        brand: "GLOW-UP SWISS",
        name: "Dầu Dưỡng Thể Lấp Lánh Ánh Ngọc Trai Soleil Glow 100ml",
        originalPrice: 650000,
        salePrice: 480000,
        discountPercent: 26,
        image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800",
        stockTotal: 40,
        stockSold: 25,
        badgeService: "TẶNG CỌ",
      },
    ],
  },
  {
    id: "slot-3",
    label: "18:00 - 21:00",
    subLabel: "Sắp diễn ra",
    status: "upcoming",
    items: [
      {
        id: "deal-up-01",
        slug: "rose-quartz-gua-sha-sculptor",
        brand: "GLOW-UP SWISS",
        name: "Thanh Lăn & Phiến Đá Nâng Cơ Rose Quartz Gua Sha",
        originalPrice: 450000,
        salePrice: 285000,
        discountPercent: 37,
        image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800",
        stockTotal: 50,
        stockSold: 0,
        badgeService: "GIÁ SỐC",
      },
      {
        id: "deal-up-02",
        slug: "swiss-bio-retinol-night-nectar",
        brand: "GLOW-UP SWISS",
        name: "Tinh Chất Trẻ Hóa Ban Đêm Bio-Retinol Nectar 30ml",
        originalPrice: 890000,
        salePrice: 620000,
        discountPercent: 30,
        image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800",
        stockTotal: 40,
        stockSold: 0,
        badgeService: "CHÍNH HÃNG",
      },
      {
        id: "deal-up-03",
        slug: "anessa-perfect-uv-sunscreen",
        brand: "ANESSA",
        name: "Sữa Chống Nắng Dưỡng Da Kiềm Dầu Anessa 60ml",
        originalPrice: 685000,
        salePrice: 489000,
        discountPercent: 29,
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800",
        stockTotal: 60,
        stockSold: 0,
        badgeService: "GIAO 2H",
      },
      {
        id: "deal-up-04",
        slug: "klairs-supple-preparation-facial-toner",
        brand: "KLAIRS",
        name: "Nước Hoa Hồng Không Mùi Cấp Ẩm Klairs 180ml",
        originalPrice: 390000,
        salePrice: 269000,
        discountPercent: 31,
        image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800",
        stockTotal: 45,
        stockSold: 0,
        badgeService: "GIAO 2H",
      },
    ],
  },
  {
    id: "slot-4",
    label: "21:00 - 24:00",
    subLabel: "Sắp diễn ra",
    status: "upcoming",
    items: [
      {
        id: "deal-night-01",
        slug: "miron-violet-active-mist",
        brand: "GLOW-UP SWISS",
        name: "Xịt Khoáng Quang Phổ Tế Bào Miron Violet Mist 120ml",
        originalPrice: 520000,
        salePrice: 349000,
        discountPercent: 33,
        image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800",
        stockTotal: 30,
        stockSold: 0,
        badgeService: "ĐÊM VÀNG",
      },
      {
        id: "deal-night-02",
        slug: "loreal-glycolic-bright-serum",
        brand: "L'OREAL",
        name: "Serum Sáng Da Giảm Thâm Nám Glycolic-Bright 30ml",
        originalPrice: 429000,
        salePrice: 299000,
        discountPercent: 30,
        image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800",
        stockTotal: 50,
        stockSold: 0,
        badgeService: "CHÍNH HÃNG",
      },
    ],
  },
];

export default function FlashSaleSection() {
  const tFlash = useTranslations("flashSale");
  const tProd = useTranslations("product");
  const { formatPrice } = useCurrency();
  const { addItem } = useCartStore();
  const [activeSlotId, setActiveSlotId] = useState<string>("slot-2");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());
  const carouselRef = useRef<HTMLDivElement>(null);

  // Đồng hồ đếm ngược thời gian thực chuẩn Hasaki
  const [timeLeft, setTimeLeft] = useState({
    hours: "01",
    minutes: "48",
    seconds: "32",
  });

  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const target = new Date();
      // Đếm ngược đến mốc giờ tròn tiếp theo (ví dụ 18:00:00)
      const currentHour = now.getHours();
      if (currentHour < 12) {
        target.setHours(12, 0, 0, 0);
      } else if (currentHour < 18) {
        target.setHours(18, 0, 0, 0);
      } else if (currentHour < 21) {
        target.setHours(21, 0, 0, 0);
      } else {
        target.setHours(23, 59, 59, 999);
      }

      const diff = Math.max(0, target.getTime() - now.getTime());
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      return {
        hours: String(h).padStart(2, "0"),
        minutes: String(m).padStart(2, "0"),
        seconds: String(s).padStart(2, "0"),
      };
    };

    const interval = setInterval(() => {
      setTimeLeft(calculateCountdown());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const activeSlot = FLASH_TIME_SLOTS.find((s) => s.id === activeSlotId) || FLASH_TIME_SLOTS[1];

  // Cuộn trái / phải cho danh sách sản phẩm dạng Hasaki Carousel
  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 320 * 2;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleQuickAdd = (deal: FlashDealItem) => {
    setAddingId(deal.id);
    addItem({
      id: deal.id,
      productId: deal.slug,
      name: deal.name,
      price: deal.salePrice,
      image: deal.image,
      quantity: 1,
    });

    toast.success(`Đã thêm Deal "${deal.name}" vào giỏ hàng!`, {
      style: {
        borderRadius: "14px",
        background: "#0f4a36",
        color: "#ffffff",
      },
      iconTheme: {
        primary: "#ffb703",
        secondary: "#0f4a36",
      },
    });

    setTimeout(() => {
      setAddingId(null);
    }, 700);
  };

  const handleToggleReminder = (dealId: string, dealName: string) => {
    setRemindedIds((prev) => {
      const next = new Set(prev);
      if (next.has(dealId)) {
        next.delete(dealId);
        toast("Đã hủy nhắc nhở mở bán deal này", { icon: "🔕" });
      } else {
        next.add(dealId);
        toast.success(`Đã đặt nhắc nhở cho "${dealName}". Hệ thống sẽ thông báo khi mở bán!`, {
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
      }
      return next;
    });
  };

  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 select-none">
      
      {/* KHUNG FLASH DEALS: XANH LÁ CHỦ ĐẠO - HỒNG ĐIỂM NHẤN (STITCH SWISS COSMETIC) */}
      <div className="relative overflow-hidden rounded-[32px] border border-emerald-200/80 bg-white shadow-[0_12px_36px_-6px_rgba(6,95,70,0.12),0_4px_16px_rgba(255,166,201,0.12)]">
        
        {/* =========================================================================
            1. HEADER BANNER: XANH LÁ SINH HỌC CHỦ ĐẠO & HỒNG BLUSH ĐIỂM NHẤN + HIỆU ỨNG ĐỘNG
        ========================================================================= */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#044a36] via-[#065f46] to-[#0a6c50] p-5 sm:p-7 text-white flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Hiệu ứng tia sáng quét ngang Shimmer Sweep */}
          <div className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/12 to-transparent animate-shimmer-sweep" />

          {/* Ánh sáng hồng và ngọc lục bảo mờ ảo trong nền */}
          <div className="pointer-events-none absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-[#FFA6C9]/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 -top-10 w-56 h-56 rounded-full bg-[#34d399]/20 blur-2xl" />
          
          {/* Cụm Tiêu Đề FLASH DEALS & Icon Sấm Sét */}
          <div className="relative z-10 flex items-center gap-3.5 sm:gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-[#FFA6C9]/40 shadow-glow animate-float-icon">
              <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-[#FFA6C9] fill-[#FFA6C9] drop-shadow-[0_0_10px_rgba(255,166,201,0.8)]" />
            </div>
            
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-white drop-shadow-sm">
                  {tFlash("title")}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#DE5D83] to-[#FFA6C9] text-white border border-pink-200/50 text-[10px] font-bold tracking-widest uppercase px-3.5 py-1 shadow-glow font-poppins animate-pulse">
                  <Sparkles className="h-3 w-3 text-white animate-spin [animation-duration:4s]" /> {tFlash("badge")}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-light tracking-wide mt-1 font-poppins">
                {tFlash("subtitle")}
              </p>
            </div>
          </div>

          {/* Cụm Đếm Ngược Countdown Timer (Xanh đen + Hồng đập sáng) */}
          <div className="relative z-10 flex items-center justify-between sm:justify-end gap-3 sm:gap-4 bg-black/25 backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-white/20 shadow-inner">
            <div className="text-left">
              <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#FFD9E5] flex items-center gap-1.5 font-poppins">
                <Clock className="h-3.5 w-3.5 text-[#FFA6C9] animate-pulse" />
                {activeSlot.status === "active" ? tFlash("endingIn") : activeSlot.status === "upcoming" ? tFlash("startingIn") : tFlash("ended")}
              </span>
            </div>

            {/* 3 Hộp số đếm ngược */}
            <div className="flex items-center gap-1.5 font-poppins text-base sm:text-lg font-bold text-white">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#032e23]/80 backdrop-blur-md text-white shadow-sm border border-emerald-400/30">
                {timeLeft.hours}
              </div>
              <span className="text-[#FFA6C9] font-bold">:</span>
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#032e23]/80 backdrop-blur-md text-white shadow-sm border border-emerald-400/30">
                {timeLeft.minutes}
              </div>
              <span className="text-[#FFA6C9] font-bold">:</span>
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#DE5D83] to-[#FFA6C9] text-white shadow-glow border border-pink-200 animate-pink-pulse-glow font-extrabold">
                {timeLeft.seconds}
              </div>
            </div>

            {/* Nút Xem Tất Cả Deals */}
            <Link
              href="/offers"
              className="hidden lg:inline-flex items-center justify-center rounded-full bg-white text-[#044a36] hover:bg-[#FFF0F5] hover:text-[#DE5D83] hover:shadow-[0_4px_16px_rgba(255,166,201,0.5)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 ml-2 font-poppins"
            >
              <span>{tFlash("seeAll")}</span>
            </Link>
          </div>
        </div>


        {/* =========================================================================
            2. TIME SLOTS TAB BAR (Nền Bạc Hà Nhạt & Chỉ Báo Xanh-Hồng)
        ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-[#F2FAF5] border-b border-emerald-100/80">
          {FLASH_TIME_SLOTS.map((slot) => {
            const isActive = activeSlotId === slot.id;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setActiveSlotId(slot.id)}
                className={`relative py-3.5 sm:py-4 px-3 text-center transition-all cursor-pointer border-r border-emerald-100/80 last:border-r-0 ${
                  isActive
                    ? "bg-white text-[#044a36] shadow-xs font-bold"
                    : "text-[#4B5563] hover:bg-white/70 hover:text-[#065f46]"
                }`}
              >
                {/* Active Indicator Top Bar (Gradient Xanh Lá Sang Hồng) */}
                {isActive && (
                  <span className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#059669] via-[#DE5D83] to-[#FFA6C9]" />
                )}

                <div className="flex flex-col items-center justify-center gap-0.5">
                  <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold font-poppins">
                    {slot.status === "active" && (
                      <Flame className="h-4 w-4 text-[#DE5D83] fill-[#DE5D83] animate-bounce" />
                    )}
                    <span>{slot.label}</span>
                  </div>

                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 mt-0.5 font-poppins transition-colors ${
                      isActive
                        ? "bg-[#FFE4ED] text-[#DE5D83] border border-[#FFA6C9]/60 shadow-2xs"
                        : slot.status === "ended"
                        ? "text-gray-400 bg-gray-100"
                        : "text-[#059669] bg-emerald-50 border border-emerald-200/60"
                    }`}
                  >
                    {slot.status === "ended" ? tFlash("ended") : slot.status === "active" ? tFlash("endingIn") : tFlash("startingIn")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>


        {/* =========================================================================
            3. BANNER CAM KẾT DỊCH VỤ NHỎ DƯỚI TAB
        ========================================================================= */}
        <div className="bg-[#F8FCF9] border-b border-emerald-100/60 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-[#4B5563] font-medium gap-2 font-poppins">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <span className="flex items-center gap-1.5 text-[#065F46] font-semibold">
              <ShieldCheck className="h-4 w-4 text-[#059669]" /> {tFlash("guarantee")}
            </span>
            <span className="flex items-center gap-1.5 text-[#DE5D83] font-semibold">
              <Truck className="h-4 w-4 text-[#DE5D83]" /> {tFlash("fastDelivery")}
            </span>
            <span className="flex items-center gap-1.5 text-[#047857] font-semibold">
              <RotateCcw className="h-4 w-4 text-[#047857]" /> {tFlash("easyReturn")}
            </span>
          </div>

          <Link
            href="/offers"
            className="text-[#059669] hover:text-[#DE5D83] font-bold hover:underline inline-flex items-center text-xs transition-colors"
          >
            <span>{tFlash("allSlots")}</span>
          </Link>
        </div>


        {/* =========================================================================
            4. DANH SÁCH SẢN PHẨM CAROUSEL CUỘN NGANG
        ========================================================================= */}
        <div className="relative p-4 sm:p-6 lg:p-8 bg-white">
          
          {/* Mũi tên điều hướng Carousel Trái */}
          <button
            type="button"
            onClick={() => scrollCarousel("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/95 hover:bg-white text-[#065F46] hover:text-[#DE5D83] shadow-md border border-emerald-100 hover:border-[#FFA6C9] flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            aria-label="Xem sản phẩm trước"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Mũi tên điều hướng Carousel Phải */}
          <button
            type="button"
            onClick={() => scrollCarousel("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/95 hover:bg-white text-[#065F46] hover:text-[#DE5D83] shadow-md border border-emerald-100 hover:border-[#FFA6C9] flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            aria-label="Xem sản phẩm tiếp theo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Container Cuộn Ngang */}
          <div
            ref={carouselRef}
            className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-none scroll-smooth pb-2 pt-1 px-1"
          >
            {activeSlot.items.map((deal) => {
              const soldPercent = Math.min(100, Math.round((deal.stockSold / deal.stockTotal) * 100));
              const isReminded = remindedIds.has(deal.id);
              const savings = deal.originalPrice - deal.salePrice;

              return (
                <div
                  key={deal.id}
                  className="w-[240px] sm:w-[260px] lg:w-[275px] shrink-0 rounded-2xl sm:rounded-3xl border border-emerald-100/80 hover:border-[#FFA6C9] bg-white p-3.5 sm:p-4 shadow-2xs hover:shadow-[0_14px_32px_-6px_rgba(6,95,70,0.12),0_4px_16px_rgba(255,166,201,0.15)] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between group"
                >
                  <div>
                    {/* KHUNG ẢNH VUÔNG BO GÓC MỀM MẠI */}
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#F4FAF6] border border-emerald-50 mb-3.5">
                      <Link href={`/product/${deal.slug}`}>
                        <Image
                          src={deal.image}
                          alt={deal.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </Link>

                      {/* Tag Giảm Giá % Màu Hồng Nổi Bật Trên Nền Xanh */}
                      <div className="absolute top-2 right-2 z-10">
                        <span className="flex items-center justify-center rounded-xl bg-gradient-to-r from-[#DE5D83] to-[#FF6B97] text-white px-2.5 py-1 text-xs font-bold tracking-wider shadow-[0_2px_10px_rgba(222,93,131,0.4)] border border-white/30 font-poppins animate-pulse [animation-duration:3s]">
                          -{deal.discountPercent}%
                        </span>
                      </div>

                      {/* Tag Dịch Vụ / Freeship 2H ở góc trái */}
                      {deal.badgeService && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="flex items-center gap-1 rounded-md bg-[#EAF5EF] text-[#0A5C36] border border-[#65A982]/40 px-2 py-0.5 text-[10px] font-bold shadow-2xs font-poppins">
                            <Zap className="h-2.5 w-2.5 text-[#0A5C36] fill-[#0A5C36]" />
                            {deal.badgeService}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Thương hiệu */}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/60 block mb-1 font-poppins">
                      {deal.brand}
                    </span>

                    {/* Tên sản phẩm */}
                    <Link href={`/product/${deal.slug}`} title={deal.name}>
                      <h4 className="text-xs sm:text-sm font-semibold text-[#1F2937] line-clamp-2 group-hover:text-[#065F46] transition-colors mb-2 min-h-[38px] leading-snug font-poppins">
                        {deal.name}
                      </h4>
                    </Link>

                    {/* Giá Flash Deal (Xanh lá) & Giá Gốc */}
                    <div className="mb-2.5 font-poppins">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base sm:text-lg font-bold text-[#065F46]">
                          {formatPrice(deal.salePrice)}
                        </span>
                        <span className="text-xs text-gray-400 line-through font-normal">
                          {formatPrice(deal.originalPrice)}
                        </span>
                      </div>

                      {savings > 0 && (
                        <span className="text-[10px] font-semibold text-[#DE5D83] bg-[#FFF0F5] px-2 py-0.5 rounded-md inline-block mt-0.5 border border-[#FFA6C9]/40">
                          {tProd("savings")} {formatPrice(savings)}
                        </span>
                      )}
                    </div>

                    {/* =========================================================================
                        THANH TIẾN ĐỘ SỐ LƯỢNG ĐÃ BÁN (XANH SANG HỒNG VỚI HIỆU ỨNG SỌC CHẠY)
                    ========================================================================= */}
                    <div className="mb-4">
                      <div className="relative h-4 sm:h-4.5 w-full rounded-full bg-[#E8F6EF] border border-emerald-200/60 overflow-hidden flex items-center">
                        {/* Thanh tiến độ chuyển sắc Xanh sang Hồng với sọc động */}
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#059669] via-[#10B981] to-[#DE5D83] animate-progress-stripes transition-all duration-700"
                          style={{ width: `${activeSlot.status === 'upcoming' ? 0 : soldPercent}%` }}
                        />

                        {/* Text nhãn nằm đè chính giữa thanh tiến độ */}
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-tight font-poppins">
                          {activeSlot.status === "upcoming" ? (
                            <span className="flex items-center gap-1 text-[#065F46]">
                              <Clock className="h-3 w-3 text-[#FFA6C9]" /> {tFlash("startingIn")}
                            </span>
                          ) : soldPercent >= 90 ? (
                            <span className="flex items-center gap-1 text-white font-bold drop-shadow-xs">
                              <Flame className="h-3 w-3 fill-amber-200 text-amber-200 animate-pulse" /> {tFlash("almostSoldOut")} ({tFlash("sold")} {deal.stockSold}/{deal.stockTotal})
                            </span>
                          ) : (
                            <span className={`flex items-center gap-1 ${soldPercent > 50 ? 'text-white' : 'text-[#065F46]'}`}>
                              <Flame className="h-3 w-3 fill-[#DE5D83] text-[#DE5D83]" /> {tFlash("sold")} {deal.stockSold}/{deal.stockTotal}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NÚT HÀNH ĐỘNG MUA NGAY HOẶC NHẮC TÔI */}
                  <div>
                    {activeSlot.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(deal)}
                        disabled={addingId === deal.id || deal.stockSold >= deal.stockTotal}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-sm flex items-center justify-center gap-2 active:scale-95 font-poppins ${
                          deal.stockSold >= deal.stockTotal
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                            : "bg-gradient-to-r from-[#065F46] via-[#047857] to-[#059669] hover:from-[#047857] hover:to-[#064E3B] text-white hover:shadow-[0_8px_20px_-3px_rgba(5,150,105,0.4),0_0_15px_rgba(255,166,201,0.25)]"
                        }`}
                      >
                        {addingId === deal.id ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-300 animate-bounce" />
                            <span>{tProd("added")}</span>
                          </>
                        ) : deal.stockSold >= deal.stockTotal ? (
                          <span>{tProd("outOfStock")}</span>
                        ) : (
                          <>
                            <ShoppingBag className="h-4 w-4" />
                            <span>{tProd("addToCart")}</span>
                          </>
                        )}
                      </button>
                    ) : activeSlot.status === "upcoming" ? (
                      <button
                        type="button"
                        onClick={() => handleToggleReminder(deal.id, deal.name)}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-1.5 active:scale-95 font-poppins ${
                          isReminded
                            ? "bg-[#FFE3ED] text-[#DE5D83] border-[#FFA6C9] shadow-xs"
                            : "bg-[#FFF0F5] hover:bg-[#FFE3ED] text-[#DE5D83] border-[#FFA6C9]/80 shadow-2xs"
                        }`}
                      >
                        <Bell className={`h-4 w-4 ${isReminded ? 'fill-[#DE5D83] text-[#DE5D83]' : ''}`} />
                        <span>{isReminded ? tFlash("reminded") : tFlash("remindMe")}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gray-100 text-gray-400 cursor-not-allowed text-center font-poppins"
                      >
                        {tFlash("ended")}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>

      </div>

    </section>
  );
}

