"use client";

import { Link, usePathname, useRouter } from "@/i18n/routing";
import Image from "next/image";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { productsApi, ProductSuggestion } from "@/lib/api";
import { Search, ShoppingBag, Heart, User, X, Loader2, Menu, ChevronDown } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import CartSlideOut from "./CartSlideOut";
import LanguageSwitcher from "./LanguageSwitcher";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

export default function Header() {
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { getTotalItems, openDrawer } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NAV_ITEMS = [
    { label: tNav("shop"), href: "/shop" },
    { label: tNav("categories"), href: "/categories" },
    { label: tNav("science"), href: "/our-science" },
    { label: tNav("blog"), href: "/blog" },
    { label: tNav("offers"), href: "/offers" },
    { label: tNav("stores"), href: "/stores" },
  ];

  // Auto close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
  }, [pathname]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Desktop Navigation sliding indicator & hover pill state
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [lineStyle, setLineStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // Cắt bỏ tiền tố locale (ví dụ /vi hoặc /en) trước khi so sánh chuỗi
  const cleanPathname = (pathname || "")
    .replace(/^\/(vi|en)(\/|$)/, "/$2")
    .replace(/^\/\/+/, "/") || "/";

  const activeItem = NAV_ITEMS.find(
    (item) => cleanPathname === item.href || (item.href !== "/" && cleanPathname.startsWith(item.href))
  );
  const activeHref = activeItem?.href;

  // Cập nhật vị trí thanh gạch chân khi đường dẫn hoặc resize thay đổi
  useEffect(() => {
    const updatePosition = () => {
      const targetHref = hoveredHref || activeHref;
      if (targetHref && itemRefs.current[targetHref]) {
        const el = itemRefs.current[targetHref];
        if (el) {
          setLineStyle({
            left: el.offsetLeft,
            width: el.offsetWidth,
            opacity: 1,
          });
        }
      } else {
        setLineStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    // Timeout ngắn để đảm bảo font và layout đã render kích thước chính xác
    const timer = setTimeout(updatePosition, 30);
    window.addEventListener("resize", updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
    };
  }, [hoveredHref, activeHref, pathname, mounted]);

  const handleMouseEnterNav = (href: string) => {
    setHoveredHref(href);
    const el = itemRefs.current[href];
    if (el) {
      setLineStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
        opacity: 1,
      });
      setPillStyle({
        left: el.offsetLeft - 8,
        width: el.offsetWidth + 16,
        opacity: 1,
      });
    }
  };

  const handleMouseLeaveNav = () => {
    setHoveredHref(null);
    setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    if (activeHref && itemRefs.current[activeHref]) {
      const el = itemRefs.current[activeHref];
      if (el) {
        setLineStyle({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1,
        });
      }
    } else {
      setLineStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  };

  const handleLogout = () => {
    logout();
    setIsAccountMenuOpen(false);
    toast.success("Đã đăng xuất");
    router.push("/login");
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounced search suggestion API call
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await productsApi.suggestProducts(searchQuery.trim(), 6);
        if (res && Array.isArray(res.data)) {
          setSuggestions(res.data);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Failed to fetch product suggestions:", err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
    router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSelectProduct = (slug: string) => {
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
    setSearchQuery("");
    router.push(`/product/${slug}`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-nude/40 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        
        {/* 1. LEFT ZONE: Brand Logo */}
        <div className="flex items-center flex-shrink-0 mr-4 lg:mr-8 xl:mr-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-rose text-lg font-bold text-white shadow-xs group-hover:scale-105 transition-transform duration-300">
              G
            </div>
            <span className="text-xl font-bold tracking-tight text-text-primary font-serif">Glow-Up</span>
          </Link>
        </div>

        {/* 2. CENTER ZONE: Desktop Nav with Smooth Gliding Indicator & Hover Capsule */}
        <nav 
          onMouseLeave={handleMouseLeaveNav}
          className="relative hidden items-center gap-5 xl:gap-7 text-[13px] font-medium lg:flex py-1 select-none flex-shrink-0"
        >
          {/* Silky Hover Capsule (Bóng mờ lướt nhẹ phía sau khi hover) */}
          <div
            className="pointer-events-none absolute -top-1 -bottom-1 rounded-full bg-primary-rose/8"
            style={{
              left: `${pillStyle.left}px`,
              width: `${pillStyle.width}px`,
              opacity: pillStyle.opacity,
              transition: "left 320ms cubic-bezier(0.16, 1, 0.3, 1), width 320ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease",
            }}
          />

          {/* Sliding Underline Indicator (Thanh gạch chân lướt mượt mà như nam châm theo vị trí tab) */}
          <div
            className="pointer-events-none absolute -bottom-1 h-[2.5px] rounded-full bg-gradient-to-r from-primary-rose via-[#FFA6C9] to-primary-rose shadow-[0_2px_8px_rgba(222,93,131,0.5)]"
            style={{
              left: `${lineStyle.left}px`,
              width: `${lineStyle.width}px`,
              opacity: lineStyle.opacity,
              transition: "left 320ms cubic-bezier(0.16, 1, 0.3, 1), width 320ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease",
            }}
          />

          {NAV_ITEMS.map((item) => {
            const isActive = cleanPathname === item.href || (item.href !== "/" && cleanPathname.startsWith(item.href));
            const isHovered = hoveredHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={(el) => {
                  itemRefs.current[item.href] = el;
                }}
                onMouseEnter={() => handleMouseEnterNav(item.href)}
                className={`relative py-1 px-1 whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? "font-bold text-primary-rose"
                    : isHovered
                    ? "text-primary-rose font-medium"
                    : "text-text-secondary hover:text-primary-rose"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 3. RIGHT ZONE: Search, Utilities & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 text-text-primary ml-auto lg:ml-6">
          
          {/* Group A: Desktop Search Input */}
          <div ref={searchContainerRef} className="relative hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsSearchOpen(false);
                }}
                placeholder="Search rituals, formulas..."
                className="w-36 lg:w-44 xl:w-52 focus-within:w-60 focus:w-60 transition-all duration-300 rounded-full border border-nude/60 bg-[#FAF3F5]/80 px-3.5 py-1.5 pl-8 text-xs text-text-primary placeholder:text-text-secondary/70 focus:bg-white focus:border-primary-rose focus:outline-none focus:ring-2 focus:ring-primary-rose/20 shadow-2xs"
              />
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSuggestions([]);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 text-text-secondary hover:text-text-primary"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </form>

            {/* Live Search Suggestions Dropdown */}
            {isSearchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-nude/50 bg-white p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-nude/30 px-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  <span>Gợi ý sản phẩm ({suggestions.length})</span>
                  {isSearching && <Loader2 className="h-3 w-3 animate-spin text-primary-rose" />}
                </div>

                {suggestions.length > 0 ? (
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectProduct(item.slug)}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#FFF9FB] transition text-left group"
                      >
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-background border border-nude/30">
                          <Image
                            src={item.imageUrl || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300"}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate group-hover:text-primary-rose transition-colors">
                            {item.name}
                          </p>
                          <p className="text-[11px] font-serif font-bold text-primary mt-0.5">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : isSearching ? (
                  <div className="py-6 text-center text-xs text-text-secondary">
                    Đang tìm kiếm sản phẩm...
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-text-secondary">
                    Không tìm thấy sản phẩm nào khớp với &quot;{searchQuery}&quot;
                  </div>
                )}

                {/* View All CTA */}
                <div className="pt-2 mt-2 border-t border-nude/30 px-1">
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit()}
                    className="w-full py-2 text-center text-xs font-bold text-primary-rose hover:bg-[#FAF3F5] rounded-xl transition flex items-center justify-center"
                  >
                    Xem tất cả kết quả cho &quot;{searchQuery}&quot;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Group B: Mobile Search + Wishlist + Cart Bag */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Mobile Search Toggle Button */}
            <button 
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              aria-label="Search" 
              className="md:hidden p-2 rounded-full hover:bg-surface-container-high transition text-text-secondary hover:text-primary-rose"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Wishlist */}
            <Link 
              href="/wishlist" 
              aria-label="Wishlist" 
              className="p-2 rounded-full hover:bg-surface-container-high transition text-text-secondary hover:text-primary-rose"
            >
              <Heart className="h-4.5 w-4.5" />
            </Link>

            {/* Cart Bag */}
            <button 
              onClick={() => openDrawer()} 
              aria-label="Cart" 
              className="p-2 rounded-full hover:bg-surface-container-high transition text-text-secondary hover:text-primary-rose relative"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {mounted && getTotalItems() > 0 && (
                <span className="absolute 0 top-0.5 right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary-rose text-[9px] font-bold text-white shadow-xs">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>

          {/* Subtle Vertical Divider */}
          <div className="hidden sm:block h-4 w-px bg-nude/70 my-auto" />

          {/* Group C: Language & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Auth Button / Menu */}
            <div className="flex items-center min-w-[36px]">
              {!mounted ? (
                <div className="h-8 w-8 sm:w-20 rounded-full bg-nude/20 animate-pulse"></div>
              ) : isAuthenticated ? (
                <div className="relative">
                  <button 
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      isAccountMenuOpen 
                        ? 'border-primary-rose bg-primary-pink/15 text-primary-rose shadow-2xs' 
                        : 'border-nude/80 hover:border-primary-rose bg-white/70 hover:bg-white text-text-primary'
                    }`}
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-rose/15 text-[10px] font-bold text-primary-rose flex-shrink-0">
                      {user?.name ? user.name.trim().charAt(0).toUpperCase() : <User className="h-3 w-3" />}
                    </div>
                    <span className="hidden md:inline-block max-w-[70px] xl:max-w-[90px] truncate font-medium">
                      {user?.name ? user.name.trim().split(" ").slice(-1)[0] : "Account"}
                    </span>
                    <ChevronDown className={`h-3 w-3 text-text-secondary transition-transform duration-200 ${isAccountMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isAccountMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsAccountMenuOpen(false)}></div>
                      <div className="absolute right-0 top-full mt-1.5 w-48 flex-col rounded-2xl border border-nude/50 bg-white p-1.5 shadow-xl z-50 flex animate-in fade-in zoom-in-95 duration-150">
                        {/* Mũi tên kết nối liền mạch với button */}
                        <div className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t border-nude/50 bg-white pointer-events-none" />
                        
                        <div className="relative z-10">
                          <div className="px-3 py-2 border-b border-nude/30 text-xs font-bold text-text-primary">
                            {user?.name || "Tài khoản Atelier"}
                            <p className="text-[10px] text-text-secondary font-normal truncate">{user?.email}</p>
                          </div>
                          <div className="py-1 space-y-0.5">
                            <Link href="/account" onClick={() => setIsAccountMenuOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded-xl hover:bg-[#FAF3F5] transition flex items-center">
                              Profile & Rituals
                            </Link>
                            <Link href="/account/orders" onClick={() => setIsAccountMenuOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded-xl hover:bg-[#FAF3F5] transition flex items-center">
                              Order Tracking
                            </Link>
                            <Link href="/wishlist" onClick={() => setIsAccountMenuOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded-xl hover:bg-[#FAF3F5] transition flex items-center">
                              Saved Rituals
                            </Link>
                            <button onClick={handleLogout} className="w-full px-3 py-1.5 text-left text-xs font-bold text-status-danger rounded-xl hover:bg-red-50 transition border-t border-nude/30 mt-1 pt-2 flex items-center">
                              Log Out
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link href="/login" className="flex items-center gap-1.5 rounded-full bg-text-primary px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-primary-rose shadow-xs whitespace-nowrap">
                  <User className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
            className="lg:hidden p-1.5 rounded-full hover:bg-surface-container-high transition text-text-secondary hover:text-primary-rose"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-nude/30 bg-surface/98 backdrop-blur-md px-6 py-5 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-3">
            {NAV_ITEMS.map((item) => {
              const isActive = cleanPathname === item.href || (item.href !== "/" && cleanPathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-sm py-1.5 transition-colors ${
                    isActive ? "font-bold text-primary-rose" : "text-text-primary hover:text-primary-rose"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Search Bar Dropdown */}
      {isMobileSearchOpen && (
        <div className="md:hidden border-t border-nude/30 bg-surface px-4 py-3 animate-in slide-in-from-top-2">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm, thương hiệu..."
              className="w-full rounded-full border border-nude/70 bg-[#FAF3F5] px-4 py-2 pl-9 pr-9 text-xs text-text-primary placeholder:text-text-secondary focus:bg-white focus:border-primary-rose focus:outline-none"
              autoFocus
            />
            <Search className="absolute left-3 h-4 w-4 text-text-secondary" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Mobile suggestions list */}
          {searchQuery.trim().length >= 2 && suggestions.length > 0 && (
            <div className="mt-2 rounded-2xl border border-nude/40 bg-white p-2 shadow-lg space-y-1 max-h-64 overflow-y-auto">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectProduct(item.slug)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#FFF9FB] text-left"
                >
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-background">
                    <Image
                      src={item.imageUrl || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300"}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{item.name}</p>
                    <p className="text-[11px] font-serif font-bold text-primary">{formatPrice(item.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <CartSlideOut />
    </header>
  );
}