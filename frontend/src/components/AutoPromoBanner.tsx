"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, Maximize2 } from "lucide-react";
import ImageLightboxModal from "@/components/ImageLightboxModal";

export interface BannerSlide {
  id: string;
  tag: string;
  subtitle: string;
  title: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  themeColor?: string;
}

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    id: "slide-1",
    tag: "ĐỘC QUYỀN TOKYOLIFE x GLOW-UP",
    subtitle: "LỄ HỘI LÀM ĐẸP THỤY SĨ 2026",
    title: "Đại Tiệc Cấp Ẩm Đa Tầng Mua 1 Tặng 1 Toàn Bộ Serum",
    description: "Tặng ngay Rose Quartz Gua Sha cao cấp trị giá 450.000₫ và miễn phí vận chuyển toàn quốc cho đơn hàng từ 500.000₫.",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=1600",
    ctaText: "Săn Deal Mua 1 Tặng 1",
    ctaLink: "/offers",
    secondaryCtaText: "Xem BST Bán Chạy",
    secondaryCtaLink: "/shop",
  },
  {
    id: "slide-2",
    tag: "CÔNG NGHỆ ĐỘC BẢN",
    subtitle: "CHUẨN SINH HỌC TẾ BÀO GENEVA",
    title: "Bảo Tồn 100% Hoạt Tính Với Thủy Tinh Miron Violet Glass",
    description: "Tấm khiên quang học lọc bỏ ánh sáng nhìn thấy gây biến chất, duy trì trọn vẹn năng lượng tế bào thực vật trong từng giọt tinh chất.",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=1600",
    ctaText: "Khám Phá Công Nghệ",
    ctaLink: "/our-science",
    secondaryCtaText: "Làm Bài Test Da",
    secondaryCtaLink: "/shop",
  },
  {
    id: "slide-3",
    tag: "BST MỚI 2026",
    subtitle: "ĐÔI MÔI CĂNG MỌNG ÁNH PHA LÊ",
    title: "Dewy Velvet Lip Elixir - 6 Sắc Son Trong Suốt Thuần Chay",
    description: "Chiết xuất dầu mâm xôi tuyết hữu cơ kết hợp HA siêu phân tử cho độ bóng căng mọng tự nhiên, không bết dính suốt 12 giờ.",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=1600",
    ctaText: "Chọn Màu Son Ngay",
    ctaLink: "/shop",
    secondaryCtaText: "Khám Phá Ưu Đãi",
    secondaryCtaLink: "/offers",
  },
  {
    id: "slide-4",
    tag: "ĐẶC QUYỀN THÀNH VIÊN",
    subtitle: "THE RADIANCE CLUB",
    title: "Tặng Voucher 100.000₫ & Tích Điểm 5% Mọi Đơn Hàng",
    description: "Trở thành hội viên để nhận quà sinh nhật phiên bản giới hạn, mã freeship hàng tháng và cơ hội trải nghiệm sản phẩm mới trước ngày ra mắt.",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=1600",
    ctaText: "Đăng Ký Nhận 100K",
    ctaLink: "/register",
    secondaryCtaText: "Tìm Hiểu Quyền Lợi",
    secondaryCtaLink: "/account",
  },
];

export default function AutoPromoBanner({
  slides = DEFAULT_SLIDES,
  autoPlayInterval = 4500,
}: {
  slides?: BannerSlide[];
  autoPlayInterval?: number;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setProgress(0);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  }, [slides.length]);

  // Quản lý Auto-play và thanh chạy tiến trình (Progress Bar)
  useEffect(() => {
    if (isPaused || isLightboxOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const stepMs = 50;
    const progressStep = (stepMs / autoPlayInterval) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + progressStep;
      });
    }, stepMs);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPaused, autoPlayInterval, nextSlide]);

  return (
    <div 
      className="relative w-full overflow-hidden rounded-3xl bg-surface border border-outline-variant/35 shadow-lg group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Container các slide với hiệu ứng fade & scale */}
      <div className="relative aspect-[16/9] sm:aspect-[21/9] lg:aspect-[24/9] min-h-[380px] sm:min-h-[440px] w-full">
        {slides.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                isActive 
                  ? "opacity-100 scale-100 z-10 pointer-events-auto" 
                  : "opacity-0 scale-105 z-0 pointer-events-none"
              }`}
            >
              {/* Ảnh nền Banner */}
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                priority={index === 0}
                className="object-cover object-center"
              />

              {/* Lớp phủ Gradient đa tầng phong cách TokyoLife x Luxury */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent sm:from-black/75 sm:via-black/35" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden" />

              {/* Nội dung Banner bên trong */}
              <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 lg:px-16 max-w-2xl text-white">
                
                {/* Tag huy hiệu nổi bật */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 self-start border border-white/25 shadow-sm">
                  <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
                  <span>{slide.tag}</span>
                </div>

                {/* Subtitle */}
                <div className="text-[11px] sm:text-xs font-bold tracking-widest uppercase text-white/80 mb-2 font-mono">
                  {slide.subtitle}
                </div>

                {/* Tiêu đề chính */}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight mb-3 sm:mb-4 leading-tight drop-shadow-sm">
                  {slide.title}
                </h2>

                {/* Đoạn mô tả chi tiết */}
                <p className="text-xs sm:text-sm text-white/90 line-clamp-2 sm:line-clamp-3 mb-6 max-w-lg leading-relaxed font-light">
                  {slide.description}
                </p>

                {/* Các nút hành động Call-To-Action */}
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={slide.ctaLink}
                    className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-xs font-bold uppercase tracking-wider text-on-primary shadow-md hover:bg-secondary hover:scale-105 active:scale-95 transition-all"
                  >
                    <span>{slide.ctaText}</span>
                  </Link>

                  {slide.secondaryCtaText && (
                    <Link
                      href={slide.secondaryCtaLink || "/shop"}
                      className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-5 py-3 text-xs font-bold text-white border border-white/30 hover:bg-white/30 transition shadow-sm"
                    >
                      <span>{slide.secondaryCtaText}</span>
                    </Link>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Nút phóng to toàn màn hình */}
      <button
        onClick={() => setIsLightboxOpen(true)}
        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md px-3.5 py-1.5 text-xs font-bold transition border border-white/20 active:scale-95 shadow-md"
        title="Xem ảnh banner đầy đủ"
      >
        <Maximize2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Phóng to ảnh</span>
      </button>

      {/* Nút Previous & Next (Kính mờ, xuất hiện rõ hơn khi hover) */}
      <button
        onClick={prevSlide}
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/35 hover:bg-black/65 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 active:scale-95 shadow-lg"
        aria-label="Slide trước"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/35 hover:bg-black/65 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 active:scale-95 shadow-lg"
        aria-label="Slide tiếp theo"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Thanh chỉ số Slide (Dark Capsule Pill Indicator khớp chính xác ảnh người dùng gửi) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
          {slides.map((_, index) => {
            const isCurrent = index === currentSlide;
            return (
              <button
                key={index}
                onClick={() => {
                  setCurrentSlide(index);
                  setProgress(0);
                }}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  isCurrent
                    ? "w-7 h-2.5 bg-white shadow-sm"
                    : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Chuyển tới slide ${index + 1}`}
                title={`Slide ${index + 1}`}
              />
            );
          })}
        </div>
      </div>

      {/* Modal phóng to xem ảnh banner đầy đủ */}
      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={slides.map((s) => ({
          url: s.image,
          title: s.title,
          caption: s.description,
          badge: s.tag,
          location: s.subtitle,
        }))}
        currentIndex={currentSlide}
        onNavigate={(idx) => {
          setCurrentSlide(idx);
          setProgress(0);
        }}
      />
    </div>
  );
}
