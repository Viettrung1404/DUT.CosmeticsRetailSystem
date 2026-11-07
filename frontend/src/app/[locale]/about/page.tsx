"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Award, 
  FlaskConical, 
  Activity, 
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn
} from "lucide-react";
import toast from "react-hot-toast";
import ImageLightboxModal, { LightboxImageItem } from "@/components/ImageLightboxModal";

const ABOUT_HERO_SLIDES: (LightboxImageItem & { id: number; location: string; badge: string; subBadge: string })[] = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1600",
    title: "Geneva Cantonal Bio-Park Lab",
    badge: "LAB ARCHIVE: Geneva",
    subBadge: "L-BIOPETIDE-COMPLEX 412",
    location: "Cleanroom Facility A-9, Switzerland",
    caption: "Phòng nghiên cứu vô trùng sinh học A-9 tại Geneva. Nơi hoàn thiện công thức chuỗi bio-peptide 412 giúp tăng tốc độ phục hồi màng bảo vệ da 54%.",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=1600",
    title: "Alpine Cryogenic Bio-Fermentation",
    badge: "CRYO-CHAMBER: Valais",
    subBadge: "NATIVE EDELWEISS ENZYMES",
    location: "Alpine Biological Station, Valais",
    caption: "Công nghệ chiết xuất lạnh sâu -40°C bảo tồn nguyên vẹn 100% hoạt tính chống oxy hóa tự nhiên từ hoa nhung tuyết dãy Alps.",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1600",
    title: "Biophotonic Optical Preservation",
    badge: "MIRON GLASS: Zurich",
    subBadge: "ZERO PHOTO-DECAY",
    location: "Spectrometry Division, Zurich",
    caption: "Thủy tinh tím Miron Violet lọc hoàn toàn các bước sóng ánh sáng gây oxy hóa, bảo toàn độ tươi mới của dưỡng chất suốt 36 tháng.",
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1600",
    title: "Sub-Micron Transdermal Matrix",
    badge: "FORMULATION: Geneva",
    subBadge: "CLINICALLY PROVEN 98.4%",
    location: "Molecular Rheology Atelier, Geneva",
    caption: "Cấu trúc vi nang 0.02 micron đưa tinh chất thẩm thấu sâu xuống tầng đáy biểu bì, không gây nhờn dính hay bít tắc chân lông.",
  },
];

export default function AboutSciencePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Auto-slide effect every 4.5s (pauses on hover or when lightbox is open)
  useEffect(() => {
    if (isPaused || lightboxIndex !== null) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % ABOUT_HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, lightboxIndex]);

  const handleBookAtelier = () => {
    toast.success("Đã ghi nhận yêu cầu tư vấn! Chuyên viên thẩm mỹ Thụy Sĩ sẽ liên hệ bạn trong 24h.", {
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

  return (
    <div className="min-h-screen bg-transparent text-on-surface font-sans pb-24">
      
      {/* 1. TOP ANNOUNCEMENT TICKER */}
      <div className="bg-surface-container border-b border-outline-variant/30 py-2.5 text-center text-xs tracking-wider text-on-surface-variant font-medium">
        ✨ Swiss Biotechnological Formulations with Active Peptide Matrices • Free Express Delivery Worldwide • <Link href="/our-science" className="underline hover:text-primary">View Full Scientific Dossier</Link>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">

        {/* 2. HERO SECTION */}
        <section className="mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-primary/20 bg-white/90 text-primary text-[11px] font-bold uppercase tracking-widest mb-4 shadow-2xs">
                <Sparkles className="h-3 w-3" /> SWISS BIOTECHNOLOGICAL RADIANCE • Our Science & Methodology
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-on-surface leading-[1.1] mb-6 font-serif">
                Biotechnology Reimagined.<br />
                <span className="italic font-serif text-primary">Radiance Perfected</span> in Geneva.
              </h1>

              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6 font-medium max-w-xl">
                Inside a pristine alpine lab, biomimetic research converges with radiant peptide science to rewrite glass-skin longevity. Zero fillers, zero compromise: clean bio-actives harvested and cryo-preserved between Swiss summits.
              </p>

              {/* Quote callout box */}
              <div className="p-5 rounded-2xl bg-surface-container border-l-4 border-primary mb-8">
                <p className="text-xs sm:text-sm text-on-surface italic leading-relaxed font-serif">
                  &quot;We refused to balance compromise between clinical potency and bio-purity. Every drop delivers maximum proven cellular renewal without synthetic fragrance.&quot;
                </p>
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider block mt-2">
                  — Dr. Beatrix Keller, Head of Bio-Molecular Extraction, Geneva
                </span>
              </div>

              {/* 4 Key Stat Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { value: "98.4%", label: "Skin-identical Affinity" },
                  { value: "0%", label: "Synthetic Fragrance" },
                  { value: "100%", label: "Solar-Formulated" },
                  { value: "14", label: "Cellular Bio-Patents" },
                ].map((stat, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-surface border border-outline-variant/30 shadow-2xs text-center">
                    <div className="text-2xl sm:text-3xl font-extrabold text-primary font-serif mb-1">
                      {stat.value}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-tight">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/our-science"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-xs font-bold text-white shadow-sm hover:bg-secondary transition"
                >
                  Explore Formulation Atlas
                </Link>
                <Link
                  href="/our-science#clinical-study"
                  className="inline-flex items-center text-xs font-bold text-primary hover:text-secondary transition underline underline-offset-4"
                >
                  Complete Clinical Spectrum Results
                </Link>
              </div>
            </div>

            {/* Right Lab Image Showcase - Interactive Auto-Sliding Banner & Lightbox Modal */}
            <div className="lg:col-span-5 relative">
              <div 
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                className="relative rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/30 bg-black min-h-[460px] sm:min-h-[500px] lg:h-[520px] w-full flex flex-col justify-between group"
              >
                {/* Images Layer with Crossfade */}
                {ABOUT_HERO_SLIDES.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-zoom-in ${
                      currentSlide === idx ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
                    }`}
                    onClick={() => setLightboxIndex(idx)}
                  >
                    <Image
                      src={slide.url}
                      alt={slide.title || "Swiss Laboratory"}
                      fill
                      priority={idx === 0}
                      className="object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35" />
                  </div>
                ))}

                {/* Top Control Bar with Lab Archive Badge & Zoom Button */}
                <div className="relative z-20 p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-surface/95 backdrop-blur-md px-3.5 py-2 shadow-md border border-outline-variant/30 text-[10px] font-bold text-on-surface">
                    <FlaskConical className="h-3.5 w-3.5 text-primary" />
                    <span>{ABOUT_HERO_SLIDES[currentSlide].badge}</span>
                  </div>

                  <button
                    onClick={() => setLightboxIndex(currentSlide)}
                    className="flex items-center gap-1.5 rounded-full bg-black/60 hover:bg-primary text-white backdrop-blur-md px-3.5 py-2 text-xs font-bold transition shadow-md active:scale-95"
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
                      setCurrentSlide((prev) => (prev - 1 + ABOUT_HERO_SLIDES.length) % ABOUT_HERO_SLIDES.length);
                    }}
                    className="h-10 w-10 rounded-full bg-surface/90 hover:bg-surface text-on-surface hover:text-primary flex items-center justify-center shadow-lg transition active:scale-95 pointer-events-auto border border-outline-variant/30"
                    title="Ảnh trước"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide((prev) => (prev + 1) % ABOUT_HERO_SLIDES.length);
                    }}
                    className="h-10 w-10 rounded-full bg-surface/90 hover:bg-surface text-on-surface hover:text-primary flex items-center justify-center shadow-lg transition active:scale-95 pointer-events-auto border border-outline-variant/30"
                    title="Ảnh tiếp theo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Bottom Information Card & Dot Indicators */}
                <div className="relative z-20 p-4 sm:p-5">
                  <div className="rounded-2xl bg-surface/95 backdrop-blur-md p-4 border border-outline-variant/30 shadow-lg">
                    <div className="flex items-center justify-between mb-1 text-xs font-bold text-on-surface">
                      <span className="text-primary flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5" />
                        {ABOUT_HERO_SLIDES[currentSlide].subBadge}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">
                        <Check className="h-3 w-3" /> CLINICALLY PROVEN
                      </span>
                    </div>

                    <p className="text-[11px] text-on-surface-variant leading-snug line-clamp-2 mb-3">
                      {ABOUT_HERO_SLIDES[currentSlide].caption}
                    </p>

                    {/* Progress Dots & Slide Indicator */}
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                      <div className="flex items-center gap-1.5">
                        {ABOUT_HERO_SLIDES.map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentSlide(dotIdx);
                            }}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              currentSlide === dotIdx ? "w-6 bg-primary" : "w-2 bg-on-surface-variant/30 hover:bg-on-surface-variant/60"
                            }`}
                            aria-label={`Chuyển đến slide ${dotIdx + 1}`}
                          />
                        ))}
                      </div>

                      <span className="text-[10px] font-mono font-bold text-on-surface-variant">
                        {currentSlide + 1} / {ABOUT_HERO_SLIDES.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>


        {/* 3. SECTION: THE FOUR PILLARS OF CLINICAL FORMULATION */}
        <section id="four-pillars" className="mb-24 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary block mb-2">
              SCIENTIFIC RIGOR
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface font-serif">
              The Four Pillars of Clinical Formulation
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-2">
              Every formulation started with high-altitude cellular survival botanicals, reconstructed in cryogenic conditions until quantum bio-energetic tight titration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Pillar 01 */}
            <div className="rounded-3xl border border-outline-variant/30 bg-surface p-8 shadow-xs flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition">
              <div>
                <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary inline-block mb-4">
                  Pillar 01
                </span>
                <h3 className="text-xl font-bold text-on-surface font-serif mb-3">
                  High-Altitude Alpine Bio-Ferments
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6 font-medium">
                  Harvested ethically above 3,000 meters in the Valais Alps. Wild Leontopodium Alpinum (Edelweiss) and Sempervivum Tectorum cells develop enormous antioxidant resilience against extreme solar UV radiation and freezing thermal swings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-outline-variant/20">
                <div className="rounded-xl bg-surface-container p-3 text-center">
                  <div className="text-lg font-bold text-primary">+60%</div>
                  <div className="text-[10px] text-on-surface-variant font-semibold">Collagen I Yield</div>
                </div>
                <div className="rounded-xl bg-surface-container p-3 text-center">
                  <div className="text-lg font-bold text-primary">-40°C</div>
                  <div className="text-[10px] text-on-surface-variant font-semibold">Cryo-Extracted</div>
                </div>
              </div>
            </div>

            {/* Pillar 02 */}
            <div className="rounded-3xl border border-outline-variant/30 bg-surface p-8 shadow-xs flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition">
              <div>
                <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary inline-block mb-4">
                  Pillar 02
                </span>
                <h3 className="text-xl font-bold text-on-surface font-serif mb-3">
                  Hexapeptide-X & Tremella
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6 font-medium">
                  Bio-mimetic oligopeptides paired with low-molecular hyaluronic matrices. Penetrating seven dermal strata to reactivate cellular vitality, diminish micro-grooves, and sculpt youthful density.
                </p>
              </div>

              <div className="relative aspect-[3/1] w-full rounded-2xl overflow-hidden border border-outline-variant/30">
                <Image
                  src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=800"
                  alt="Microscopic Cellular Structure"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-xs font-bold text-white tracking-wider uppercase bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                    Micro-Groove Depth Index: -38% in 28 Days
                  </span>
                </div>
              </div>
            </div>

            {/* Pillar 03 */}
            <div className="rounded-3xl border border-outline-variant/30 bg-surface p-8 shadow-xs flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition">
              <div>
                <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary inline-block mb-4">
                  Pillar 03
                </span>
                <h3 className="text-xl font-bold text-on-surface font-serif mb-3">
                  Biophotonic Miron Violet Glass Shielding
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6 font-medium">
                  Sunlight contains visible light and infrared/ultraviolet waves. Most amber or clear glass let visible light pass through, degrading bio-molecular integrity. Miron Violet Glass selectively acts as a natural filter, blocking visible light while allowing penetrative energizing UV-A.
                </p>

                <div className="space-y-2 mb-6 text-xs text-on-surface-variant font-medium">
                  <div className="flex items-center gap-2 text-on-surface">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Zero chemical preservatives required</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Shelf-life bio-energetically preserved up to 36 months</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>100% infinitely recyclable biophotonic glass</span>
                  </div>
                </div>
              </div>

              <div className="relative aspect-[4/2] w-full rounded-2xl overflow-hidden border border-outline-variant/30">
                <Image
                  src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800"
                  alt="Miron Violet Glass Bottles"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Pillar 04 */}
            <div className="rounded-3xl border border-outline-variant/30 bg-surface p-8 shadow-xs flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition">
              <div>
                <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary inline-block mb-4">
                  Pillar 04
                </span>
                <h3 className="text-xl font-bold text-on-surface font-serif mb-3">
                  Biorisk-Friendly pH 5.2 Equilibrium
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6 font-medium">
                  Formulated precisely at your acid mantle&apos;s sweet spot. Preserves diverse micro-biome diversity and squelches sub-clinical inflammation before it surfaces, avoiding the barrier stripping common in commercial skincare.
                </p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-surface-container-low to-surface p-6 border border-outline-variant/30 text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant block mb-1">
                  OPTIMAL ACID MANTLE INDEX
                </span>
                <div className="text-4xl font-extrabold text-primary font-serif mb-2">
                  pH 5.2 ± 0.1
                </div>
                <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto">
                  Buffered with fermented Swiss apple amino acids to resist tap water alkalinity.
                </p>
              </div>
            </div>

          </div>
        </section>


        {/* 4. SECTION: PHOTONIC TESTING COMPARISON TABLE */}
        <section className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary block mb-2">
              LIGHT-PROOF PHOTONIC TESTING
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface font-serif">
              Why We Encase Every Elixir in Violet Crystal
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-2">
              Independent spectrophotometer analysis testing ingredient degradation in glass types under 180-day solar exposure cycle in Geneva.
            </p>
          </div>

          <div className="rounded-3xl border border-outline-variant/30 bg-surface overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-container text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="py-4 px-6">Packaging Material</th>
                    <th className="py-4 px-6">Degradation (6 Months)</th>
                    <th className="py-4 px-6">UV-A & Violet Penetration</th>
                    <th className="py-4 px-6">Bio-Energy Retention</th>
                    <th className="py-4 px-6">Preservative Need</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-medium">
                  {/* Row 1: Miron Violet Glass (Highlighted) */}
                  <tr className="bg-surface-container-low">
                    <td className="py-4 px-6 font-bold text-primary flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-secondary" />
                      Miron Bio-Photonic Violet Glass
                    </td>
                    <td className="py-4 px-6 text-emerald-700 font-bold">&lt; 1.4% Degraded</td>
                    <td className="py-4 px-6 text-on-surface">Selective (Bio-preserving 25-45%)</td>
                    <td className="py-4 px-6 text-emerald-700 font-bold">93.6% Retained</td>
                    <td className="py-4 px-6 text-emerald-700 font-bold">0% Preservatives</td>
                  </tr>

                  {/* Row 2: Pharmaceutical Amber */}
                  <tr>
                    <td className="py-4 px-6 text-on-surface">Pharmaceutical Amber Glass</td>
                    <td className="py-4 px-6 text-on-surface-variant">19.4% Oxidized</td>
                    <td className="py-4 px-6 text-on-surface-variant">Blocked all (including beneficial)</td>
                    <td className="py-4 px-6 text-on-surface-variant">51.2% Retained</td>
                    <td className="py-4 px-6 text-on-surface-variant">Parabens/Phenoxyethanol</td>
                  </tr>

                  {/* Row 3: Clear Flint Glass */}
                  <tr>
                    <td className="py-4 px-6 text-on-surface">Clear Flint Glass (Standard Luxury)</td>
                    <td className="py-4 px-6 text-status-danger font-bold">78% Oxidized (Full Breakdown)</td>
                    <td className="py-4 px-6 text-on-surface-variant">Unfiltered Transmission</td>
                    <td className="py-4 px-6 text-status-danger font-bold">11.8% Retained</td>
                    <td className="py-4 px-6 text-status-danger">Heavy Preservative System</td>
                  </tr>

                  {/* Row 4: Commercial Plastic PET */}
                  <tr>
                    <td className="py-4 px-6 text-on-surface">Commercial PET / HDPE Plastic</td>
                    <td className="py-4 px-6 text-status-danger font-bold">91.2% Absorption</td>
                    <td className="py-4 px-6 text-on-surface-variant">Partial Permeability</td>
                    <td className="py-4 px-6 text-status-danger font-bold">4.6% Retained</td>
                    <td className="py-4 px-6 text-status-danger">Endocrine Disruptor Risk</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>


        {/* 5. SECTION: CLINICAL VERIFICATION & THIRD-PARTY STUDY */}
        <section id="clinical-study" className="mb-24 scroll-mt-24">
          <div className="rounded-[36px] border border-outline-variant/30 bg-gradient-to-r from-surface-container to-surface p-8 sm:p-14 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              <div 
                onClick={() => setLightboxIndex(3)}
                className="lg:col-span-4 relative aspect-[4/5] rounded-3xl overflow-hidden shadow-md border border-outline-variant/30 cursor-zoom-in group"
                title="Nhấn để xem ảnh phóng to"
              >
                <Image
                  src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800"
                  alt="Peptide Glaze Elixir clinical testing"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="flex items-center gap-1.5 rounded-full bg-surface/95 text-on-surface px-3.5 py-1.5 text-xs font-bold backdrop-blur-md shadow-md border border-outline-variant/30">
                    <ZoomIn className="h-4 w-4 text-primary" /> Xem ảnh đầy đủ
                  </span>
                </div>
              </div>

              <div className="lg:col-span-8">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary flex items-center gap-1.5 mb-2">
                  <Award className="h-3.5 w-3.5" /> CLINICAL VERIFICATION & THIRD-PARTY STUDY
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary font-serif mb-4 leading-tight">
                  98.4% Clinically Proven Skin Barrier Elasticity in 14 Days
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-8 font-medium">
                  In an independent, 28-day, double-blind clinical trial under dermatological supervision (n=64 female participants, ages 24-62).
                </p>

                {/* 3 Large Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="rounded-2xl bg-surface p-5 border border-outline-variant/30 shadow-2xs text-center">
                    <div className="text-3xl font-extrabold text-primary font-serif mb-1">+82%</div>
                    <div className="text-[11px] font-bold text-on-surface-variant uppercase">Immediate Skin Hydration</div>
                  </div>
                  <div className="rounded-2xl bg-surface p-5 border border-outline-variant/30 shadow-2xs text-center">
                    <div className="text-3xl font-extrabold text-primary font-serif mb-1">-54%</div>
                    <div className="text-[11px] font-bold text-on-surface-variant uppercase">Transepidermal Water Loss</div>
                  </div>
                  <div className="rounded-2xl bg-surface p-5 border border-outline-variant/30 shadow-2xs text-center">
                    <div className="text-3xl font-extrabold text-primary font-serif mb-1">98%</div>
                    <div className="text-[11px] font-bold text-on-surface-variant uppercase">Reported Dewy Radiance in 14 Days</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Protocol validated under ISO 9001 and Swiss Medic Cosmetic Compliance.</span>
                </div>
              </div>

            </div>
          </div>
        </section>


        {/* 6. SECTION: ETHICAL & FORMULATION CERTIFICATIONS */}
        <section className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-xl sm:text-2xl font-bold text-on-surface font-serif mb-2">
              Uncompromising Ethical & Formulation Certifications
            </h3>
            <p className="text-xs text-on-surface-variant">
              Verified by independent Swiss and international bio-regulatory commissions.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
            {[
              { title: "Swiss Clinically Certified", desc: "Geneva laboratory accreditation" },
              { title: "Leaping Bunny Certified", desc: "Cruelty-free recognized globally" },
              { title: "Ecocert Bio-Actives", desc: "95%+ plant-based organic origins" },
              { title: "Zero-Carbon Shipping", desc: "100% climate-neutral Swiss transport" },
              { title: "100% Ocean-Safe", desc: "Reef-safe biodegradable filters" },
            ].map((cert, idx) => (
              <div key={idx} className="rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-2xs flex flex-col items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-primary mb-3">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-on-surface mb-1">{cert.title}</h4>
                <p className="text-[10px] text-on-surface-variant">{cert.desc}</p>
              </div>
            ))}
          </div>
        </section>


        {/* 7. SECTION: THE FACES OF SCIENCE (Master Formulation Scientists) */}
        <section className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary block mb-2">
              THE FACES OF SCIENCE
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface font-serif">
              Our Master Formulation Scientists
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-2">
              Bridging alpine herbal lore with peptide biochemical precision to create next-generation clean cellular aesthetics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Scientist 1 */}
            <div className="rounded-3xl border border-outline-variant/30 bg-surface p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-primary font-bold text-lg font-serif">
                    BK
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface font-serif">Dr. Beatrix Keller, Ph.D.</h3>
                    <span className="text-[11px] text-primary font-semibold">Head of Bio-Molecular Extraction</span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6 font-medium">
                  Former Senior Fellow at Federal Technology (ETH Zurich), researcher specializing in phytopharmacology and bio-fermentation cell wall lysis systems for cellular regeneration.
                </p>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-outline-variant/20 text-xs font-semibold text-on-surface-variant">
                <span>32 Published Papers</span>
                <span>•</span>
                <span>ETH Zurich Alumni</span>
              </div>
            </div>

            {/* Scientist 2 */}
            <div className="rounded-3xl border border-outline-variant/30 bg-surface p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-primary font-bold text-lg font-serif">
                    MW
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface font-serif">Dr. Marc Weber, M.D.</h3>
                    <span className="text-[11px] text-primary font-semibold">Head of Clinical Dermatology</span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6 font-medium">
                  Board-certified dermatologist with 18 years validating European cosmetics safety, specializing in micro-peptides and transepidermal barrier delivery mechanisms.
                </p>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-outline-variant/20 text-xs font-semibold text-on-surface-variant">
                <span>18 Clinical Trials</span>
                <span>•</span>
                <span>Geneva Medical Board</span>
              </div>
            </div>
          </div>
        </section>


        {/* 8. SECTION: VISIT OUR FLAGSHIP DIAGNOSTIC ATELIERS */}
        <section className="mb-24 rounded-3xl border border-outline-variant/30 bg-surface-container p-8 sm:p-12 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary block mb-2">
              PHYSICAL PRESENCE
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-on-surface font-serif mb-2">
              Visit Our Flagship Diagnostic Ateliers
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-xl">
              Complimentary 30-minute skin scans and bespoke bio-ferment blending in Geneva, Zurich, New York, and London.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/stores"
              className="rounded-full border border-outline-variant/50 bg-surface px-6 py-3 text-xs font-bold text-on-surface hover:border-primary transition shadow-2xs"
            >
              Find Atelier
            </Link>
            <button
              onClick={handleBookAtelier}
              className="rounded-full bg-primary px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-secondary transition"
            >
              Book Consultation
            </button>
          </div>
        </section>


        {/* 9. SECTION: BOTTOM EXPERIENCE CALLOUT */}
        <section className="text-center max-w-3xl mx-auto">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary block mb-2">
            YOUR PERSONAL REGIMEN
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface font-serif mb-4">
            Experience Swiss Cellular Precision On Your Skin
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-xl mx-auto leading-relaxed mb-8 font-medium">
            Take our algorithmic 60-second skin diagnostic developed by our Geneva biochemists to identify your exact cellular hydration profile.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/account"
              className="rounded-full bg-primary px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-secondary transition text-center"
            >
              Take the 60-Sec Diagnostic
            </Link>
            <Link
              href="/shop"
              className="rounded-full border border-outline-variant/50 bg-surface px-8 py-3.5 text-xs font-bold text-on-surface hover:border-primary transition shadow-2xs"
            >
              Explore Archive Formulations
            </Link>
          </div>
        </section>

      </div>

      {/* Fullscreen Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        images={ABOUT_HERO_SLIDES}
        currentIndex={lightboxIndex ?? 0}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  );
}