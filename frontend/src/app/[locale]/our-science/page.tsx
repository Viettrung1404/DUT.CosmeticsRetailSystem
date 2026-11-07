"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  FlaskConical, 
  Microscope, 
  Activity, 
  Droplet, 
  Sun, 
  Check, 
  Award,
  Leaf,
  Mail,
  ArrowDown,
  Quote,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ZoomIn
} from "lucide-react";
import toast from "react-hot-toast";

// Dữ liệu các slide ảnh cơ sở nghiên cứu và phòng thí nghiệm y sinh Geneva
const LAB_SLIDES = [
  {
    id: 1,
    title: "Cleanroom Facility A-9",
    location: "Geneva Cantonal Bio-Park, Switzerland",
    badge: "100% Sterile",
    isoBadge: "ISO-22716 Clean Standard",
    isoSub: "Swiss Medic Audited Batch 2024",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1600",
    caption: "Phòng thí nghiệm vô trùng cấp độ y sinh A-9 chuẩn ISO-22716 tại Geneva, nơi tinh chế các chuỗi peptide và chiết xuất nấm tuyết ở điều kiện kiểm soát vi sinh tuyệt đối.",
  },
  {
    id: 2,
    title: "Cryogenic Bio-Fermentation Lab",
    location: "Alpine Cellular Cryo-Chamber, Valais",
    badge: "-40°C Cryo Purity",
    isoBadge: "Bio-Ferment Precision",
    isoSub: "Preserving +68% Native Enzymes",
    image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=1600",
    caption: "Quy trình lên men lạnh y sinh ở -40°C bảo tồn nguyên vẹn cấu trúc chuỗi liên kết peptide và hoạt tính chống oxy hóa của tế bào hoa nhung tuyết Edelweiss.",
  },
  {
    id: 3,
    title: "Biophotonic Miron Violet Testing",
    location: "Optical Spectrometry Division, Zurich",
    badge: "Zero Photo-Decay",
    isoBadge: "Full Spectrum Block",
    isoSub: "Blocks 400–700nm Degrading Light",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1600",
    caption: "Thử nghiệm quang phổ ánh sáng sinh học trên chai thủy tinh Miron Violet, đảm bảo hoạt chất dưỡng da không bị oxy hóa dưới ánh sáng mặt trời suốt 36 tháng.",
  },
  {
    id: 4,
    title: "Micro-Emulsion Droplet Formulation",
    location: "Molecular Rheology Atelier, Geneva",
    badge: "0.02μm Sub-Micron",
    isoBadge: "Transdermal Matrix",
    isoSub: "Clinical Absorption Calibration",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1600",
    caption: "Hệ nhũ tương siêu vi kích thước 0.02 micron giúp tinh chất thẩm thấu sâu qua các lớp biểu bì da mà không để lại bất kỳ cảm giác bết dính hay bí tắc lỗ chân lông.",
  },
];

export default function OurSciencePage() {
  const [emailInput, setEmailInput] = useState("");

  // Trạng thái Banner trượt tự động & Lightbox xem ảnh toàn màn hình
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Cơ chế tự động trượt ảnh sau mỗi 4.5 giây (tự tạm dừng khi rê chuột hoặc mở modal)
  useEffect(() => {
    if (isPaused || lightboxIndex !== null) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % LAB_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, lightboxIndex]);

  // Phím tắt điều khiển bàn phím (Esc để đóng, Mũi tên trái/phải để chuyển ảnh)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev !== null ? (prev - 1 + LAB_SLIDES.length) % LAB_SLIDES.length : null));
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev !== null ? (prev + 1) % LAB_SLIDES.length : null));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex]);

  const handleBookConsultation = () => {
    toast.success("Đã ghi nhận yêu cầu tư vấn! Chuyên viên Atelier Geneva sẽ liên hệ bạn trong 24h.", {
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

  const handleSubscribeJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    toast.success("Đã đăng ký nhận bản tin Clinical Journal từ phòng nghiên cứu Geneva!", {
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
    setEmailInput("");
  };

  return (
    <div className="min-h-screen bg-transparent text-on-surface font-sans pb-24">
      
      {/* 1. TOP ANNOUNCEMENT TICKER */}
      <div className="bg-primary text-on-primary text-xs py-2.5 px-4 text-center tracking-wider flex items-center justify-center gap-2 font-medium">
        <Sparkles className="h-3.5 w-3.5 text-primary-container animate-pulse" />
        <span>Complimentary Swiss Clean Formula Discovery Set on orders over $75 · Complimentary Worldwide Concierge Shipping</span>
        <span className="hidden md:inline-block opacity-75">| Geneva Atelier Formulation Guarantee</span>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">

        {/* 2. HERO STORYTELLING SECTION */}
        <section className="relative overflow-hidden pt-4 pb-16 lg:py-16 border-b border-surface-container">
          {/* Breadcrumb & Lab Tag */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="px-3.5 py-1 bg-surface-container-high text-primary rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              Geneva Central Laboratory · Est. 2018
            </span>
            <span className="text-outline text-xs">/</span>
            <span className="text-secondary-text text-xs font-medium">Swiss Cellular Biotechnology</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Narrative Column */}
            <div className="lg:col-span-6 space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-primary-text font-serif leading-[1.1] font-normal tracking-tight">
                Biotechnology Reimagined. <br />
                <span className="italic text-primary font-serif font-light">Radiance Perfected</span> in Geneva.
              </h1>

              <p className="text-sm sm:text-base text-secondary-text max-w-xl leading-relaxed">
                Where pristine alpine bio-botanicals converge with cellular peptide science to redefine glass skin vitality. Formulated under cleanroom surgical standard ISO-22716 on Lake Geneva’s alpine corridor.
              </p>

              {/* Quote Callout Card */}
              <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/40 relative shadow-2xs">
                <Quote className="text-primary/20 absolute top-4 right-5 h-8 w-8" />
                <p className="font-serif italic text-sm sm:text-base text-primary-text leading-relaxed">
                  &quot;We refused the industry compromise between clinical potency and clean biological purity. Every drop is cellular nourishment preserved in biophotonic frequency.&quot;
                </p>
                <p className="text-xs text-primary mt-3 font-semibold tracking-wide">
                  — Dr. Beatrix Keller, Head of Bio-Molecular Extraction, Geneva
                </p>
              </div>

              {/* Key Metrics Bento Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-4 bg-surface rounded-2xl border border-outline-variant/30 text-center shadow-xs">
                  <span className="block text-2xl sm:text-3xl font-serif font-semibold text-primary">99.4%</span>
                  <span className="text-[11px] font-medium text-secondary-text">Bio-Identical Potency</span>
                </div>
                <div className="p-4 bg-surface rounded-2xl border border-outline-variant/30 text-center shadow-xs">
                  <span className="block text-2xl sm:text-3xl font-serif font-semibold text-primary">0%</span>
                  <span className="text-[11px] font-medium text-secondary-text">Silicones & Fillers</span>
                </div>
                <div className="p-4 bg-surface rounded-2xl border border-outline-variant/30 text-center shadow-xs">
                  <span className="block text-2xl sm:text-3xl font-serif font-semibold text-primary">100%</span>
                  <span className="text-[11px] font-medium text-secondary-text">Miron Biophotonic</span>
                </div>
                <div className="p-4 bg-surface rounded-2xl border border-outline-variant/30 text-center shadow-xs">
                  <span className="block text-2xl sm:text-3xl font-serif font-semibold text-primary">14</span>
                  <span className="text-[11px] font-medium text-secondary-text">Clinical Bio-Patents</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a 
                  href="#pillars"
                  className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3.5 rounded-full text-xs font-semibold hover:bg-secondary transition-all shadow-sm active:scale-95"
                >
                  <span>Explore The 4 Formulation Pillars</span>
                  <ArrowDown className="h-4 w-4" />
                </a>
                <a 
                  href="#comparison"
                  className="inline-flex items-center gap-2 text-primary text-xs font-semibold px-4 py-3 hover:underline underline-offset-4"
                >
                  <span>Compare Glass Spectrum Stability</span>
                  <FlaskConical className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Right Image Showcase Column - Interactive Auto-Sliding Banner & Lightbox Modal */}
            <div className="lg:col-span-6 relative">
              <div 
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                className="relative rounded-3xl overflow-hidden shadow-2xl border border-pink-100 bg-black min-h-[440px] sm:min-h-[480px] lg:h-[500px] w-full flex flex-col justify-between group"
              >
                {/* Images Layer with Crossfade */}
                {LAB_SLIDES.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-zoom-in ${
                      currentSlide === idx ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
                    }`}
                    onClick={() => setLightboxIndex(idx)}
                  >
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      priority={idx === 0}
                      className="object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35" />
                  </div>
                ))}

                {/* Top Control Bar with ISO Standard & Zoom Hint */}
                <div className="relative z-20 p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 rounded-2xl bg-white/95 backdrop-blur-md px-3.5 py-2 shadow-md border border-white/80">
                    <ShieldCheck className="h-4 w-4 text-[#732845]" />
                    <div className="leading-tight">
                      <p className="text-[11px] font-bold text-[#211a1c]">{LAB_SLIDES[currentSlide].isoBadge}</p>
                      <p className="text-[10px] text-secondary-text">{LAB_SLIDES[currentSlide].isoSub}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setLightboxIndex(currentSlide)}
                    className="flex items-center gap-1.5 rounded-full bg-black/60 hover:bg-[#732845] text-white backdrop-blur-md px-3.5 py-2 text-xs font-bold transition shadow-md active:scale-95"
                    title="Phóng to xem ảnh đầy đủ"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Phóng to ảnh</span>
                  </button>
                </div>

                {/* Center Previous / Next Arrow Buttons */}
                <div className="relative z-20 px-3 flex items-center justify-between pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide((prev) => (prev - 1 + LAB_SLIDES.length) % LAB_SLIDES.length);
                    }}
                    className="h-10 w-10 rounded-full bg-white/90 hover:bg-white text-[#211a1c] hover:text-[#732845] flex items-center justify-center shadow-lg transition active:scale-95 pointer-events-auto"
                    title="Ảnh trước"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide((prev) => (prev + 1) % LAB_SLIDES.length);
                    }}
                    className="h-10 w-10 rounded-full bg-white/90 hover:bg-white text-[#211a1c] hover:text-[#732845] flex items-center justify-center shadow-lg transition active:scale-95 pointer-events-auto"
                    title="Ảnh tiếp theo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Bottom Floating Info Card & Progress Dots */}
                <div className="relative z-20 p-4 sm:p-5 space-y-3">
                  <div 
                    onClick={() => setLightboxIndex(currentSlide)}
                    className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/90 shadow-xl flex items-center justify-between gap-3 cursor-zoom-in hover:bg-white transition"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-[#FFE8F0] text-[#732845] flex items-center justify-center shrink-0 shadow-xs">
                        <Microscope className="h-5 w-5" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-[#211a1c] truncate">
                            {LAB_SLIDES[currentSlide].title}
                          </p>
                        </div>
                        <p className="text-[11px] text-secondary-text truncate">
                          {LAB_SLIDES[currentSlide].location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{LAB_SLIDES[currentSlide].badge}</span>
                      </span>
                    </div>
                  </div>

                  {/* Slide Indicators / Navigation Dots */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {LAB_SLIDES.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentSlide(dotIdx);
                        }}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          currentSlide === dotIdx 
                            ? "w-8 bg-[#FFA6C9] shadow-xs" 
                            : "w-2 bg-white/60 hover:bg-white"
                        }`}
                        title={`Chuyển đến ảnh ${dotIdx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Sub-hint under carousel */}
              <p className="mt-3 text-[11px] text-center text-secondary-text flex items-center justify-center gap-1.5 font-medium">
                <ZoomIn className="h-3.5 w-3.5 text-primary" />
                <span>Banner tự động trượt • Nhấp vào ảnh để phóng to xem chi tiết đầy đủ</span>
              </p>
            </div>

          </div>
        </section>


        {/* 3. FOUR PILLARS OF FORMULATION EXCELLENCE */}
        <section className="py-20 scroll-mt-20" id="pillars">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-primary text-xs uppercase tracking-widest font-bold">Scientific Rigor</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-primary-text">
              The Four Pillars of Clinical Formulation
            </h2>
            <p className="text-xs sm:text-sm text-secondary-text">
              Every formulation starts from high-altitude cellular survival botanicals, extracted at cryogenic equilibrium and housed in energetic light filtration.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Pillar 01: Alpine Bio-Ferments */}
            <div className="md:col-span-6 lg:col-span-7 bg-surface rounded-3xl p-8 border border-outline-variant/40 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="px-3 py-1 rounded-full bg-surface-container-high text-primary text-xs font-bold uppercase tracking-wider">
                    Pillar 01
                  </span>
                  <Leaf className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-primary-text mb-3">
                  High-Altitude Alpine Bio-Ferments
                </h3>
                <p className="text-xs sm:text-sm text-secondary-text mb-6 leading-relaxed">
                  Harvested ethically above 2,400 meters in the Valais Alps. Wild <em>Leontopodium Alpinum</em> (Edelweiss) and Swiss Alpine Rose stem cells develop immense antioxidant resistance against extreme solar UV radiation and freezing thermal swings.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-container-high">
                <div>
                  <p className="text-[10px] text-secondary-text uppercase font-semibold">Cellular Longevity</p>
                  <p className="text-xl font-serif text-primary font-bold">+68% Collagen I Yield</p>
                </div>
                <div>
                  <p className="text-[10px] text-secondary-text uppercase font-semibold">Enzyme Survival</p>
                  <p className="text-xl font-serif text-primary font-bold">Cryo-Extracted at -40°C</p>
                </div>
              </div>
            </div>

            {/* Pillar 02: Hexapeptide-8 & Tremella */}
            <div className="md:col-span-6 lg:col-span-5 bg-surface rounded-3xl p-8 border border-outline-variant/40 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="px-3 py-1 rounded-full bg-surface-container-high text-primary text-xs font-bold uppercase tracking-wider">
                    Pillar 02
                  </span>
                  <FlaskConical className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-serif font-bold text-primary-text mb-2">
                  Hexapeptide-8 & Tremella Matrix
                </h3>
                <p className="text-xs sm:text-sm text-secondary-text mb-4">
                  Micro-molecular peptide delivery mimicking the dermal matrix, binding 500x more moisture via tremella glucan polymer.
                </p>
              </div>
              <div className="relative rounded-2xl overflow-hidden h-40 border border-outline-variant/30 mt-2">
                <Image
                  src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=800"
                  alt="Micro droplet peptide texture on skin"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                  <span className="text-white text-xs font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Micro-Emulsion Droplet Fusion (0.02μm)
                  </span>
                </div>
              </div>
            </div>

            {/* Pillar 03: Biophotonic Miron Violet Glass Shielding */}
            <div className="md:col-span-12 lg:col-span-8 bg-surface rounded-3xl p-8 border border-primary/20 shadow-md grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-semibold">
                    Pillar 03 · Proprietary Packaging
                  </span>
                  <span className="text-secondary text-xs font-bold">Patent Shield</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-primary-text">
                  Biophotonic Miron Violet Glass Shielding
                </h3>
                <p className="text-xs sm:text-sm text-secondary-text leading-relaxed">
                  Standard glass allows visible light to decay delicate peptides in weeks. Glow-Up utilizes genuine Miron Violet Glass: an absolute optical filter that permanently blocks degrading visible light (400–700 nm) while selectively permitting rejuvenating UV-A (380–420 nm) and Infrared wavelengths.
                </p>
                <ul className="space-y-2 pt-2 text-xs text-on-surface">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Zero chemical preservatives or synthetic parabens needed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Bioactive molecule resonance preserved up to 36 months</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>100% infinitely recyclable biophotonic silica crystal</span>
                  </li>
                </ul>
              </div>
              <div className="md:col-span-6">
                <div className="relative rounded-2xl overflow-hidden border border-outline-variant/40 shadow-inner h-64 sm:h-72 group">
                  <Image
                    src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800"
                    alt="Miron Violet Glass bottles"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-inverse-surface/80 text-surface text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-xs">
                    Violet Glass Protection Suite
                  </div>
                </div>
              </div>
            </div>

            {/* Pillar 04: Biome-Friendly pH 5.2 Equilibrium */}
            <div className="md:col-span-12 lg:col-span-4 bg-surface rounded-3xl p-8 border border-outline-variant/40 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="px-3 py-1 rounded-full bg-surface-container-high text-primary text-xs font-bold uppercase tracking-wider">
                    Pillar 04
                  </span>
                  <Droplet className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-serif font-bold text-primary-text mb-3">
                  Biome-Friendly pH 5.2 Equilibrium
                </h3>
                <p className="text-xs sm:text-sm text-secondary-text mb-4 leading-relaxed">
                  Formulated precisely to maintain your skin’s acid mantle. We omit ethanol, essential oil allergens, and synthetic sulfates that destabilize the microflora.
                </p>
              </div>
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-secondary-text uppercase font-semibold">Optimal Acid Mantle</p>
                  <p className="text-2xl font-serif text-primary font-bold">pH 5.2 ± 0.1</p>
                </div>
                <Activity className="h-8 w-8 text-primary/70" />
              </div>
            </div>

          </div>
        </section>


        {/* 4. INTERACTIVE CLINICAL COMPARATIVE LEDGER */}
        <section className="py-20 scroll-mt-20" id="comparison">
          <div className="max-w-3xl mx-auto text-center mb-14 space-y-3">
            <span className="text-primary text-xs uppercase tracking-widest font-bold">Laboratory Photometric Test</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-primary-text">
              Why We Encase Every Elixir in Violet Crystal
            </h2>
            <p className="text-xs sm:text-sm text-secondary-text">
              Independent spectrophotometer analysis testing degradation of pure organic extracts over a 90-day solar exposure cycle in Geneva.
            </p>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-3xl border border-outline-variant/40 shadow-lg bg-surface">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant/40">
                  <th className="p-5 font-bold text-primary-text uppercase tracking-wider">Packaging Matrix</th>
                  <th className="p-5 font-bold text-primary-text uppercase tracking-wider text-center">Visible Light Block (400-700nm)</th>
                  <th className="p-5 font-bold text-primary-text uppercase tracking-wider text-center">UV-A & Violet Permeation</th>
                  <th className="p-5 font-bold text-primary-text uppercase tracking-wider text-center">Bioactive Potency (6 Mo.)</th>
                  <th className="p-5 font-bold text-primary-text uppercase tracking-wider text-center">Preservative Need</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-medium">
                {/* Miron Violet Glass (Highlighted row) */}
                <tr className="bg-primary-fixed/20 hover:bg-primary-fixed/30 transition-colors">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full bg-secondary" />
                      <div>
                        <span className="font-bold text-primary-text text-sm">Miron Biophotonic Violet Glass</span>
                        <span className="block text-primary text-[10px] font-bold uppercase">Glow-Up Standard Exclusive</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-center font-bold text-emerald-700">
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-4 w-4" /> 99.8% Blocked
                    </span>
                  </td>
                  <td className="p-5 text-center font-semibold text-primary">
                    <span className="inline-flex items-center gap-1">
                      <Sun className="h-4 w-4" /> 25-45% Rejuvenating Light
                    </span>
                  </td>
                  <td className="p-5 text-center font-bold text-emerald-700 text-sm">
                    98.2% Retained
                  </td>
                  <td className="p-5 text-center">
                    <span className="px-3 py-1 bg-surface rounded-full text-primary text-[10px] font-bold border border-primary/20">
                      0% Preservatives
                    </span>
                  </td>
                </tr>

                {/* Amber Glass */}
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-5 font-medium text-primary-text">Pharmaceutical Amber Glass</td>
                  <td className="p-5 text-center text-secondary-text">85.0% Blocked</td>
                  <td className="p-5 text-center text-secondary-text">Blocks All Rays (&lt; 450nm)</td>
                  <td className="p-5 text-center text-secondary-text">72.4% Retained</td>
                  <td className="p-5 text-center text-secondary-text">Standard Chemical Stabilizers</td>
                </tr>

                {/* Clear Flint Glass */}
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-5 font-medium text-primary-text">Clear Flint Glass (Standard Luxury)</td>
                  <td className="p-5 text-center text-status-danger font-semibold">0% Blocked (Full Exposure)</td>
                  <td className="p-5 text-center text-secondary-text">Unfiltered Transmittance</td>
                  <td className="p-5 text-center text-status-danger font-semibold">31.6% Retained (High Oxidation)</td>
                  <td className="p-5 text-center text-secondary-text">Heavy Synthetic Preservatives</td>
                </tr>

                {/* Recycled PET Plastic */}
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-5 font-medium text-primary-text">Commercial PET / PCR Plastic</td>
                  <td className="p-5 text-center text-status-danger font-semibold">10-20% Incomplete</td>
                  <td className="p-5 text-center text-secondary-text">Porous Gas Permeation</td>
                  <td className="p-5 text-center text-status-danger font-semibold">18.5% Retained (Microplastics)</td>
                  <td className="p-5 text-center text-secondary-text">Endocrine Disruptor Risk</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Feature Clinical Highlight Card */}
          <div className="mt-12 p-8 rounded-3xl bg-surface-container-low border border-outline-variant/30 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 flex justify-center">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-lg group">
                <Image
                  src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800"
                  alt="Peptide Glaze Elixir bottle"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute bottom-3 right-3 px-2.5 py-1 bg-surface/90 text-primary text-[10px] font-bold rounded-lg shadow-sm">
                  Batch #GL-902
                </span>
              </div>
            </div>
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" />
                Clinical Lab Results: Peptide Glaze Elixir
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-primary-text">
                98.4% Clinically Proven Skin Barrier Elasticity in 14 Days
              </h3>
              <p className="text-xs sm:text-sm text-secondary-text leading-relaxed">
                In an independent 28-day double-blind clinical trial under Swiss dermatological supervision (n=64 female participants, aged 26–58):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-surface p-4 rounded-2xl border border-outline-variant/30 text-center">
                  <span className="block text-2xl font-serif font-bold text-primary">+82%</span>
                  <span className="text-xs text-secondary-text">Immediate Micro-Hydration</span>
                </div>
                <div className="bg-surface p-4 rounded-2xl border border-outline-variant/30 text-center">
                  <span className="block text-2xl font-serif font-bold text-primary">-44%</span>
                  <span className="text-xs text-secondary-text">Transepidermal Water Loss</span>
                </div>
                <div className="bg-surface p-4 rounded-2xl border border-outline-variant/30 text-center">
                  <span className="block text-2xl font-serif font-bold text-primary">96%</span>
                  <span className="text-xs text-secondary-text">Reported Glass Skin Glow</span>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* 5. GLOBAL CERTIFICATIONS & ETHICAL COMMITMENTS */}
        <section className="py-16 my-8 rounded-3xl bg-surface-container-low border border-surface-container px-6 sm:px-12">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl font-serif font-bold text-primary-text">
              Uncompromising Ethical & Formulation Certifications
            </h2>
            <p className="text-xs text-secondary-text mt-1">
              Verified by European Union and Swiss Bio-Regulatory Commissions
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-surface border border-outline-variant/30 text-center flex flex-col items-center justify-center space-y-2 hover:-translate-y-1 transition-transform">
              <ShieldCheck className="h-7 w-7 text-primary" />
              <p className="text-xs font-bold text-primary-text">Swiss Bio-Certified</p>
              <p className="text-[10px] text-secondary-text">EC No 1223/2009 Standards</p>
            </div>
            <div className="p-5 rounded-2xl bg-surface border border-outline-variant/30 text-center flex flex-col items-center justify-center space-y-2 hover:-translate-y-1 transition-transform">
              <Award className="h-7 w-7 text-secondary" />
              <p className="text-xs font-bold text-primary-text">Leaping Bunny</p>
              <p className="text-[10px] text-secondary-text">100% Cruelty-Free & Vegan</p>
            </div>
            <div className="p-5 rounded-2xl bg-surface border border-outline-variant/30 text-center flex flex-col items-center justify-center space-y-2 hover:-translate-y-1 transition-transform">
              <Leaf className="h-7 w-7 text-tertiary" />
              <p className="text-xs font-bold text-primary-text">B-Corp Certified</p>
              <p className="text-[10px] text-secondary-text">Carbon Neutral Ateliers</p>
            </div>
            <div className="p-5 rounded-2xl bg-surface border border-outline-variant/30 text-center flex flex-col items-center justify-center space-y-2 hover:-translate-y-1 transition-transform">
              <CheckCircle2 className="h-7 w-7 text-primary" />
              <p className="text-xs font-bold text-primary-text">ISO-22716 Clean</p>
              <p className="text-[10px] text-secondary-text">Medical Grade Standards</p>
            </div>
            <div className="col-span-2 sm:col-span-1 p-5 rounded-2xl bg-surface border border-outline-variant/30 text-center flex flex-col items-center justify-center space-y-2 hover:-translate-y-1 transition-transform">
              <Droplet className="h-7 w-7 text-emerald-600" />
              <p className="text-xs font-bold text-primary-text">Ocean Reef-Safe</p>
              <p className="text-[10px] text-secondary-text">Microplastic & Oxybenzone Free</p>
            </div>
          </div>
        </section>


        {/* 6. THE RESEARCH TEAM & ATELIERS */}
        <section className="py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
            <div>
              <span className="text-primary text-xs uppercase tracking-widest font-bold">The Minds in Geneva</span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-primary-text mt-1">
                Our Master Formulation Scientists
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-secondary-text max-w-md">
              Bridging alpine herbal botany with peptide biochemical synthesis to create next-generation clean dermatological solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Scientist 1 */}
            <div className="p-8 rounded-3xl bg-surface border border-outline-variant/40 flex flex-col sm:flex-row gap-6 items-center sm:items-start shadow-xs">
              <div className="w-24 h-24 rounded-2xl bg-surface-container-high overflow-hidden shrink-0 border-2 border-primary/20 flex items-center justify-center text-primary font-serif font-bold text-2xl">
                BK
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-primary text-[10px] uppercase font-bold tracking-wider">Geneva Central Laboratory</span>
                  <h3 className="text-lg font-serif font-bold text-primary-text">Dr. Beatrix Keller, Ph.D.</h3>
                  <p className="text-xs text-secondary-text">Lead Formulation Biochemist & Cryo-Extraction Pioneer</p>
                </div>
                <p className="text-xs sm:text-sm text-secondary-text leading-relaxed">
                  Former Swiss Federal Institute of Technology (ETH Zürich) researcher specializing in alpine extremophile enzyme stabilization without chemical preservatives.
                </p>
                <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-secondary-text">
                  <span className="text-primary flex items-center gap-1">
                    <FlaskConical className="h-3.5 w-3.5" /> 38 Studies
                  </span>
                  <span>•</span>
                  <span>9 Bio-Patents</span>
                </div>
              </div>
            </div>

            {/* Scientist 2 */}
            <div className="p-8 rounded-3xl bg-surface border border-outline-variant/40 flex flex-col sm:flex-row gap-6 items-center sm:items-start shadow-xs">
              <div className="w-24 h-24 rounded-2xl bg-surface-container-high overflow-hidden shrink-0 border-2 border-primary/20 flex items-center justify-center text-primary font-serif font-bold text-2xl">
                MW
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-primary text-[10px] uppercase font-bold tracking-wider">Cellular Biology Department</span>
                  <h3 className="text-lg font-serif font-bold text-primary-text">Dr. Marc Weber, M.D.</h3>
                  <p className="text-xs text-secondary-text">Cellular Barrier & Peptide Synthesis Director</p>
                </div>
                <p className="text-xs sm:text-sm text-secondary-text leading-relaxed">
                  Board-certified dermatologist with 15 years advising European aesthetic clinics, spearheading our Hexapeptide matrix integration with natural tremella fungi.
                </p>
                <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-secondary-text">
                  <span className="text-primary flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5" /> 12 Trials
                  </span>
                  <span>•</span>
                  <span>Geneva Atelier</span>
                </div>
              </div>
            </div>
          </div>

          {/* Atelier Concierge Banner */}
          <div className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-surface-container-high to-nude/40 border border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="space-y-1">
              <h4 className="text-xl font-serif font-bold text-primary-text">Visit Our Flagship Diagnostic Ateliers</h4>
              <p className="text-xs sm:text-sm text-secondary-text max-w-xl">
                Complimentary 3D dermal scan and bespoke bio-ferment blending in Geneva, SoHo New York, and Paris 1er.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link 
                href="/stores" 
                className="px-6 py-2.5 rounded-full bg-surface text-primary border border-primary/20 text-xs font-bold hover:bg-surface-container transition-colors shadow-2xs"
              >
                Find An Atelier
              </Link>
              <button 
                onClick={handleBookConsultation}
                className="px-6 py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold hover:bg-secondary transition-colors shadow-sm active:scale-95"
              >
                Book Consultation
              </button>
            </div>
          </div>
        </section>


        {/* 7. INTERACTIVE CTA & JOURNAL SUBSCRIPTION */}
        <section className="py-20 text-center space-y-8 max-w-4xl mx-auto">
          <div className="space-y-3">
            <span className="text-primary text-xs uppercase tracking-widest font-bold">Your Personal Regimen</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-primary-text">
              Experience Swiss Cellular Precision on Your Skin
            </h2>
            <p className="text-xs sm:text-sm text-secondary-text max-w-xl mx-auto">
              Take our algorithmic 60-second skin diagnostic developed by our Geneva biochemists to identify your exact cellular hydration profile.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/account"
              className="px-8 py-3.5 bg-primary text-on-primary rounded-full text-xs font-bold uppercase tracking-wider hover:bg-secondary transition-all shadow-sm active:scale-95 flex items-center justify-center"
            >
              <span>Take the 60-Sec Skin Diagnostic</span>
            </Link>
            <Link
              href="/shop"
              className="px-8 py-3.5 bg-surface text-primary border border-outline-variant/60 rounded-full text-xs font-bold hover:bg-surface-container transition-all shadow-2xs"
            >
              Explore Active Formulations
            </Link>
          </div>

          {/* Radiance Journal Email Capture */}
          <div className="pt-8 max-w-md mx-auto">
            <form onSubmit={handleSubscribeJournal} className="bg-surface p-1.5 rounded-full border border-outline-variant/50 shadow-sm flex items-center">
              <Mail className="text-secondary-text ml-3 h-4 w-4 shrink-0" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter email for Clinical Journal insights..."
                className="w-full bg-transparent border-none text-xs px-3 focus:outline-none focus:ring-0 text-primary-text placeholder:text-secondary-text"
              />
              <button 
                type="submit"
                className="bg-primary hover:bg-secondary text-on-primary text-[11px] font-bold uppercase px-5 py-2.5 rounded-full transition-colors shrink-0 shadow-xs"
              >
                Subscribe
              </button>
            </form>
            <p className="text-[11px] text-secondary-text mt-2">
              Weekly formulation breakthroughs from Geneva, zero promotional noise.
            </p>
          </div>
        </section>

      </div>

      {/* =========================================================================
          FULLSCREEN LIGHTBOX MODAL (XEM DẠNG ẢNH ĐẦY ĐỦ KHÔNG BỊ CẮT)
      ========================================================================= */}
      {lightboxIndex !== null && (
        <div 
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Modal Top Bar */}
          <div className="flex items-center justify-between z-10 w-full max-w-6xl mx-auto text-white">
            <div className="flex items-center gap-3">
              <span className="h-8 px-3 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-xs font-mono font-bold text-pink-200 border border-white/20">
                {lightboxIndex + 1} / {LAB_SLIDES.length}
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold font-serif">{LAB_SLIDES[lightboxIndex].title}</h3>
                <p className="text-xs text-white/70">{LAB_SLIDES[lightboxIndex].location}</p>
              </div>
            </div>

            <button
              onClick={() => setLightboxIndex(null)}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 border border-white/20"
              title="Đóng (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Central Image View with Navigation */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative flex-1 flex items-center justify-center my-4 max-w-6xl mx-auto w-full"
          >
            {/* Previous Button */}
            <button
              onClick={() => setLightboxIndex((prev) => (prev !== null ? (prev - 1 + LAB_SLIDES.length) % LAB_SLIDES.length : 0))}
              className="absolute left-2 sm:left-4 z-20 h-12 w-12 rounded-full bg-black/60 hover:bg-white hover:text-black text-white flex items-center justify-center transition shadow-2xl active:scale-95 border border-white/20"
              title="Ảnh trước (Arrow Left)"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Uncropped High-Res Image */}
            <div className="relative w-full h-[65vh] sm:h-[75vh]">
              <Image
                src={LAB_SLIDES[lightboxIndex].image}
                alt={LAB_SLIDES[lightboxIndex].title}
                fill
                className="object-contain rounded-2xl drop-shadow-2xl"
                priority
              />
            </div>

            {/* Next Button */}
            <button
              onClick={() => setLightboxIndex((prev) => (prev !== null ? (prev + 1) % LAB_SLIDES.length : 0))}
              className="absolute right-2 sm:right-4 z-20 h-12 w-12 rounded-full bg-black/60 hover:bg-white hover:text-black text-white flex items-center justify-center transition shadow-2xl active:scale-95 border border-white/20"
              title="Ảnh tiếp theo (Arrow Right)"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Modal Bottom Caption */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl mx-auto p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal">
              {LAB_SLIDES[lightboxIndex].caption}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 text-xs font-bold rounded-full">
                {LAB_SLIDES[lightboxIndex].badge}
              </span>
              <span className="px-3 py-1 bg-pink-500/30 text-pink-200 border border-pink-400/50 text-xs font-bold rounded-full">
                {LAB_SLIDES[lightboxIndex].isoBadge}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
