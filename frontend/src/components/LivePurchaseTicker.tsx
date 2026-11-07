"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, X, ShoppingBag, Sparkles } from "lucide-react";

export interface PurchaseNotification {
  id: string;
  customerName: string;
  location: string;
  productName: string;
  slug: string;
  image: string;
  price: string;
  timeAgo: string;
}

const RECENT_PURCHASES: PurchaseNotification[] = [
  {
    id: "p-01",
    customerName: "Chị Lan Anh",
    location: "Cầu Giấy, Hà Nội",
    productName: "Peptide Glaze Elixir",
    slug: "peptide-glaze-elixir",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=300",
    price: "540.000₫",
    timeAgo: "1 phút trước",
  },
  {
    id: "p-02",
    customerName: "Ngọc Hân",
    location: "Quận 1, TP. Hồ Chí Minh",
    productName: "Dewy Velvet Lip Oil (Rose Quartz)",
    slug: "dewy-velvet-lip-oil",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=300",
    price: "320.000₫",
    timeAgo: "3 phút trước",
  },
  {
    id: "p-03",
    customerName: "Phương Thảo",
    location: "Hải Châu, Đà Nẵng",
    productName: "Cloud Ceramides Cream",
    slug: "cloud-ceramides-cream",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=300",
    price: "680.000₫",
    timeAgo: "Vừa xong",
  },
  {
    id: "p-04",
    customerName: "Minh Trang",
    location: "Lê Chân, Hải Phòng",
    productName: "Kem Dưỡng Ẩm CeraVe Moisturizing",
    slug: "kem-duong-am-cerave-moisturizing-cream",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300",
    price: "380.000₫",
    timeAgo: "2 phút trước",
  },
  {
    id: "p-05",
    customerName: "Khánh Linh",
    location: "Ninh Kiều, Cần Thơ",
    productName: "Serum Dưỡng Ẩm Trà Xanh Innisfree",
    slug: "serum-duong-am-tra-xanh-innisfree-green-tea-seed",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300",
    price: "585.000₫",
    timeAgo: "4 phút trước",
  },
  {
    id: "p-06",
    customerName: "Bảo Ngọc",
    location: "Biên Hòa, Đồng Nai",
    productName: "Soleil Glow Body Shimmer",
    slug: "soleil-glow-body-shimmer",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=300",
    price: "640.000₫",
    timeAgo: "Vừa xong",
  },
];

export default function LivePurchaseTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isDismissed) return;

    // Đợt popup đầu tiên xuất hiện sau 3.5 giây khi vào trang
    const initialDelay = setTimeout(() => {
      setIsVisible(true);
    }, 3500);

    return () => clearTimeout(initialDelay);
  }, [isDismissed]);

  // Điều khiển chu kỳ hiển thị & ẩn luân phiên
  useEffect(() => {
    if (isDismissed) return;

    if (isVisible && !isHovered) {
      // Hiển thị trong 5.5 giây rồi ẩn
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);

        // Sau khi ẩn, chờ 8 - 14 giây rồi hiện đơn hàng tiếp theo
        const randomWait = Math.floor(Math.random() * 6000) + 8000;
        timerRef.current = setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % RECENT_PURCHASES.length);
          setIsVisible(true);
        }, randomWait);

      }, 5500);
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isVisible, isHovered, isDismissed]);

  if (isDismissed) return null;

  const currentItem = RECENT_PURCHASES[currentIndex];

  return (
    <div
      className={`fixed bottom-5 left-5 z-40 max-w-[340px] sm:max-w-[380px] transition-all duration-500 ease-out transform pointer-events-auto ${
        isVisible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-8 opacity-0 scale-95 pointer-events-none"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-2xl border border-pink-200/90 bg-white/95 backdrop-blur-md p-3.5 shadow-xl hover:shadow-2xl hover:border-primary/50 transition-all group">
        
        {/* Nút đóng thông báo */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setIsDismissed(true);
          }}
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/5 hover:bg-black/10 text-secondary-text hover:text-primary-text flex items-center justify-center transition"
          aria-label="Đóng thông báo"
          title="Tạm ẩn thông báo"
        >
          <X className="h-3 w-3" />
        </button>

        <Link
          href={`/product/${currentItem.slug}`}
          className="flex items-center gap-3 text-left"
        >
          {/* Ảnh sản phẩm vừa chốt đơn */}
          <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-surface-container-low border border-pink-100 flex-shrink-0 shadow-xs">
            <Image
              src={currentItem.image}
              alt={currentItem.productName}
              fill
              className="object-cover group-hover:scale-105 transition duration-300"
            />
            {/* Chấm tròn biểu thị Live giao dịch */}
            <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
          </div>

          {/* Chi tiết người mua & sản phẩm */}
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-bold text-primary-text truncate">
                {currentItem.customerName}
              </span>
              <span className="text-[10px] text-secondary-text truncate">
                ({currentItem.location})
              </span>
            </div>

            <p className="text-[11px] font-semibold text-primary truncate group-hover:text-secondary transition-colors">
              Đã mua {currentItem.productName}
            </p>

            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200/60">
                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Đã xác thực
              </span>
              <span className="text-[10px] text-secondary-text">
                {currentItem.timeAgo}
              </span>
            </div>
          </div>
        </Link>

        {/* Thanh đếm ngược hiển thị thời gian popup biến mất (khi không hover) */}
        {!isHovered && isVisible && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-secondary animate-[shrink_5.5s_linear_forwards]" />
          </div>
        )}
      </div>
    </div>
  );
}
