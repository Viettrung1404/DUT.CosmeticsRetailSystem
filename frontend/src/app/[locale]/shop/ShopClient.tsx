"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { 
  Sparkles, 
  Search, 
  SlidersHorizontal, 
  Heart, 
  ShoppingBag, 
  Plus, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Leaf, 
  ShieldCheck, 
  RotateCcw, 
  Truck, 
  LayoutGrid, 
  Grid3X3,
  Star
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useCurrency } from "@/hooks/useCurrency";
import toast from "react-hot-toast";
import DynamicProductCard from "@/components/DynamicProductCard";

export interface ShopProductItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryGroup: string; // "serums" | "creams" | "lips" | "body" | "mist" | "tools"
  brand: string;
  price: number;
  originalPrice?: number;
  unitPrice?: string;
  rating: number;
  reviews: number;
  badge?: string;
  subBadge?: string;
  description: string;
  tags?: string[];
  swatches?: string[];
  sizes?: string[];
  specialTag?: string; // e.g. "Texture: Plush Cashmere Cloud"
  image: string;
  images?: string[];
  gallery?: string[];
  inStock: boolean;
  skinConcerns: string[];
  keyIngredients: string[];
  isSwissFormulated?: boolean;
}

const SWISS_ARCHIVE_PRODUCTS: ShopProductItem[] = [
  {
    id: "glw-01",
    slug: "peptide-glaze-elixir",
    name: "Peptide Glaze Elixir",
    category: "Serums & Elixirs",
    categoryGroup: "serums",
    brand: "Glow-Up Atelier",
    price: 1350000,
    unitPrice: "45.000₫ / ml",
    rating: 4.9,
    reviews: 382,
    badge: "Bestseller NO. 1",
    subBadge: "Swiss Formulated",
    description: "Illuminating & firming cellular serum with bio-active peptides and Swiss glacier water.",
    sizes: ["30ml", "50ml"],
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
    inStock: true,
    skinConcerns: ["hydration", "firming", "barrier"],
    keyIngredients: ["multi-peptide", "snow-mushroom"],
    isSwissFormulated: true,
  },
  {
    id: "glw-02",
    slug: "dewy-velvet-lip-oil",
    name: "Dewy Velvet Lip Oil",
    category: "Lip Treatments",
    categoryGroup: "lips",
    brand: "Glow-Up Atelier",
    price: 700000,
    unitPrice: "7ml",
    rating: 4.8,
    reviews: 215,
    badge: "Gloss Sensation",
    description: "Non-sticky lip glaze infused with organic raspberry seed oil and volumetric peptides.",
    swatches: ["#D23F72", "#E88A9F", "#8B264E", "#F1A5A5"],
    specialTag: "4 shades",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800",
    inStock: true,
    skinConcerns: ["hydration"],
    keyIngredients: ["multi-peptide"],
    isSwissFormulated: true,
  },
  {
    id: "glw-03",
    slug: "cloud-ceramides-cream",
    name: "Cloud Ceramides Cream",
    category: "Moisturisers & Balms",
    categoryGroup: "creams",
    brand: "Glow-Up Atelier",
    price: 1150000,
    unitPrice: "50ml",
    rating: 5.0,
    reviews: 192,
    badge: "Nocturnal Repair",
    description: "Micro-whipped moisture cocoon with 5 bio-identical ceramides and alpine edelweiss.",
    specialTag: "Texture: Plush Cashmere Cloud",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
    inStock: true,
    skinConcerns: ["barrier", "deep-hydration", "sensitivity"],
    keyIngredients: ["ceramide", "niacinamide"],
    isSwissFormulated: true,
  },
  {
    id: "glw-04",
    slug: "soleil-glow-body-shimmer",
    name: "Soleil Glow Body Shimmer",
    category: "Body & Glow",
    categoryGroup: "body",
    brand: "Glow-Up Atelier",
    price: 1600000,
    unitPrice: "100ml",
    rating: 4.7,
    reviews: 284,
    badge: "Sunlit Ritual",
    description: "Fast-absorbing silk body nectar with crushed pearls and organic camellia flower oil.",
    specialTag: "Scent: Golden Yuzu & Tiare",
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800",
    inStock: true,
    skinConcerns: ["hydration", "deep-hydration"],
    keyIngredients: ["rose-quartz"],
    isSwissFormulated: true,
  },
  {
    id: "glw-05",
    slug: "rose-essence-clarifying-mist",
    name: "Rose Essence Clarifying Mist",
    category: "Cleansers & Toners",
    categoryGroup: "mist",
    brand: "Glow-Up Atelier",
    price: 950000,
    unitPrice: "120ml",
    rating: 4.9,
    reviews: 512,
    badge: "Morning & Night",
    description: "Hydro-sol botanical mist distilled from organic Damascene petals and probiotic yeast.",
    specialTag: "Micro-diffused spritz pump",
    image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&q=80&w=800",
    inStock: true,
    skinConcerns: ["hydration", "pores", "sensitivity"],
    keyIngredients: ["rose-quartz", "niacinamide"],
    isSwissFormulated: true,
  },
  {
    id: "glw-06",
    slug: "luminous-silk-mineral-spf-50",
    name: "Luminous Silk Mineral SPF 50",
    category: "Moisturisers & Balms",
    categoryGroup: "creams",
    brand: "Glow-Up Atelier",
    price: 1050000,
    unitPrice: "50ml",
    rating: 4.9,
    reviews: 344,
    badge: "Invisible Finish",
    description: "Non-nano zinc oxide fluid infused with edelweiss and alpine kelp for broad protection.",
    specialTag: "Finish: Weightless Satin Velvet",
    image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&q=80&w=800",
    inStock: true,
    skinConcerns: ["barrier", "sensitivity"],
    keyIngredients: ["ceramide"],
    isSwissFormulated: true,
  },
  {
    id: "glw-07",
    slug: "swiss-bio-retinol-night-nectar",
    name: "Swiss Bio-Retinol Night Nectar",
    category: "Serums & Elixirs",
    categoryGroup: "serums",
    brand: "Glow-Up Atelier",
    price: 1700000,
    unitPrice: "30ml",
    rating: 4.9,
    reviews: 364,
    badge: "Clinical Grade",
    description: "Revitalizing overnight botanical elixir with Swiss alpine bakuchiol and plant sterols.",
    sizes: ["30ml"],
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
    inStock: true,
    skinConcerns: ["firming", "pores"],
    keyIngredients: ["multi-peptide", "niacinamide"],
    isSwissFormulated: true,
  },
  {
    id: "glw-08",
    slug: "botanical-enzyme-melt-balm",
    name: "Botanical Enzyme Melt Balm",
    category: "Cleansers & Toners",
    categoryGroup: "creams",
    brand: "Glow-Up Atelier",
    price: 900000,
    unitPrice: "75g",
    rating: 4.7,
    reviews: 124,
    badge: "Antioxidant Boost",
    description: "Transformative cleansing balm with papaya enzymes that dissolves impurities instantly.",
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800",
    inStock: true,
    skinConcerns: ["pores", "deep-hydration"],
    keyIngredients: ["snow-mushroom"],
    isSwissFormulated: true,
  },
  {
    id: "glw-09",
    slug: "rose-quartz-gua-sha",
    name: "Rose Quartz Gua Sha",
    category: "Body & Glow",
    categoryGroup: "tools",
    brand: "Glow-Up Atelier",
    price: 800000,
    unitPrice: "100% gemstone crystal",
    rating: 4.9,
    reviews: 465,
    badge: "Artisan Carved",
    description: "Hand-carved Brazilian rose quartz sculpted to release lymphatic fluid and tension.",
    image: "https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=800",
    inStock: true,
    skinConcerns: ["firming"],
    keyIngredients: ["rose-quartz"],
    isSwissFormulated: false,
  },
];

interface ShopClientProps {
  initialBackendProducts?: any[];
  initialSearch?: string;
}

export default function ShopClient({ initialBackendProducts = [], initialSearch = "" }: ShopClientProps) {
  const { addItem } = useCartStore();
  const { formatPrice } = useCurrency();

  // Combine backend products with Swiss luxury catalog
  const allProducts: ShopProductItem[] = useMemo(() => {
    const formattedBackend: ShopProductItem[] = initialBackendProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category || "Serums & Elixirs",
      categoryGroup: p.categorySlug?.includes("son") || p.categorySlug?.includes("lip") ? "lips" : "serums",
      brand: p.brand || "Glow-Up",
      price: typeof p.price === "number" ? (p.price < 1000 ? p.price * 25000 : p.price) : 850000,
      unitPrice: "Standard",
      rating: p.rating || 4.9,
      reviews: p.reviews || 88,
      badge: p.badge || "Featured",
      subBadge: "Verified",
      description: p.description || p.shortDescription || "Formula from GlowUp Atelier.",
      image: p.gallery?.[0] || p.primaryImage || "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800",
      inStock: true,
      skinConcerns: ["hydration"],
      keyIngredients: ["multi-peptide"],
      isSwissFormulated: true,
    }));

    // Put Swiss Archive first to 100% match design, then append backend products if any
    const existingSlugs = new Set(SWISS_ARCHIVE_PRODUCTS.map((p) => p.slug));
    const nonDuplicatedBackend = formattedBackend.filter((p) => !existingSlugs.has(p.slug));
    return [...SWISS_ARCHIVE_PRODUCTS, ...nonDuplicatedBackend];
  }, [initialBackendProducts]);

  // States
  const [searchKeyword, setSearchKeyword] = useState(initialSearch);

  // Sync if URL initialSearch changes
  useEffect(() => {
    if (initialSearch) {
      setSearchKeyword(initialSearch);
    }
  }, [initialSearch]);
  const [activeRitualFilter, setActiveRitualFilter] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>(["hydration"]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState<number>(3000000);
  const [priceMin, setPriceMin] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [isSwissOnly, setIsSwissOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>("bestsellers");
  const [viewCols, setViewCols] = useState<3 | 2>(3);
  const [visibleCount, setVisibleCount] = useState<number>(9);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set(["glw-01"]));

  // Mobile sidebar filter toggle
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Accordion toggle states
  const [openCatAccordion, setOpenCatAccordion] = useState(true);
  const [openConcernAccordion, setOpenConcernAccordion] = useState(true);
  const [openIngAccordion, setOpenIngAccordion] = useState(true);

  // Top Filter Pills list matching screenshot
  const ritualPills = [
    { id: "all", label: `All Rituals (${allProducts.length})` },
    { id: "serums", label: "Serums & Elixirs (14)" },
    { id: "creams", label: "Barrier Creams (9)" },
    { id: "lips", label: "Lip Gloss (6)" },
    { id: "body", label: "Body & Bath (8)" },
    { id: "mist", label: "Hydration Mist (5)" },
    { id: "winners", label: "Award Winners (6)" },
  ];

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // 1. Top ritual pill
      if (activeRitualFilter === "serums" && product.categoryGroup !== "serums") return false;
      if (activeRitualFilter === "creams" && product.categoryGroup !== "creams") return false;
      if (activeRitualFilter === "lips" && product.categoryGroup !== "lips") return false;
      if (activeRitualFilter === "body" && product.categoryGroup !== "body") return false;
      if (activeRitualFilter === "mist" && product.categoryGroup !== "mist") return false;
      if (activeRitualFilter === "winners" && product.rating < 4.9) return false;

      // 2. Search keyword
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesDesc = product.description.toLowerCase().includes(q);
        const matchesCat = product.category.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      // 3. Category sidebar checkboxes
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(product.category)) return false;
      }

      // 4. Skin Concerns chips
      if (selectedConcerns.length > 0) {
        const hasConcern = selectedConcerns.some((c) => product.skinConcerns.includes(c));
        if (!hasConcern) return false;
      }

      // 5. Key Ingredients
      if (selectedIngredients.length > 0) {
        const hasIngredient = selectedIngredients.some((ing) => product.keyIngredients.includes(ing));
        if (!hasIngredient) return false;
      }

      // 6. Price range
      if (product.price < priceMin || product.price > priceMax) return false;

      // 7. In stock only
      if (inStockOnly && !product.inStock) return false;

      // 8. Swiss only
      if (isSwissOnly && !product.isSwissFormulated) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "newest") return b.reviews - a.reviews;
      return b.reviews - a.reviews; // bestsellers default
    });
  }, [
    allProducts, 
    activeRitualFilter, 
    searchKeyword, 
    selectedCategories, 
    selectedConcerns, 
    selectedIngredients, 
    priceMin, 
    priceMax, 
    inStockOnly, 
    isSwissOnly, 
    sortBy
  ]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  const handleToggleWishlist = (id: string, name: string) => {
    const next = new Set(wishlist);
    if (next.has(id)) {
      next.delete(id);
      toast.success(`Đã bỏ "${name}" khỏi yêu thích`);
    } else {
      next.add(id);
      toast.success(`Đã thêm "${name}" vào danh sách yêu thích!`, {
        icon: "💖",
      });
    }
    setWishlist(next);
  };

  const handleQuickAdd = (p: ShopProductItem) => {
    addItem({
      id: p.id,
      productId: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      quantity: 1,
    });
    toast.success(`Đã thêm "${p.name}" vào giỏ hàng!`, {
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

  const clearAllFilters = () => {
    setSearchKeyword("");
    setActiveRitualFilter("all");
    setSelectedCategories([]);
    setSelectedConcerns([]);
    setSelectedIngredients([]);
    setPriceMin(0);
    setPriceMax(3000000);
    setInStockOnly(false);
    setIsSwissOnly(false);
  };

  const activeFiltersCount = 
    (searchKeyword ? 1 : 0) +
    selectedCategories.length +
    selectedConcerns.length +
    selectedIngredients.length +
    (inStockOnly ? 1 : 0) +
    (isSwissOnly ? 1 : 0) +
    (priceMax < 3000000 || priceMin > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-transparent text-text-primary pb-24 font-sans">
      
      {/* 1. TOP NOTICE BANNER ACCENT */}
      <div className="bg-[#FAF3F5] border-b border-nude/40 py-2.5 text-center text-xs tracking-wider text-text-secondary font-medium">
        ✨ Complimentary Rose Quartz Gua Sha & 2 Deluxe Minis on orders over 1.500.000₫ • Explore Tasting Radiance
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* 2. BREADCRUMBS */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
          <Link href="/" className="hover:text-primary-rose transition-colors">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-primary-rose transition-colors">Shop All</Link>
          <span>/</span>
          <span className="text-text-primary">The Radiance Archive</span>
        </div>

        {/* 3. HERO HEADER */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-primary-rose/40 bg-white/80 text-[#D23F72] text-[11px] font-bold uppercase tracking-widest mb-3 shadow-2xs">
              <Sparkles className="h-3 w-3" /> CURATED CLEAN FORMULAS
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text-primary mb-3">
              The Complete Radiance Archive
            </h1>
            <p className="text-text-secondary text-xs sm:text-sm max-w-2xl leading-relaxed font-medium">
              Biomimetic botanical serums, whipped barrier creams, and dewy lip elixirs engineered in our Swiss botanical lab for cellular harmony and luminous glass skin.
            </p>
          </div>

          {/* Right Hero Badge Card */}
          <div className="rounded-2xl border border-nude/50 bg-white px-5 py-3.5 shadow-xs flex items-center gap-3.5 self-stretch sm:self-auto">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFE3ED] text-[#D23F72]">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-text-primary uppercase tracking-wider">100% Bio-Active</div>
              <div className="text-[11px] text-text-secondary">Cold-pressed botanical actives</div>
            </div>
          </div>
        </div>

        {/* 4. HORIZONTAL RITUAL FILTER PILLS */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {ritualPills.map((pill) => {
            const isActive = activeRitualFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActiveRitualFilter(pill.id)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-2xs ${
                  isActive
                    ? "bg-primary text-on-primary shadow-md"
                    : "bg-white border border-nude/60 text-text-secondary hover:border-primary-rose hover:text-text-primary"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* 5. TOOLBAR: Results count, active filter tags, sort, and layout */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 mb-8 border-b border-nude/40">
          
          {/* Left: Count & Active tags */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-text-primary uppercase tracking-wider mr-2">
              Showing {filteredProducts.length} Formulas
            </span>

            {inStockOnly && (
              <button 
                onClick={() => setInStockOnly(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-nude/60 text-[11px] font-semibold text-text-primary hover:border-primary-rose"
              >
                In Stock <X className="h-3 w-3 text-text-secondary" />
              </button>
            )}

            {isSwissOnly && (
              <button 
                onClick={() => setIsSwissOnly(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-nude/60 text-[11px] font-semibold text-text-primary hover:border-primary-rose"
              >
                Swiss Formulated <X className="h-3 w-3 text-text-secondary" />
              </button>
            )}

            {priceMax < 3000000 && (
              <button 
                onClick={() => setPriceMax(3000000)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-nude/60 text-[11px] font-semibold text-text-primary hover:border-primary-rose"
              >
                Dưới {formatPrice(priceMax)} <X className="h-3 w-3 text-text-secondary" />
              </button>
            )}

            {activeFiltersCount > 0 && (
              <button 
                onClick={clearAllFilters}
                className="text-[11px] font-bold text-[#D23F72] hover:underline ml-1"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Right: Sort & Layout */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            
            {/* Mobile Filter Drawer Button */}
            <button 
              onClick={() => setIsMobileFilterOpen(true)}
              className="md:hidden flex items-center gap-1.5 rounded-full border border-nude/60 bg-white px-4 py-2 text-xs font-bold text-text-primary"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Bộ lọc ({activeFiltersCount})
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-secondary hidden sm:inline">Sort by:</span>
              <div className="relative">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-full border border-nude/60 bg-white px-4 py-2 pr-8 text-xs font-bold text-text-primary focus:outline-none focus:border-primary-rose appearance-none cursor-pointer shadow-2xs"
                >
                  <option value="bestsellers">Best Sellers</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest Rituals</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Grid layout switcher */}
            <div className="hidden sm:flex items-center gap-1 rounded-full border border-nude/60 bg-white p-1 shadow-2xs">
              <button 
                onClick={() => setViewCols(3)}
                className={`p-1.5 rounded-full transition ${viewCols === 3 ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary"}`}
                title="3 Columns"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewCols(2)}
                className={`p-1.5 rounded-full transition ${viewCols === 2 ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary"}`}
                title="2 Columns"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>


        {/* =========================================================================
            MAIN 2-COLUMN SECTION: SIDEBAR (Refine Rituals) + PRODUCT GRID
        ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* 6. SIDEBAR: Refine Rituals */}
          <aside className="hidden lg:block lg:col-span-3 luxury-card rounded-3xl p-6 shadow-card sticky top-24">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-nude/40 mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#D23F72]" /> Refine Rituals
              </h2>
              {activeFiltersCount > 0 && (
                <button onClick={clearAllFilters} className="text-xs text-text-secondary hover:text-primary-rose">
                  Clear All
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative mb-6">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search formulas, actives..."
                className="w-full rounded-2xl border border-nude/60 bg-[#FCF8F9] px-3.5 py-2 pl-9 text-xs text-text-primary placeholder:text-text-secondary focus:bg-white focus:border-primary-rose focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
              {searchKeyword && (
                <button onClick={() => setSearchKeyword("")} className="absolute right-2.5 top-2.5 text-text-secondary">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Accordion 1: Category */}
            <div className="border-b border-nude/40 pb-5 mb-5">
              <button 
                onClick={() => setOpenCatAccordion(!openCatAccordion)}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-primary mb-3"
              >
                <span>Category</span>
                {openCatAccordion ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {openCatAccordion && (
                <div className="space-y-2.5 pt-1">
                  {[
                    { name: "Serums & Elixirs", count: 14 },
                    { name: "Moisturisers & Balms", count: 9 },
                    { name: "Cleansers & Toners", count: 7 },
                    { name: "Lip Treatments", count: 6 },
                    { name: "Body & Glow", count: 8 },
                  ].map((cat) => {
                    const isChecked = selectedCategories.includes(cat.name);
                    return (
                      <label key={cat.name} className="flex items-center justify-between text-xs text-text-secondary hover:text-text-primary cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedCategories((prev) => 
                                isChecked ? prev.filter((c) => c !== cat.name) : [...prev, cat.name]
                              );
                            }}
                            className="rounded border-nude/80 text-primary focus:ring-0 focus:ring-offset-0 h-4 w-4 accent-primary"
                          />
                          <span className={isChecked ? "font-bold text-text-primary" : ""}>{cat.name}</span>
                        </div>
                        <span className="text-[11px] text-text-secondary/70">{cat.count}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Accordion 2: Skin Concern Chips */}
            <div className="border-b border-nude/40 pb-5 mb-5">
              <button 
                onClick={() => setOpenConcernAccordion(!openConcernAccordion)}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-primary mb-3"
              >
                <span>Skin Concern</span>
                {openConcernAccordion ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {openConcernAccordion && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { id: "hydration", label: "Hydration / Dewiness" },
                    { id: "barrier", label: "Barrier Repair" },
                    { id: "firming", label: "Fine Lines & Firming" },
                    { id: "deep-hydration", label: "Deep Hydration" },
                    { id: "sensitivity", label: "Redness & Sensitivity" },
                    { id: "pores", label: "Pores & Texture" },
                  ].map((concern) => {
                    const isSelected = selectedConcerns.includes(concern.id);
                    return (
                      <button
                        key={concern.id}
                        onClick={() => {
                          setSelectedConcerns((prev) => 
                            isSelected ? prev.filter((c) => c !== concern.id) : [...prev, concern.id]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
                          isSelected
                            ? "bg-[#FFE3ED] text-[#D23F72] border border-[#FFA6C9]"
                            : "bg-[#FCF8F9] text-text-secondary hover:text-text-primary border border-nude/50"
                        }`}
                      >
                        {concern.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Accordion 3: Key Ingredients */}
            <div className="border-b border-nude/40 pb-5 mb-5">
              <button 
                onClick={() => setOpenIngAccordion(!openIngAccordion)}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-primary mb-3"
              >
                <span>Key Ingredients</span>
                {openIngAccordion ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {openIngAccordion && (
                <div className="space-y-2.5 pt-1">
                  {[
                    { id: "multi-peptide", label: "Multi-Peptide Matrix" },
                    { id: "snow-mushroom", label: "Snow Mushroom Hyaluronic" },
                    { id: "niacinamide", label: "Niacinamide 5%" },
                    { id: "rose-quartz", label: "Bio-Fermented Rose Quartz" },
                    { id: "ceramide", label: "Ceramide Complex 1-3-6" },
                  ].map((ing) => {
                    const isChecked = selectedIngredients.includes(ing.id);
                    return (
                      <label key={ing.id} className="flex items-center gap-2.5 text-xs text-text-secondary hover:text-text-primary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedIngredients((prev) => 
                              isChecked ? prev.filter((i) => i !== ing.id) : [...prev, ing.id]
                            );
                          }}
                          className="rounded border-nude/80 text-primary h-4 w-4 accent-primary"
                        />
                        <span className={isChecked ? "font-bold text-text-primary" : ""}>{ing.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Price Range Slider */}
            <div className="border-b border-nude/40 pb-5 mb-5">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-primary mb-3">
                <span>Khoảng giá</span>
                <span className="text-[11px] text-primary font-serif font-extrabold">{formatPrice(priceMin)} — {formatPrice(priceMax)}</span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 rounded-xl border border-nude/60 bg-[#FCF8F9] px-3 py-1.5 text-xs text-text-secondary text-center">
                  <span className="font-bold text-text-primary">{formatPrice(priceMin)}</span>
                </div>
                <span className="text-text-secondary">—</span>
                <div className="flex-1 rounded-xl border border-nude/60 bg-[#FCF8F9] px-3 py-1.5 text-xs text-text-secondary text-center">
                  <span className="font-bold text-text-primary">{formatPrice(priceMax)}</span>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={3000000}
                step={50000}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-primary h-1.5 bg-nude/50 rounded-lg cursor-pointer"
              />
            </div>

            {/* Formulation Clean Standards */}
            <div className="border-b border-nude/40 pb-5 mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-3">
                Formulation Clean Standard
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: "100% Vegan & Leaping Bunny", defaultChecked: true },
                  { label: "Swiss Clean Bio-Actives", defaultChecked: true },
                  { label: "Fragrance-Free / Essential Oil Free", defaultChecked: false },
                  { label: "100% UV Violet Glass Bottled", defaultChecked: false },
                ].map((std, idx) => (
                  <label key={idx} className="flex items-center gap-2.5 text-xs text-text-secondary hover:text-text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={std.defaultChecked}
                      className="rounded border-nude/80 text-primary h-4 w-4 accent-primary"
                    />
                    <span>{std.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* In Stock Only Switch */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-text-primary">In Stock Only</span>
              <button
                type="button"
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  inStockOnly ? "bg-primary" : "bg-nude"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    inStockOnly ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

          </aside>


          {/* 7. RIGHT PRODUCT GRID */}
          <main className="lg:col-span-9">
            
            {displayedProducts.length > 0 ? (
              <div className="space-y-12">
                
                {/* FIRST 6 PRODUCTS (Rows 1 & 2) */}
                <div className={`grid gap-6 ${viewCols === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                  {displayedProducts.slice(0, 6).map((product) => renderProductCard(product))}
                </div>

                {/* 8. MIDDLE CALLOUT BANNER: BESPOKE SKINCARE CONSULTATION */}
                {displayedProducts.length >= 6 && (
                  <div className="luxury-card rounded-3xl p-8 sm:p-10 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-xl">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary block mb-2">
                        BESPOKE SKINCARE CONSULTATION
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-serif font-bold text-primary tracking-tight mb-2">
                        Not sure what your skin barrier craves?
                      </h3>
                      <p className="text-xs sm:text-sm text-secondary-text leading-relaxed">
                        Take our 60-second diagnostic ritual formulated by Swiss aesthetic clinicians to pinpoint your customized micro-nutrient regime and glass skin protocol.
                      </p>
                    </div>

                    <Link
                      href="/account"
                      className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-xs font-bold text-on-primary shadow-sm hover:bg-secondary transition self-start md:self-auto whitespace-nowrap active:scale-95"
                    >
                      Take Skin Quiz
                    </Link>
                  </div>
                )}

                {/* ROW 3 PRODUCTS (Cards 7, 8, 9) */}
                {displayedProducts.length > 6 && (
                  <div className={`grid gap-6 ${viewCols === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                    {displayedProducts.slice(6, 9).map((product) => renderProductCard(product))}
                  </div>
                )}

                {/* Additional products if loaded */}
                {displayedProducts.length > 9 && (
                  <div className={`grid gap-6 ${viewCols === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                    {displayedProducts.slice(9).map((product) => renderProductCard(product))}
                  </div>
                )}

                {/* 9. BOTTOM PROGRESS & LOAD MORE */}
                <div className="pt-8 text-center flex flex-col items-center">
                  <span className="text-xs font-bold text-secondary-text uppercase tracking-wider mb-3">
                    Showing {Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length} luxury rituals
                  </span>

                  {/* Progress Bar */}
                  <div className="w-64 h-1 bg-outline-variant/30 rounded-full overflow-hidden mb-6">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (visibleCount / filteredProducts.length) * 100)}%` }}
                    />
                  </div>

                  {visibleCount < filteredProducts.length && (
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 6)}
                      className="rounded-full border border-primary px-8 py-3 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-on-primary transition shadow-xs active:scale-95"
                    >
                      Load More Rituals
                    </button>
                  )}
                </div>

              </div>
            ) : (
              <div className="rounded-3xl border border-outline-variant/40 bg-surface p-16 text-center shadow-xs">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-high text-primary mx-auto mb-4">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-serif font-bold text-primary-text mb-2">Không tìm thấy công thức nào phù hợp</h3>
                <p className="text-xs text-secondary-text max-w-md mx-auto mb-6">
                  Hãy thử điều chỉnh khoảng giá, bỏ bớt các bộ lọc hoạt chất hoặc nhấn xoá tất cả bộ lọc bên dưới.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-on-primary hover:bg-secondary transition active:scale-95"
                >
                  Xoá tất cả bộ lọc
                </button>
              </div>
            )}

          </main>

        </div>


        {/* =========================================================================
            10. BOTTOM TRUST PILLARS BAR
        ========================================================================= */}
        <div className="border-t border-outline-variant/30 mt-20 pt-10 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-primary mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">Swiss-Formulated</h4>
            <p className="text-[11px] text-on-surface-variant mt-1">Dual-bio-fermentation actives</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-primary mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">100% UV Violet Glass</h4>
            <p className="text-[11px] text-on-surface-variant mt-1">Protects bio-molecular potency</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-primary mb-3">
              <RotateCcw className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">30-Day Guarantee</h4>
            <p className="text-[11px] text-on-surface-variant mt-1">Consider it an invitation to return</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-primary mb-3">
              <Truck className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">Zero-Carbon Shipping</h4>
            <p className="text-[11px] text-on-surface-variant mt-1">100% climate-neutral delivery</p>
          </div>
        </div>

      </div>
    </div>
  );

  // Helper render for single luxury product card with dynamic interactions
  function renderProductCard(product: ShopProductItem) {
    // Map variants từ sizes hoặc swatches
    const dynamicVariants = product.sizes && product.sizes.length > 0
      ? product.sizes.map((s, idx) => ({
          name: s,
          priceMultiplier: idx === 0 ? 1 : idx === 1 ? 1.4 : 2,
        }))
      : product.swatches && product.swatches.length > 0
      ? [
          { name: "Shade 01", priceMultiplier: 1 },
          { name: "Shade 02", priceMultiplier: 1 },
          { name: "Shade 03", priceMultiplier: 1 },
        ]
      : [{ name: "Standard", priceMultiplier: 1 }];

    return (
      <DynamicProductCard
        key={product.id}
        id={product.id}
        slug={product.slug}
        name={product.name}
        price={product.price}
        originalPrice={product.originalPrice ? product.originalPrice : Math.round(product.price * 1.2)}
        image={product.image}
        images={product.images || product.gallery}
        badge={product.badge || (product.isSwissFormulated ? "Swiss Bio-Active" : undefined)}
        category={product.category}
        rating={product.rating}
        reviews={product.reviews}
        description={product.description}
        variants={dynamicVariants}
      />
    );
  }
}
