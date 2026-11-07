"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { 
  Sparkles, 
  Droplet, 
  Moon, 
  ShieldCheck, 
  Recycle, 
  ShoppingBag, 
  Shield, 
  HeartHandshake, 
  CheckCircle2,
  FolderTree,
  Layers,
  ChevronRight,
  Loader2,
  ZoomIn
} from "lucide-react";
import { categoriesApi, CategoryTreeItem } from "@/lib/api";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";
import ImageLightboxModal, { LightboxImageItem } from "@/components/ImageLightboxModal";

const CURATED_SETS: (LightboxImageItem & { id: string })[] = [
  {
    id: "set-glass-skin",
    url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=1200",
    title: "The 3-Step Glass Skin Foundation",
    badge: "Popular Set",
    location: "Atelier Routine",
    caption: "Illuminating Cleanser (120ml), Glow Mist (100ml), and Whipped Ceramide Cream (50ml).",
  },
  {
    id: "set-sunlit-body",
    url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=1200",
    title: "The Sunlit Body Radiance Duo",
    badge: "Limited Edition",
    location: "Swiss Purity",
    caption: "Glistening Shimmer Oil (100ml) paired with Rose Quartz Peptide Lip Glaze (15ml).",
  },
  {
    id: "set-evening-repair",
    url: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=1200",
    title: "The Evening Cell-Repair Vault",
    badge: "Gift Edition",
    location: "Bio-Peptide Archive",
    caption: "Cryo-firming Peptide Concentrate (30ml) and Intensive Barrier Overnight Balms (50ml).",
  },
];

export default function CategoriesHubPage() {
  const { addItem } = useCartStore();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedConcern, setSelectedConcern] = useState<string>("glass-skin");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Real Database Category Tree State
  const [categoryTree, setCategoryTree] = useState<CategoryTreeItem[]>([]);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState(true);

  useEffect(() => {
    async function loadTree() {
      try {
        const res = await categoriesApi.getTree();
        if (res && Array.isArray(res.data) && res.data.length > 0) {
          setCategoryTree(res.data);
          setSelectedRootId(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load category tree from database:", err);
      } finally {
        setIsLoadingTree(false);
      }
    }
    loadTree();
  }, []);

  const activeRootCategory = categoryTree.find((c) => c.id === selectedRootId) || categoryTree[0];

  const filterPills = [
    { id: "all", label: "Tất cả bộ sưu tập", count: 5 },
    { id: "cellular", label: "Cellular Skincare", count: 12 },
    { id: "lips", label: "Dewy Lip Care", count: 8 },
    { id: "spf", label: "Solar Barrier & Mineral SPF", count: 6 },
    { id: "body", label: "Body Luminizers", count: 9 },
    { id: "tools", label: "Ritual Tools & Quartz", count: 7 },
  ];

  const spotlights = [
    {
      id: "cellular",
      num: "01",
      badge: "Category: Cellular Skincare",
      title: "Cellular Skincare & Bio-Peptides",
      description: "Bio-mimetic oligopeptides paired with low-molecular hyaluronic matrices. Penetrating seven dermal strata to reactivate cellular vitality, diminish micro-grooves, and sculpt youthful density.",
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1200",
      stats: "12 Active Formulations",
      priceRange: "$48 — $135",
      tags: ["Peptide Glaze Elixir", "Whipped Ceramide Cream", "Zinc Sunscreen SPF", "Eye Reset Gel"],
      featureNote: "Glass Bottle Recycling • Return 5 empty vessels for $15 store credit",
      shopUrl: "/shop?category=Cellular",
    },
    {
      id: "lips",
      num: "02",
      badge: "For Botanic Archive",
      title: "Dewy Velvet Lip Care",
      description: "Infused with cold-pressed rosehip seed and volumetric plant peptides. Delivers continuous plumpness, mirror-sheen reflections, and zero stickiness.",
      image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=1200",
      stats: "8 Shades Available",
      priceRange: "$26 — $42",
      tags: ["Plump Lip Glaze", "Rosehip Butter Balm", "Dew Tint Oil", "Sugar Quartz Polish"],
      featureNote: "100% Vegan & Non-Sticky Plumping Formula",
      shopUrl: "/shop?category=Lips",
    },
    {
      id: "spf",
      num: "03",
      badge: "Clinic Formulas",
      title: "Solar Barrier & Mineral SPF",
      description: "Ultra-fine non-nano zinc fused with Swiss Alpine edelweiss extract. Shields against UVA/UVB rays, high-energy blue light, and urban pollution while leaving a satin water veil.",
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=1200",
      stats: "Available in 2 formats",
      priceRange: "$38 — $64",
      tags: ["Mineral SPF 50+ Veil", "Tinted Glow Fluid", "Alpine Defense Mist", "After-Sun Aloe Serum"],
      featureNote: "Non-Nano Zinc • Ocean & Coral-Reef Safe Certified",
      shopUrl: "/shop?category=SPF",
    },
    {
      id: "body",
      num: "04",
      badge: "Cold-Pressed Botanical Oils",
      title: "Sensory Body & Luminizers",
      description: "Transformative dry-oils, melting enzyme body butters, and golden sparkle shimmer mists that drench the skin in deep hydration and fragrant botanical essences.",
      image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=1200",
      stats: "All-Day Radiance",
      priceRange: "$45 — $88",
      tags: ["Glistening Dry Oil", "Enzyme Polish Scrub", "Whipped Body Velvet", "Shimmer Hydrating Mist"],
      featureNote: "Infused with 24K Gold Pearl Flakes & Camellia Seed Oil",
      shopUrl: "/shop?category=Body",
    },
    {
      id: "tools",
      num: "05",
      badge: "High Vibrational Quartz",
      title: "Holistic Tools & Crystal Sculpting",
      description: "Hand-carved crystalline facial tools, cooling globes, and lymphatic-draining wands designed to boost micro-circulation, lift the jawline, and deepen serum absorption.",
      image: "https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=1200",
      stats: "Lymphatic Sculpting",
      priceRange: "$32 — $95",
      tags: ["Rose Quartz Gua Sha", "Dual Facial Roller", "Cryo Ice Globes", "Acupressure Wand"],
      featureNote: "Authentic Grade-A Brazilian Rose Quartz with Complimentary Velvet Pouch",
      shopUrl: "/shop?category=Tools",
    },
  ];

  const handleFilterClick = (pillId: string) => {
    setActiveFilter(pillId);
    setTimeout(() => {
      const el = document.getElementById("categories-spotlight");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleAddSetToBag = (set: { id: string; name: string; price: number; image: string }) => {
    addItem({
      id: set.id,
      productId: set.id,
      name: set.name,
      price: set.price * 25000, // convert USD to approximate VND
      image: set.image,
      quantity: 1,
    });
    toast.success(`Đã thêm "${set.name}" vào giỏ hàng!`, {
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
    <div className="bg-transparent min-h-screen text-on-surface pb-20">
      
      {/* Top Banner Accent */}
      <div className="bg-surface-container-high text-primary border-b border-outline-variant/30 py-2.5 text-center text-xs tracking-wider font-medium">
        ✨ Complimentary Rose Quartz Gua Sha on orders over $75 • Free Concierge Consultation
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 relative">

        {/* Luminous Rose Quartz Ambient Bloom Aura (Matches Mockup top-right glow) */}
        <div className="pointer-events-none absolute -top-10 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#FFA6C9]/65 via-[#FFB8D2]/45 to-transparent blur-3xl -z-10" />
        <div className="pointer-events-none absolute top-40 -left-20 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-[#FFA6C9]/40 via-[#FFD0DE]/30 to-transparent blur-3xl -z-10" />

        {/* =========================================================================
            HERO HEADER & FILTER PILLS
        ========================================================================= */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-outline-variant/40 bg-surface text-primary text-[11px] font-bold uppercase tracking-widest mb-4 shadow-xs">
            <Sparkles className="h-3 w-3" /> Swiss Bio-Clinical Formulas
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight text-primary-text mb-4">
            Curated Formulations by Skin Need & Ritual
          </h1>
          <p className="text-secondary-text text-sm sm:text-base leading-relaxed">
            Explore our portfolio bio-active categories formulated in Geneva, Switzerland, designed to nourish, clarify, and illuminate from within.
          </p>

          {/* Filter Pills with Luxury Floating Shadows & Functional Click */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            {filterPills.map((pill) => {
              const isActive = activeFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => handleFilterClick(pill.id)}
                  className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-2 active:scale-95 cursor-pointer ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/25 font-bold scale-105 ring-2 ring-primary/30"
                      : "bg-white/95 backdrop-blur-md border border-white/80 text-secondary-text shadow-xs hover:shadow-md hover:border-primary/50 hover:text-primary hover:-translate-y-0.5"
                  }`}
                >
                  <span>{pill.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-black/5 text-text-secondary"}`}>
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Thanh thông báo bộ lọc đang chọn */}
        {activeFilter !== "all" && (
          <div className="mb-10 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-pink-100/80 shadow-sm animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Đang lọc theo bộ sưu tập: <strong className="text-primary font-bold">{filterPills.find(p => p.id === activeFilter)?.label}</strong></span>
            </div>
            <button
              onClick={() => setActiveFilter("all")}
              className="text-xs font-bold text-primary hover:text-secondary bg-primary/10 hover:bg-primary/20 px-3.5 py-1.5 rounded-full transition"
            >
              Hiện tất cả bộ sưu tập (5) ✕
            </button>
          </div>
        )}

        {/* =========================================================================
            REAL DATABASE MULTI-LEVEL CATEGORY TREE EXPLORER
        ========================================================================= */}
        {categoryTree.length > 0 && (
          <div className="mb-20 luxury-card rounded-3xl p-6 sm:p-10 shadow-card hover:shadow-xl transition-all duration-300">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-outline-variant/30">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary flex items-center gap-1.5 mb-1">
                  <FolderTree className="h-3.5 w-3.5" /> LIVE DATABASE TAXONOMY
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary-text tracking-tight">
                  Cây Danh Mục Đa Cấp (Category Tree)
                </h2>
                <p className="text-xs sm:text-sm text-secondary-text mt-1">
                  Dữ liệu danh mục thực tế từ cơ sở dữ liệu hệ thống Glow-Up Retail.
                </p>
              </div>

              {activeRootCategory && (
                <Link
                  href={`/shop?categoryId=${activeRootCategory.id}`}
                  className="inline-flex items-center justify-center rounded-full bg-surface-container-low border border-outline-variant/60 px-5 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-on-primary transition shadow-xs self-start sm:self-auto"
                >
                  Xem tất cả &quot;{activeRootCategory.name}&quot;
                </Link>
              )}
            </div>

            {/* Root Category Tabs */}
            <div className="flex flex-wrap gap-2.5 mb-8">
              {categoryTree.map((root) => {
                const isSelected = (selectedRootId || categoryTree[0]?.id) === root.id;
                return (
                  <button
                    key={root.id}
                    onClick={() => setSelectedRootId(root.id)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                      isSelected
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-low text-secondary-text hover:bg-surface hover:text-primary-text border border-outline-variant/40"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>{root.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-surface text-secondary-text"}`}>
                      {root.children?.length || 0} mục con
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Subcategories Grid with soft shadows */}
            {activeRootCategory && activeRootCategory.children && activeRootCategory.children.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {activeRootCategory.children.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/shop?categoryId=${sub.id}`}
                    className="group rounded-2xl border border-pink-100/70 bg-white/90 p-4 hover:bg-white hover:border-[#FFA6C9] shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-white mb-4 border border-nude/30">
                        <Image
                          src={sub.imageUrl || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600"}
                          alt={sub.name}
                          fill
                          className="object-cover group-hover:scale-105 transition duration-500"
                        />
                      </div>
                      <h3 className="text-sm font-bold text-text-primary group-hover:text-primary-rose transition-colors mb-1">
                        {sub.name}
                      </h3>
                      <p className="text-[11px] text-text-secondary">
                        Định danh: <span className="font-mono">{sub.slug}</span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-nude/30 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-medium text-text-secondary">Bộ sưu tập</span>
                      <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-[#FFE3ED] text-[#D23F72] group-hover:bg-[#D23F72] group-hover:text-white font-bold transition-all duration-200 shadow-2xs">
                        <span>Khám phá</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-text-secondary">
                Không có danh mục con nào trong nhóm này.
              </div>
            )}

          </div>
        )}

        {/* Loading state indicator for tree if initial fetch is pending */}
        {isLoadingTree && (
          <div className="mb-12 flex items-center justify-center gap-2 text-xs text-text-secondary py-6">
            <Loader2 className="h-4 w-4 animate-spin text-primary-rose" />
            Đang tải cây danh mục từ database...
          </div>
        )}


        {/* =========================================================================
            SECTION 1: EDITORIAL CATEGORIES SPOTLIGHT (DYNMIC FILTERING & FLOATING SHADOWS)
        ========================================================================= */}
        <div id="categories-spotlight" className="space-y-8 mb-24 scroll-mt-28">

          {/* Spotlight Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-outline-variant/30">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D23F72] flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5" /> EDITORIAL SPOTLIGHTS
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary-text tracking-tight">
                {activeFilter === "all" 
                  ? "Tất Cả 5 Bộ Sưu Tập Nổi Bật" 
                  : `Bộ Sưu Tập: ${spotlights.find(s => s.id === activeFilter)?.title}`}
              </h2>
            </div>
            {activeFilter !== "all" && (
              <button
                onClick={() => setActiveFilter("all")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-secondary self-start sm:self-auto bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-full transition"
              >
                ← Xem toàn bộ 5 bộ sưu tập
              </button>
            )}
          </div>

          {/* Trường hợp 1: Người dùng chọn 1 bộ sưu tập cụ thể -> Hiện Card toàn cảnh Full-Width */}
          {activeFilter !== "all" && (
            (() => {
              const item = spotlights.find(s => s.id === activeFilter);
              if (!item) return null;
              return (
                <div key={item.id} className="luxury-card rounded-3xl luxury-card-hover overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-in fade-in zoom-in-95 duration-300">
                  {/* Left Image Column */}
                  <div className="lg:col-span-7 relative min-h-[360px] sm:min-h-[440px] bg-background">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 left-4 z-10">
                      <span className="rounded-full bg-white/95 backdrop-blur-md px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#D23F72] border border-white/80 shadow-xs">
                        {item.badge}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                      <div className="flex items-center justify-between rounded-2xl bg-white/95 backdrop-blur-md px-4 py-2.5 text-xs text-text-primary border border-white/80 shadow-sm">
                        <span className="flex items-center gap-2 font-medium">
                          <Recycle className="h-4 w-4 text-emerald-600" />
                          {item.featureNote}
                        </span>
                        <Link 
                          href="/shop" 
                          className="hidden sm:inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-[#FFE3ED] hover:bg-[#D23F72] text-[#D23F72] hover:text-white text-xs font-bold transition-all shadow-2xs"
                        >
                          <span>Tìm hiểu thêm</span>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Right Text Column */}
                  <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between bg-white/80 backdrop-blur-sm">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
                        <span className="text-[#D23F72]">Category {item.num}</span>
                        <span>{item.stats}</span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-serif font-bold text-text-primary tracking-tight mb-4">
                        {item.title}
                      </h3>

                      <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-6 font-medium">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-8">
                        {item.tags.map((t) => (
                          <span key={t} className="rounded-full border border-pink-100/80 bg-white/90 px-3 py-1 text-[11px] font-semibold text-text-primary shadow-2xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-outline-variant/30">
                      <div>
                        <span className="text-[11px] font-semibold uppercase text-secondary-text block">Formulas from</span>
                        <span className="text-lg font-serif font-bold text-primary">{item.priceRange}</span>
                      </div>

                      <Link
                        href={item.shopUrl}
                        className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-xs font-bold text-on-primary shadow-md hover:bg-secondary transition active:scale-95"
                      >
                        Khám Phá Sản Phẩm
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* Trường hợp 2: activeFilter === 'all' -> Hiện toàn bộ 5 bộ sưu tập với đổ bóng sang trọng */}
          {activeFilter === "all" && (
            <>
              {/* SPOTLIGHT 01: Cellular Skincare & Bio-Peptides (Large 2-column Card) */}
              <div className="luxury-card rounded-3xl luxury-card-hover overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                {/* Left Image Column */}
                <div className="lg:col-span-7 relative min-h-[360px] sm:min-h-[440px] bg-background">
                  <Image
                    src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1200"
                    alt="Cellular Skincare & Bio-Peptides"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 left-4 z-10">
                    <span className="rounded-full bg-white/95 backdrop-blur-md px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#D23F72] border border-white/80 shadow-xs">
                      Category: Cellular Skincare
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    <div className="flex items-center justify-between rounded-2xl bg-white/95 backdrop-blur-md px-4 py-2.5 text-xs text-text-primary border border-white/80 shadow-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <Recycle className="h-4 w-4 text-emerald-600" />
                        Glass Bottle Recycling • Return 5 empty vessels for $15 store credit
                      </span>
                      <span className="hidden sm:inline font-bold text-[#D23F72]">Learn More ›</span>
                    </div>
                  </div>
                </div>

                {/* Right Text Column */}
                <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between bg-white/80 backdrop-blur-sm">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
                      <span className="text-[#D23F72]">Category 01</span>
                      <span>12 Active Formulations</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-text-primary tracking-tight mb-4">
                      Cellular Skincare & Bio-Peptides
                    </h2>

                    <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-6 font-medium">
                      Bio-mimetic oligopeptides paired with low-molecular hyaluronic matrices. Penetrating seven dermal strata to reactivate cellular vitality, diminish micro-grooves, and sculpt youthful density.
                    </p>

                    {/* Sub-formulation tags */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      {["Peptide Glaze Elixir", "Whipped Ceramide Cream", "Zinc Sunscreen SPF", "Eye Reset Gel"].map((t) => (
                        <span key={t} className="rounded-full border border-pink-100/80 bg-white/90 px-3 py-1 text-[11px] font-semibold text-text-primary shadow-2xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Price & Button */}
                  <div className="flex items-center justify-between pt-6 border-t border-outline-variant/30">
                    <div>
                      <span className="text-[11px] font-semibold uppercase text-secondary-text block">Formulas from</span>
                      <span className="text-lg font-serif font-bold text-primary">$48 — $135</span>
                    </div>

                    <Link
                      href="/shop"
                      className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-xs font-bold text-on-primary shadow-md hover:bg-secondary transition active:scale-95"
                    >
                      Explore Formulations
                    </Link>
                  </div>
                </div>
              </div>


              {/* ROW 2: Dewy Velvet Lip Care + Solar Barrier & Mineral SPF (2 Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Card 02: Dewy Velvet Lip Care */}
                <div className="luxury-card rounded-3xl luxury-card-hover overflow-hidden flex flex-col">
                  <div className="relative h-64 sm:h-72 w-full bg-surface-container-low overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=900"
                      alt="Dewy Velvet Lip Care"
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute top-4 left-4 z-10">
                      <span className="rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary border border-white/80 shadow-2xs">
                        For Botanic Archive
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-4 z-10">
                      <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white">
                        8 Shades Available
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 flex flex-col flex-1 bg-white/80 backdrop-blur-sm">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-secondary-text mb-2">
                      <span className="text-primary">Category 02</span>
                      <span>8 Shades Available</span>
                    </div>
                    <h3 className="text-xl font-serif font-bold text-primary-text mb-3">Dewy Velvet Lip Care</h3>
                    <p className="text-xs sm:text-sm text-secondary-text leading-relaxed mb-6 font-normal flex-1">
                      Infused with cold-pressed rosehip seed and volumetric plant peptides. Delivers continuous plumpness, mirror-sheen reflections, and zero stickiness.
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20 mt-auto">
                      <span className="text-xs font-semibold text-secondary-text">Plump • Hydration • Tint</span>
                      <Link 
                        href="/shop" 
                        className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold border border-primary/20 hover:border-transparent transition-all duration-200 shadow-2xs hover:shadow-sm active:scale-95"
                      >
                        <span>View Collection</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Card 03: Solar Barrier & Mineral SPF */}
                <div className="luxury-card rounded-3xl luxury-card-hover overflow-hidden flex flex-col">
                  <div className="relative h-64 sm:h-72 w-full bg-surface-container-low overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=900"
                      alt="Solar Barrier & Mineral SPF"
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute top-4 left-4 z-10">
                      <span className="rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary border border-white/80 shadow-2xs">
                        Clinic Formulas
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-4 z-10">
                      <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white">
                        SPF 50+ / PA++++
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 flex flex-col flex-1 bg-white/80 backdrop-blur-sm">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-secondary-text mb-2">
                      <span className="text-primary">Category 03</span>
                      <span>Available in 2 formats</span>
                    </div>
                    <h3 className="text-xl font-serif font-bold text-primary-text mb-3">Solar Barrier & Mineral SPF</h3>
                    <p className="text-xs sm:text-sm text-secondary-text leading-relaxed mb-6 font-normal flex-1">
                      Ultra-fine non-nano zinc fused with Swiss Alpine edelweiss extract. Shields against UVA/UVB rays, high-energy blue light, and urban pollution while leaving a satin water veil.
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20 mt-auto">
                      <span className="text-xs font-semibold text-secondary-text">Clean • Non-Nano • Glow</span>
                      <Link 
                        href="/shop" 
                        className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold border border-primary/20 hover:border-transparent transition-all duration-200 shadow-2xs hover:shadow-sm active:scale-95"
                      >
                        <span>View Collection</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>


              {/* ROW 3: Sensory Body & Luminizers + Holistic Tools & Crystal Sculpting (2 Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Card 04: Sensory Body & Luminizers */}
                <div className="luxury-card rounded-3xl luxury-card-hover overflow-hidden flex flex-col">
                  <div className="relative h-64 sm:h-72 w-full bg-surface-container-low overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=900"
                      alt="Sensory Body & Luminizers"
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute top-4 left-4 z-10">
                      <span className="rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary border border-white/80 shadow-2xs">
                        Cold-Pressed Botanical Oils
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 flex flex-col flex-1 bg-white/80 backdrop-blur-sm">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-secondary-text mb-2">
                      <span className="text-primary">Category 04</span>
                      <span>All-Day Radiance</span>
                    </div>
                    <h3 className="text-xl font-serif font-bold text-primary-text mb-3">Sensory Body & Luminizers</h3>
                    <p className="text-xs sm:text-sm text-secondary-text leading-relaxed mb-6 font-normal flex-1">
                      Transformative dry-oils, melting enzyme body butters, and golden sparkle shimmer mists that drench the skin in deep hydration and fragrant botanical essences.
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20 mt-auto">
                      <span className="text-xs font-semibold text-secondary-text">Gold Shimmer • Enzyme Polish</span>
                      <Link 
                        href="/shop" 
                        className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold border border-primary/20 hover:border-transparent transition-all duration-200 shadow-2xs hover:shadow-sm active:scale-95"
                      >
                        <span>View Collection</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Card 05: Holistic Tools & Crystal Sculpting */}
                <div className="luxury-card rounded-3xl luxury-card-hover overflow-hidden flex flex-col">
                  <div className="relative h-64 sm:h-72 w-full bg-surface-container-low overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=900"
                      alt="Holistic Tools & Crystal Sculpting"
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute top-4 left-4 z-10">
                      <span className="rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary border border-white/80 shadow-2xs">
                        High Vibrational Quartz
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-4 z-10">
                      <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white">
                        Complimentary Pouch
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 flex flex-col flex-1 bg-white/80 backdrop-blur-sm">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-secondary-text mb-2">
                      <span className="text-primary">Category 05</span>
                      <span>Lymphatic Sculpting</span>
                    </div>
                    <h3 className="text-xl font-serif font-bold text-primary-text mb-3">Holistic Tools & Crystal Sculpting</h3>
                    <p className="text-xs sm:text-sm text-secondary-text leading-relaxed mb-6 font-normal flex-1">
                      Hand-carved crystalline facial tools, cooling globes, and lymphatic-draining wands designed to boost micro-circulation, lift the jawline, and deepen serum absorption.
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20 mt-auto">
                      <span className="text-xs font-semibold text-secondary-text">Dual Oval • Ergonomically Hand-Rolled Glass</span>
                      <Link 
                        href="/shop" 
                        className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold border border-primary/20 hover:border-transparent transition-all duration-200 shadow-2xs hover:shadow-sm active:scale-95"
                      >
                        <span>View Collection</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* =========================================================================
          SECTION 2: SHOP BY SKIN CONCERN & OBJECTIVE (Full-width Blush Pink Band)
      ========================================================================= */}
      <section className="w-full bg-[#FAF0F3] border-y border-pink-100/70 py-20 mb-20 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D23F72] block mb-1">
                TAILORED PRESCRIPTIONS
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary-text tracking-tight">
                Shop by Skin Concern & Objective
              </h2>
              <p className="text-xs sm:text-sm text-secondary-text mt-1">
                Select your specific dermal focus to reveal precision Swiss botanical synergies.
              </p>
            </div>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#D23F72] to-[#FF8DAF] hover:from-[#bf2d60] hover:to-[#f07b9f] text-white px-6 py-2.5 text-xs font-bold shadow-sm hover:shadow-md transition-all self-start md:self-auto active:scale-95 group"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-200 group-hover:rotate-12 transition-transform" />
              <span>Take The 60-Sec Skin Analysis</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                id: "glass-skin",
                title: "Glass Skin & Barrier Restoration",
                desc: "Targeting micro-tears and reactive dryness via biomimetic ceramide and multi-peptide matrix and trehalose complex.",
                keyActives: "Bio-Peptides, Ceramides",
                formulations: "8 Formulations",
                icon: Droplet,
                shopUrl: "/shop?concern=glass-skin",
              },
              {
                id: "luminosity",
                title: "Luminosity & Pigment Correction",
                desc: "Fading hyperpigmentation, uneven post-blemish tone, and oxidative dullness with glutathione and botanicals.",
                keyActives: "Niacinamide, Snow Mushroom",
                formulations: "6 Formulations",
                icon: Sparkles,
                shopUrl: "/shop?concern=luminosity",
              },
              {
                id: "fine-lines",
                title: "Fine Lines & Nocturnal Regeneration",
                desc: "Encapsulated bio-retinols to stimulate collagen synthesis, reversing photo-aging and surface elasticity.",
                keyActives: "Bakuchiol, Edelweiss Cells",
                formulations: "7 Formulations",
                icon: Moon,
                shopUrl: "/shop?concern=fine-lines",
              },
              {
                id: "sensitive",
                title: "Ultra-Sensitive & Redness Relief",
                desc: "Calming rosacea-reactivity and sting factors using pure centella, fermented heart of oats, and green tea.",
                keyActives: "Centella Asiatica, Madecassoside",
                formulations: "5 Formulations",
                icon: ShieldCheck,
                shopUrl: "/shop?concern=sensitive",
              },
            ].map((concern) => {
              const isSelected = selectedConcern === concern.id;
              const IconComp = concern.icon;
              return (
                <div
                  key={concern.id}
                  onClick={() => setSelectedConcern(concern.id)}
                  className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer group ${
                    isSelected
                      ? "border-2 border-[#D23F72] bg-gradient-to-b from-white via-white to-[#FFF0F5] shadow-xl shadow-pink-200/50 -translate-y-2 ring-4 ring-[#FFA6C9]/25"
                      : "border border-pink-100/90 bg-white/95 hover:bg-white shadow-card hover:shadow-xl hover:border-[#FFA6C9] hover:-translate-y-1.5"
                  }`}
                >
                  {/* Top Active Indicator Badge */}
                  {isSelected && (
                    <span className="absolute -top-3 right-5 flex items-center gap-1 text-[11px] font-extrabold text-white bg-gradient-to-r from-[#D23F72] to-[#FFA6C9] px-3 py-1 rounded-full shadow-md animate-in fade-in zoom-in-95">
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      <span>Selected</span>
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
                        isSelected 
                          ? "bg-[#D23F72] text-white shadow-md shadow-pink-300" 
                          : "bg-[#FFE3ED] text-[#D23F72] group-hover:scale-105"
                      }`}>
                        <IconComp className="h-6 w-6" />
                      </div>
                      
                      {/* Formulations Count Badge */}
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-pink-50 text-[#D23F72] border border-pink-200/60 shadow-2xs">
                        {concern.formulations}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-text-primary mb-2 group-hover:text-[#D23F72] transition-colors leading-snug">
                      {concern.title}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed mb-4 font-normal">
                      {concern.desc}
                    </p>
                    <div className="text-[11px] font-semibold text-text-secondary">
                      Key Actives: <span className="text-text-primary font-bold">{concern.keyActives}</span>
                    </div>
                  </div>

                  {/* Action Button Area */}
                  <div className="pt-5 border-t border-pink-100/70 mt-6 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-medium text-text-secondary">
                      {isSelected ? "Đã áp dụng" : "Nhấp chọn"}
                    </span>
                    <Link
                      href={concern.shopUrl}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConcern(concern.id);
                      }}
                      className={`inline-flex items-center justify-center px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 shadow-xs hover:shadow-md active:scale-95 ${
                        isSelected
                          ? "bg-[#D23F72] text-white hover:bg-[#ba2f60] ring-2 ring-[#FFA6C9]/50"
                          : "bg-gradient-to-r from-[#D23F72] to-[#FF8DAF] hover:from-[#c22e62] hover:to-[#f07b9f] text-white group-hover:scale-105"
                      }`}
                    >
                      <span>{isSelected ? "Xem Sản Phẩm" : "Select"}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: CURATED ROUTINE SETS & DISCOVERY VAULTS
      ========================================================================= */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-24 text-center">
          <div className="max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D23F72] block mb-1">
              FULL RITUAL SYSTEMS
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary-text tracking-tight mb-2">
              Curated Routine Sets & Discovery Vaults
            </h2>
            <p className="text-xs sm:text-sm text-secondary-text">
              Harmonized combinations formulated to elevate daily routines with complementary bio-actives. Includes complimentary bespoke gift box.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Set 1 */}
            <div className="luxury-card rounded-3xl p-6 luxury-card-hover flex flex-col text-left group">
              <div 
                onClick={() => setLightboxIndex(0)}
                className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-background mb-5 cursor-zoom-in group/img"
                title="Nhấn để phóng to ảnh"
              >
                <Image
                  src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800"
                  alt="The 3-Step Glass Skin Foundation"
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="flex items-center gap-1.5 rounded-full bg-surface/95 text-primary-text px-3 py-1.5 text-xs font-bold shadow-md border border-white/60">
                    <ZoomIn className="h-3.5 w-3.5 text-primary" /> Phóng to ảnh
                  </span>
                </div>
                <span className="absolute top-3 left-3 rounded-full bg-[#D23F72] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white z-10 pointer-events-none">
                  Popular
                </span>
              </div>

              <h3 className="text-lg font-bold text-text-primary mb-2">The 3-Step Glass Skin Foundation</h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-6 flex-1 font-medium">
                Illuminating Cleanser (120ml), Glow Mist (100ml), and Whipped Ceramide Cream (50ml).
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30 mt-auto">
                <div>
                  <span className="text-[10px] text-secondary-text uppercase block font-semibold">Value $170</span>
                  <span className="text-xl font-serif font-bold text-primary">$138</span>
                </div>
                <button
                  onClick={() => handleAddSetToBag({
                    id: "set-glass-skin",
                    name: "The 3-Step Glass Skin Foundation",
                    price: 138,
                    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800"
                  })}
                  className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-sm hover:bg-secondary transition flex items-center gap-1.5 active:scale-95"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> ADD TO BAG
                </button>
              </div>
            </div>

            {/* Set 2 */}
            <div className="luxury-card rounded-3xl p-6 luxury-card-hover flex flex-col text-left group">
              <div 
                onClick={() => setLightboxIndex(1)}
                className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-container-low mb-5 cursor-zoom-in group/img"
                title="Nhấn để phóng to ảnh"
              >
                <Image
                  src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800"
                  alt="The Sunlit Body Radiance Duo"
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="flex items-center gap-1.5 rounded-full bg-surface/95 text-primary-text px-3 py-1.5 text-xs font-bold shadow-md border border-white/60">
                    <ZoomIn className="h-3.5 w-3.5 text-primary" /> Phóng to ảnh
                  </span>
                </div>
                <span className="absolute top-3 left-3 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-primary z-10 pointer-events-none">
                  Limited Edition
                </span>
              </div>

              <h3 className="text-lg font-serif font-bold text-primary-text mb-2">The Sunlit Body Radiance Duo</h3>
              <p className="text-xs text-secondary-text leading-relaxed mb-6 flex-1 font-normal">
                Glistening Shimmer Oil (100ml) paired with Rose Quartz Peptide Lip Glaze (15ml).
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30 mt-auto">
                <div>
                  <span className="text-[10px] text-secondary-text uppercase block font-semibold">Value $95</span>
                  <span className="text-xl font-serif font-bold text-primary">$78</span>
                </div>
                <button
                  onClick={() => handleAddSetToBag({
                    id: "set-sunlit-body",
                    name: "The Sunlit Body Radiance Duo",
                    price: 78,
                    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800"
                  })}
                  className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-sm hover:bg-secondary transition flex items-center gap-1.5 active:scale-95"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> ADD TO BAG
                </button>
              </div>
            </div>

            {/* Set 3 */}
            <div className="luxury-card rounded-3xl p-6 luxury-card-hover flex flex-col text-left group">
              <div 
                onClick={() => setLightboxIndex(2)}
                className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-container-low mb-5 cursor-zoom-in group/img"
                title="Nhấn để phóng to ảnh"
              >
                <Image
                  src="https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800"
                  alt="The Evening Cell-Repair Vault"
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="flex items-center gap-1.5 rounded-full bg-surface/95 text-primary-text px-3 py-1.5 text-xs font-bold shadow-md border border-white/60">
                    <ZoomIn className="h-3.5 w-3.5 text-primary" /> Phóng to ảnh
                  </span>
                </div>
                <span className="absolute top-3 left-3 rounded-full bg-black/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white z-10 pointer-events-none">
                  Gift Edition
                </span>
              </div>

              <h3 className="text-lg font-serif font-bold text-primary-text mb-2">The Evening Cell-Repair Vault</h3>
              <p className="text-xs text-secondary-text leading-relaxed mb-6 flex-1 font-normal">
                Swiss Bio-Retinol Concentrate (30ml), Overnight Barrier Elixir (50ml), and Silk Sleep Mask.
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30 mt-auto">
                <div>
                  <span className="text-[10px] text-secondary-text uppercase block font-semibold">Value $220</span>
                  <span className="text-xl font-serif font-bold text-primary">$175</span>
                </div>
                <button
                  onClick={() => handleAddSetToBag({
                    id: "set-cell-repair",
                    name: "The Evening Cell-Repair Vault",
                    price: 175,
                    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800"
                  })}
                  className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-sm hover:bg-secondary transition flex items-center gap-1.5 active:scale-95"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> ADD TO BAG
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM TRUST PILLARS BAR (Full-width Blush Pink Band)
      ========================================================================= */}
      <div className="w-full bg-[#FAF0F3] border-t border-pink-100/60 py-12 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE3ED] text-primary mb-3 shadow-2xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-text">Swiss-Formulated</h4>
            <p className="text-[11px] text-secondary-text mt-1">Clinically validated actives</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE3ED] text-primary mb-3 shadow-2xs">
              <Shield className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-text">100% UV Violet Glass</h4>
            <p className="text-[11px] text-secondary-text mt-1">Bio-photon active preservation</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE3ED] text-primary mb-3 shadow-2xs">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-text">Cruelty-Free Certified</h4>
            <p className="text-[11px] text-secondary-text mt-1">Cruelty-free recognized globally</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE3ED] text-primary mb-3 shadow-2xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-text">30-Day Radiant Guarantee</h4>
            <p className="text-[11px] text-secondary-text mt-1">Hassle-free complimentary returns</p>
          </div>
        </div>
      </div>

      {/* Fullscreen Set Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        images={CURATED_SETS}
        currentIndex={lightboxIndex ?? 0}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  );
}
