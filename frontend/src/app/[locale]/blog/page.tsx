"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { 
  Sparkles, 
  Clock, 
  Eye, 
  Share2, 
  Bookmark, 
  ShoppingBag, 
  Check, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Droplet, 
  Sparkle, 
  ShieldCheck, 
  Mail, 
  Award,
  CheckCircle2,
  Heart,
  ChevronRight,
  ZoomIn
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";
import ImageLightboxModal from "@/components/ImageLightboxModal";

export default function RadianceJournalPage() {
  const { addItem } = useCartStore();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSavedArticle, setIsSavedArticle] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Quick Add Peptide Glaze to cart from floating hero box
  const handleAddHeroProduct = () => {
    addItem({
      id: "peptide-glaze-elixir",
      productId: "peptide-glaze-elixir",
      name: "Peptide Glaze Elixir (30ml)",
      price: 54,
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
      quantity: 1,
    });
    toast.success("Đã thêm Peptide Glaze Elixir vào giỏ hàng!", {
      style: { background: "#211a1c", color: "#fff", borderRadius: "12px" },
      iconTheme: { primary: "#FFA6C9", secondary: "#211a1c" },
    });
  };

  const handleAddProduct = (name: string, price: number, image: string, id: string) => {
    addItem({
      id,
      productId: id,
      name,
      price,
      image,
      quantity: 1,
    });
    toast.success(`Đã thêm ${name} vào giỏ hàng!`, {
      style: { background: "#211a1c", color: "#fff", borderRadius: "12px" },
      iconTheme: { primary: "#FFA6C9", secondary: "#211a1c" },
    });
  };

  // 3 Curated Insight Articles
  const PROTOCOLS = [
    {
      id: "sculpting-gua-sha",
      category: "Lymphatic Drainage • Face Architecture",
      badgeType: "Step-by-Step Video",
      readTime: "5 Min Read",
      title: "The 5-Minute Sculpting Ritual: Mastering the Rose Quartz Gua Sha for Lymphatic Flow",
      excerpt: "Release facial tension, stimulate micro-vascular delivery, and sculpt jawline contours using 15-degree angle pressure dynamics.",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800",
      productName: "Sculpting Gua Sha",
      productPrice: 32,
      productImage: "https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=600",
      filterGroup: "glass-skin",
    },
    {
      id: "snow-mushroom",
      category: "Bioactive Polysaccharides • Ingredients",
      badgeType: "Lab Infographic",
      readTime: "6 Min Read",
      title: "Snow Mushroom vs Hyaluronic Acid: Why Tremella Fuciformis Holds 400x Its Weight",
      excerpt: "Discovered in snow mushroom particles penetrate 35% deeper into the stratum corneum due to lower molecular weight and natural polysaccharides.",
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
      productName: "Cloud Ceramides Cream",
      productPrice: 48,
      productImage: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=600",
      filterGroup: "ingredients",
    },
    {
      id: "morning-evening",
      category: "Skin Barrier Restructuring • Dual Regimen",
      badgeType: "Clinical Protocol",
      readTime: "7 Min Read",
      title: "Morning Glow to Evening Reset: Crafting a Synergistic Protocol for Combination Skin",
      excerpt: "How to solidify oily cheeks while nursing T-zone sebum oxidation through biocompatible lipid layers and plant-derived squalane.",
      image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800",
      productName: "Dewy Velvet Lip Oil",
      productPrice: 28,
      productImage: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=600",
      filterGroup: "biomimetic",
    },
  ];

  const filteredProtocols = PROTOCOLS.filter((item) => {
    if (activeFilter !== "all" && item.filterGroup !== activeFilter) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.excerpt.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // FAQ Items
  const FAQS = [
    {
      q: "Can I layer active retinoids with the Peptide Glaze Elixir?",
      a: "Yes, and in fact it is clinically recommended. Peptides provide essential structural signal proteins without causing sensitivity, cushioning the skin from the typical dryness associated with vitamin A turnover. Apply the Peptide Glaze first, let absorb for 2 minutes, followed by your retinol, and seal with Cloud Ceramides.",
    },
    {
      q: "What exact order should face oils versus moisturizer follow?",
      a: "As a general dermatological rule, always follow molecular density from lightest humectant to heaviest occlusive. Apply water-based essences and peptide serums first, followed by water-binding creams (Cloud Ceramides), and lock everything in with an anhydrous botanical oil or facial balm as the final shielding veil.",
    },
    {
      q: "How often should you sanitize crystal rose quartz gua sha tools?",
      a: "Because natural quartz possesses micro-crystalline fissures, sanitize your tool after every single ritual. Wash gently with warm water and an antibacterial botanical cleanser, pat completely dry with a lint-free cloth, and store inside its designated protective satin pouch to prevent ambient bacterial settling.",
    },
  ];

  return (
    <div className="bg-transparent min-h-screen text-[#211a1c] font-sans relative selection:bg-[#732845] selection:text-white">
      
      {/* =========================================================================
          TOP BREADCRUMBS & EDITION BANNER
      ========================================================================= */}
      <div className="border-b border-pink-100/70 bg-white/70 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <nav className="flex items-center gap-1.5 text-secondary-text font-medium">
            <Link href="/blog" className="hover:text-[#732845] transition">The Radiance Journal</Link>
            <span>›</span>
            <span className="hover:text-[#732845] cursor-pointer">Dermal Masterclass</span>
            <span>›</span>
            <span className="text-[#211a1c] font-semibold truncate max-w-[200px] sm:max-w-none">
              The Molecular Science of Glass Skin
            </span>
          </nav>

          <div className="flex items-center gap-2 text-[11px] font-bold text-[#732845] tracking-wide self-start sm:self-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Vol. 14 Spring Edition • Curated by Glow-Up Labs, Geneva</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-20 space-y-20">

        {/* =========================================================================
            HERO ARTICLE: THE MOLECULAR SCIENCE OF GLASS SKIN
        ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Text & Article Information */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-[#FFE8F0] border border-pink-200/80 px-3.5 py-1 text-[10px] font-mono font-extrabold tracking-wider text-[#732845]">
                LAB REPORT REF: BIO-4011/G
              </span>
              <span className="rounded-full bg-white border border-gray-200/80 px-3 py-1 text-[10px] font-bold text-secondary-text shadow-2xs">
                PEER-REVIEWED PROTOCOL
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-600" />
                Dermatologist Certified
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#211a1c] leading-[1.15] tracking-tight">
              The Molecular Science of Glass Skin: How Bio-Identical Peptides & Snow Mushroom Rebuild the Cellular Matrix
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-secondary-text leading-relaxed font-normal">
              A clinician-led sensorial exploration into barrier restoration, micro-capillary circulation, and achieving luminous, non-sticky hydration in three deliberate, hormonal steps.
            </p>

            {/* Author Meta Row */}
            <div className="pt-2 pb-2 flex flex-wrap items-center justify-between gap-4 border-y border-pink-100/70 text-xs text-secondary-text">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#732845] to-[#FFA6C9] flex items-center justify-center text-white font-serif font-bold text-sm shadow-xs">
                  EV
                </div>
                <div>
                  <h4 className="font-bold text-[#211a1c]">Dr. Elena Vaneva</h4>
                  <p className="text-[11px] text-secondary-text">Lead Dermatological Scientist</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> 5 min read
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-primary" /> 14.2k reads
                </span>
                
                <div className="flex items-center gap-2 pl-2 border-l border-pink-100">
                  <button 
                    onClick={() => {
                      setIsSavedArticle(!isSavedArticle);
                      toast.success(isSavedArticle ? "Đã gỡ bài viết khỏi danh sách lưu" : "Đã lưu bài viết vào hồ sơ cá nhân!");
                    }}
                    className={`p-2 rounded-full border transition ${
                      isSavedArticle ? "bg-[#732845] text-white border-transparent" : "bg-white text-secondary-text hover:text-[#732845] border-gray-200/80"
                    }`}
                    title="Lưu bài viết"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      toast.success("Đã sao chép liên kết bài viết!");
                    }}
                    className="p-2 rounded-full border border-gray-200/80 bg-white text-secondary-text hover:text-[#732845] transition"
                    title="Chia sẻ bài viết"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Featured Product In This Protocol Floating Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/95 border border-pink-100/90 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-pink-50/50 border border-pink-100 shrink-0">
                  <Image 
                    src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=300"
                    alt="Peptide Glaze Elixir"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#732845] block">
                    FEATURED IN THIS PROTOCOL
                  </span>
                  <h4 className="text-sm font-bold text-[#211a1c] font-serif">
                    Peptide Glaze Elixir (30ml)
                  </h4>
                  <p className="text-xs text-secondary-text">
                    $54.00 · Clinically Proven Bio-Peptides
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  onClick={() => {
                    setIsSavedArticle(!isSavedArticle);
                    toast.success(isSavedArticle ? "Đã bỏ lưu" : "Đã lưu bài viết");
                  }}
                  className="rounded-full border border-pink-200/80 bg-white px-4 py-2 text-xs font-bold text-[#211a1c] hover:border-[#732845] hover:text-[#732845] transition shadow-2xs"
                >
                  Save Article
                </button>
                <button
                  onClick={handleAddHeroProduct}
                  className="rounded-full bg-[#732845] hover:bg-[#5c2037] text-white px-4 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> Quick Add to Bag
                </button>
              </div>
            </div>

          </div>

          {/* Right Hero Visual Cards */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            
            {/* Visual 1: Hydra-Gel Texture */}
            <div className="rounded-3xl border border-pink-100/90 bg-white p-3.5 shadow-card flex flex-col justify-between">
              <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-pink-50/40 mb-3">
                <Image
                  src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=600"
                  alt="Hydra-Gel Texture"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-1 px-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-[#211a1c]">Hydra-Gel Texture</span>
                  <span className="text-[#732845] bg-[#FFE8F0] px-2 py-0.5 rounded-full text-[10px]">98.4% Purity</span>
                </div>
                <p className="text-[11px] text-secondary-text leading-tight">
                  Viscosity calibrated to pass 0.12nm of the stratum corneum without residue.
                </p>
              </div>
            </div>

            {/* Visual 2: Key Formulation Bottle */}
            <div className="rounded-3xl border border-pink-100/90 bg-white p-3.5 shadow-card flex flex-col justify-between">
              <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-pink-50/40 mb-3">
                <Image
                  src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=600"
                  alt="Peptide Glaze Bottle"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-1 px-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-[#211a1c]">Key Formulation</span>
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                </div>
                <p className="text-[11px] text-secondary-text leading-tight">
                  Clinically proven 184% moisture increase within 1h of topical patterning.
                </p>
                <Link href="/product/peptide-glaze-elixir" className="text-[11px] font-bold text-[#732845] hover:underline inline-flex items-center pt-1">
                  Explore Formulation Chemistry ›
                </Link>
              </div>
            </div>

          </div>

        </section>

        {/* =========================================================================
            CATEGORY FILTER TAGS & SEARCH BAR
        ========================================================================= */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-white/95 border border-pink-100/80 shadow-xs">
          
          {/* Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Articles", count: 24 },
              { id: "glass-skin", label: "Glass Skin Rituals", count: 8 },
              { id: "ingredients", label: "Ingredient Deep-Dives", count: 7 },
              { id: "biomimetic", label: "Biomimetic Science", count: 5 },
              { id: "cellular", label: "Cellular Health", count: 4 },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive 
                      ? "bg-[#732845] text-white shadow-xs" 
                      : "bg-[#FAF0F3] text-secondary-text hover:text-[#732845] hover:bg-pink-100/80"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "text-secondary-text"}`}>
                    ({tab.count < 10 ? `0${tab.count}` : tab.count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary-text" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Topics, Ingredients..."
              className="w-full rounded-full border border-pink-200/80 bg-[#FAF0F3] pl-9 pr-4 py-2 text-xs text-[#211a1c] placeholder:text-secondary-text focus:outline-none focus:ring-2 focus:ring-[#732845] focus:bg-white transition"
            />
          </div>

        </section>

        {/* =========================================================================
            SECTION: TRENDING & CLINICAL PROTOCOLS (3 COLUMN CARDS)
        ========================================================================= */}
        <section className="space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#732845] flex items-center gap-1 mb-1">
                <Sparkles className="h-3.5 w-3.5" /> CURATED INSIGHTS
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#211a1c] tracking-tight">
                Trending & Clinical Protocols
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-secondary-text max-w-md">
              Full-duration sensorial guides, application mechanics, and restorative routines authored by practicing dermatologists.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredProtocols.map((p) => (
              <div 
                key={p.id}
                className="luxury-card rounded-3xl overflow-hidden luxury-card-hover flex flex-col justify-between group"
              >
                <div>
                  {/* Image with badges */}
                  <div 
                    onClick={() => setLightboxIndex(filteredProtocols.findIndex(item => item.id === p.id))}
                    className="relative aspect-[16/10] w-full overflow-hidden bg-pink-50 cursor-zoom-in group/img"
                    title="Nhấn để phóng to ảnh bài viết"
                  >
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="flex items-center gap-1.5 rounded-full bg-white/95 text-[#211a1c] px-3.5 py-1.5 text-xs font-bold shadow-md">
                        <ZoomIn className="h-3.5 w-3.5 text-primary" /> Phóng to ảnh
                      </span>
                    </div>
                    <div className="absolute top-3 left-3 z-10 pointer-events-none">
                      <span className="rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-[#211a1c] shadow-2xs">
                        {p.badgeType}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 z-10 pointer-events-none">
                      <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white">
                        {p.readTime}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-text block mb-2">
                      {p.category}
                    </span>
                    <h3 className="text-lg font-bold text-[#211a1c] font-serif leading-snug mb-3 group-hover:text-[#732845] transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-xs text-secondary-text leading-relaxed font-normal">
                      {p.excerpt}
                    </p>
                  </div>
                </div>

                {/* Bottom Product Pill CTA */}
                <div className="p-6 pt-0">
                  <div className="p-2.5 px-3.5 rounded-2xl bg-[#FAF0F3] border border-pink-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="h-6 w-6 rounded-lg bg-white flex items-center justify-center text-xs shrink-0 shadow-2xs text-[#732845]">
                        ✦
                      </span>
                      <div className="truncate">
                        <span className="text-xs font-bold text-[#211a1c] block truncate">
                          {p.productName}
                        </span>
                        <span className="text-[11px] font-semibold text-[#732845]">
                          ${p.productPrice}.00
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddProduct(p.productName, p.productPrice, p.productImage, p.id)}
                      className="h-8 w-8 rounded-full bg-[#732845] hover:bg-[#5c2037] text-white flex items-center justify-center shrink-0 shadow-xs active:scale-95 transition"
                      title="Quick Add"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </section>

        {/* =========================================================================
            BANNER CTA: FIND YOUR BESPOKE BOTANICAL PROTOCOL
        ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FAF0F3] via-[#FFF3F6] to-[#FAF0F3] border border-pink-200/90 p-8 sm:p-12 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            
            <div className="max-w-2xl space-y-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#732845]">
                <Sparkles className="h-3.5 w-3.5" /> PRECISION BOTANICAL DIAGNOSTICS
              </span>

              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#211a1c] tracking-tight">
                Find Your Bespoke Botanical Protocol
              </h2>

              <p className="text-xs sm:text-sm text-secondary-text leading-relaxed font-normal">
                Take our 60-Second Skin Diagnostic to receive customized journal recommendations, clinical ingredient dosages, and curated formulation pairings formulated for your unique lipid barrier.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#211a1c] border border-pink-200/70 shadow-2xs flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  4,800+ Diagnostic Profiles Mapped
                </span>
                <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#211a1c] border border-pink-200/70 shadow-2xs flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Formulated by Certified Holistic Chemists
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start lg:items-center gap-2 shrink-0">
              <Link
                href="/register"
                className="rounded-full bg-[#732845] hover:bg-[#5c2037] text-white px-8 py-3.5 text-xs font-bold transition shadow-md flex items-center justify-center active:scale-95 group text-center"
              >
                <span>Begin Diagnostic Ritual</span>
              </Link>
              <span className="text-[11px] text-secondary-text font-medium">
                Takes 60 seconds • No account required
              </span>
            </div>

          </div>
        </section>

        {/* =========================================================================
            SECTION: STEP-BY-STEP CLINICAL GUIDE (THE 3-STEP GLASS SKIN LAYERING)
        ========================================================================= */}
        <section className="space-y-10 text-center">
          
          <div className="max-w-2xl mx-auto space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#732845] block">
              STEP-BY-STEP CLINICAL GUIDE
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#211a1c] tracking-tight">
              The 3-Step Glass Skin Layering Technique
            </h2>
            <p className="text-xs sm:text-sm text-secondary-text">
              Achieve non-sticky, prism-like luminosity. Follow the clinically calibrated molecular absorption hierarchy from thinnest humectant to lipid seal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            
            {/* Step 01 */}
            <div className="luxury-card rounded-3xl p-6 sm:p-8 luxury-card-hover flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-serif font-bold text-[#FFA6C9]">01</span>
                  <span className="rounded-full bg-pink-50 border border-pink-200/60 px-2.5 py-0.5 text-[10px] font-bold text-[#732845]">
                    Water Phase: Micro
                  </span>
                </div>

                <h3 className="text-lg font-serif font-bold text-[#211a1c] mb-2">
                  Micro-Hydration Essence
                </h3>
                <p className="text-xs text-secondary-text leading-relaxed mb-6 font-normal">
                  Press 4 drops of Fermented Rose Petal Water into damp skin. Pat gently with palms to open cellular aquaporin channels.
                </p>

                <div className="space-y-2 text-xs font-semibold text-secondary-text mb-6">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>98% moisture surge instantly</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Balances texture pH 5.5</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-pink-100 flex items-center justify-between text-xs">
                <span className="font-bold text-[#211a1c]">Petal Essence · $38</span>
                <Link href="/shop" className="font-bold text-[#732845] hover:underline flex items-center gap-1">
                  View Product ›
                </Link>
              </div>
            </div>

            {/* Step 02 (Key Active Focus) */}
            <div className="luxury-card rounded-3xl p-6 sm:p-8 luxury-card-hover flex flex-col justify-between border-2 border-[#732845] relative bg-gradient-to-b from-white to-[#FFF6F9] shadow-md ring-4 ring-pink-100/60">
              <span className="absolute -top-3 right-6 rounded-full bg-[#732845] text-white px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest shadow-xs">
                Key Active Action
              </span>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-serif font-bold text-[#732845]">02</span>
                  <span className="rounded-full bg-[#FFE8F0] border border-pink-200 px-2.5 py-0.5 text-[10px] font-bold text-[#732845]">
                    Serum Phase: Macro
                  </span>
                </div>

                <h3 className="text-lg font-serif font-bold text-[#211a1c] mb-2">
                  Bio-Peptide Matrix Serum
                </h3>
                <p className="text-xs text-secondary-text leading-relaxed mb-6 font-normal">
                  Dispense one full dropper of Peptide Glaze Elixir. Glide upward across cheekbones and forehead until a smooth golden slip transitions to glass.
                </p>

                <div className="space-y-2 text-xs font-semibold text-secondary-text mb-6">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Hexapeptide-8 firming complex</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>High refractive index glow</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-pink-100 flex items-center justify-between text-xs">
                <span className="font-bold text-[#211a1c]">Peptide Glaze · $54</span>
                <Link href="/product/peptide-glaze-elixir" className="font-bold text-[#732845] hover:underline flex items-center gap-1">
                  View Product ›
                </Link>
              </div>
            </div>

            {/* Step 03 */}
            <div className="luxury-card rounded-3xl p-6 sm:p-8 luxury-card-hover flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-serif font-bold text-[#FFA6C9]">03</span>
                  <span className="rounded-full bg-pink-50 border border-pink-200/60 px-2.5 py-0.5 text-[10px] font-bold text-[#732845]">
                    Occlusive Phase
                  </span>
                </div>

                <h3 className="text-lg font-serif font-bold text-[#211a1c] mb-2">
                  Lipid Barrier Lock
                </h3>
                <p className="text-xs text-secondary-text leading-relaxed mb-6 font-normal">
                  Warm a dime-sized amount of Cloud Ceramides Cream between fingertips. Press into skin to prevent trans-epidermal water loss for up to 24 hours.
                </p>

                <div className="space-y-2 text-xs font-semibold text-secondary-text mb-6">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Bio-identical ceramides 1, 3, 6-II</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Shields against nocturnal TEWL</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-pink-100 flex items-center justify-between text-xs">
                <span className="font-bold text-[#211a1c]">Cloud Cream · $48</span>
                <Link href="/shop" className="font-bold text-[#732845] hover:underline flex items-center gap-1">
                  View Product ›
                </Link>
              </div>
            </div>

          </div>

        </section>

        {/* =========================================================================
            SECTION: CLINICAL GUIDANCE FAQ
        ========================================================================= */}
        <section className="space-y-8 max-w-3xl mx-auto">
          
          <div className="text-center space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#732845] block">
              CLINICAL GUIDANCE
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#211a1c]">
              Ask the Concierge Aestheticians
            </h2>
            <p className="text-xs sm:text-sm text-secondary-text">
              Answers to frequent formulation pairings, ingredient safety, and preservation protocols.
            </p>
          </div>

          <div className="space-y-3.5">
            {FAQS.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl border border-pink-100/90 bg-white/95 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-serif font-bold text-sm sm:text-base text-[#211a1c] hover:text-[#732845] transition"
                  >
                    <span>{faq.q}</span>
                    <span className="h-6 w-6 rounded-full bg-pink-50 flex items-center justify-center shrink-0 text-[#732845]">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-secondary-text leading-relaxed border-t border-pink-100/60 pt-3 animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </section>

        {/* =========================================================================
            SECTION: JOIN THE RADIANCE JOURNAL CIRCLE
        ========================================================================= */}
        <section className="max-w-2xl mx-auto text-center rounded-3xl bg-gradient-to-b from-[#FFF5F8] to-[#FAF0F3] border border-pink-200/90 p-8 sm:p-12 shadow-sm space-y-4">
          <div className="h-10 w-10 mx-auto rounded-full bg-white flex items-center justify-center text-[#732845] shadow-xs">
            <Mail className="h-5 w-5" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#211a1c]">
            Join the Radiance Journal Circle
          </h2>

          <p className="text-xs sm:text-sm text-secondary-text max-w-lg mx-auto">
            Receive private masterclass invites, seasonal formulation drops, and 15% off your next skincare ritual directly to your inbox.
          </p>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!emailInput) return;
              toast.success("Cảm ơn bạn đã đăng ký nhận bản tin Journal Circle!");
              setEmailInput("");
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto pt-2"
          >
            <input 
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your email address..."
              className="w-full rounded-full border border-pink-200 bg-white px-5 py-3 text-xs text-[#211a1c] placeholder:text-secondary-text focus:outline-none focus:ring-2 focus:ring-[#732845]"
            />
            <button
              type="submit"
              className="w-full sm:w-auto rounded-full bg-[#732845] hover:bg-[#5c2037] text-white px-6 py-3 text-xs font-bold shrink-0 transition shadow-xs active:scale-95"
            >
              Subscribe Free
            </button>
          </form>

          <p className="text-[10px] text-secondary-text pt-1">
            Strict anti-spam policy. Unsubscribe at any time with a single click.
          </p>
        </section>

        {/* =========================================================================
            TRUST BADGES ROW (4 ICONS)
        ========================================================================= */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-pink-100/70 text-center">
          <div className="space-y-1">
            <div className="text-lg">🇨🇭</div>
            <h4 className="text-xs font-bold text-[#211a1c]">Swiss Formulated</h4>
            <p className="text-[11px] text-secondary-text">Pre-Alpine Botanical Actives</p>
          </div>
          <div className="space-y-1">
            <div className="text-lg">🌿</div>
            <h4 className="text-xs font-bold text-[#211a1c]">100% Bio-Clean Actives</h4>
            <p className="text-[11px] text-secondary-text">Tested for Bioactivity & Purity</p>
          </div>
          <div className="space-y-1">
            <div className="text-lg">🐰</div>
            <h4 className="text-xs font-bold text-[#211a1c]">Leaping Bunny Certified</h4>
            <p className="text-[11px] text-secondary-text">100% Cruelty-Free & Vegan</p>
          </div>
          <div className="space-y-1">
            <div className="text-lg">🛡️</div>
            <h4 className="text-xs font-bold text-[#211a1c]">30-Day Luster Guarantee</h4>
            <p className="text-[11px] text-secondary-text">Visible Glow or Full Refund</p>
          </div>
        </section>

      </div>

      {/* Fullscreen Article Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        images={filteredProtocols.map(p => ({
          url: p.image,
          title: p.title,
          caption: p.excerpt,
          badge: p.badgeType,
          location: p.category,
        }))}
        currentIndex={lightboxIndex ?? 0}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  );
}
