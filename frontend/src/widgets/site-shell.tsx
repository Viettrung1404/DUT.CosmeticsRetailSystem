"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  Heart,
  Menu,
  MoreHorizontal,
  ShoppingBag,
  Store,
  UserRound,
  X,
  ShieldCheck,
  RefreshCcw,
  Headset,
} from "lucide-react";
import { SearchBox } from "@/features/catalog/search-box";
import { navigationBrandSlugs, siteNavigation } from "@/shared/config/navigation";
import { routes } from "@/shared/config/routes";
import { useQuery } from "@tanstack/react-query";
import { userSchema } from "@/shared/auth/contracts";
import { ApiError } from "@/shared/api/errors";
import { readBff } from "@/shared/api/browser";
import { z } from "zod";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { CartContents } from "@/features/catalog/cart-contents";
import { WishlistDrawer } from "@/features/catalog/wishlist-drawer";
import { cartQuery, wishlistIdsQuery } from "@/features/catalog/commerce-state";
import type { Category } from "@/features/catalog/server";

export const Logo = BrandLogo;

export function SiteHeader({
  categories = [],
  brands = [],
}: {
  categories?: Category[];
  brands?: { id: string; name: string; slug: string }[];
}) {
  const hydrated = useHydrated();
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pills = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const cartDialog = useRef<HTMLDialogElement>(null);
  const cartTrigger = useRef<HTMLButtonElement>(null);
  const wishlistDialog = useRef<HTMLDialogElement>(null);
  const wishlistTrigger = useRef<HTMLButtonElement>(null);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const { data: cart } = useQuery(cartQuery());
  const { data: wishlistIds } = useQuery(wishlistIdsQuery());
  const cartCount = hydrated ? (cart?.totalQuantity ?? 0) : 0;
  const wishlistCount = hydrated ? (wishlistIds?.ids.length ?? 0) : 0;
  const { data: user } = useQuery({
    queryKey: ["session"],
    queryFn: async ({ signal }) => {
      try {
        return (await readBff("/api/auth/session", z.object({ user: userSchema }), signal)).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
  });
  const visibleUser = hydrated ? user : null;
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.current?.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  const navigationBrands = navigationBrandSlugs.flatMap((slug) => {
    const brand = brands.find((item) => item.slug === slug);
    return brand
      ? [{ id: brand.id, name: brand.name, href: `/brands/${encodeURIComponent(brand.slug)}` }]
      : [];
  });
  const navigation = siteNavigation.map((item) => ({
    ...item,
    links:
      "categorySlug" in item
        ? (categories.find((category) => category.slug === item.categorySlug)?.children ?? []).map(
            (child) => ({
              id: child.id,
              name: child.name,
              href: `/categories/${encodeURIComponent(child.slug)}`,
            }),
          )
        : item.href === routes.brands
          ? navigationBrands
          : [],
  }));
  const activeNavigation = (item: (typeof navigation)[number]) =>
    active(item.href) || item.links.some((link) => path === link.href);
  return (
    <>
      <a href="#main-content" className="skip-link">
        Bỏ qua điều hướng
      </a>
      <header className="site-header">
        <div className="announcement">
          <div className="site-container announcement-inner">
            Mua là có quà · Đơn từ 129k→ Freeship 15k · Đơn từ 359k → Freeship 25k · Đơn từ 459k →
            Freeship toàn quốc · Mua online nhận tại cửa hàng
          </div>
        </div>
        <div className="header-main site-container">
          <button
            ref={trigger}
            className="icon-button mobile-only"
            aria-label="Mở menu"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            disabled={!hydrated}
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <Logo />
          <SearchBox />
          <div className="header-actions">
            <Link href="/stores" className="store-entry">
              <Store />
              <span>Hệ thống cửa hàng</span>
            </Link>
            <Link href="/blog" className="blog-entry">
              <BookOpen />
              <span>Tạp chí làm đẹp</span>
            </Link>
            <details
              className="header-more"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary aria-label="Xem thêm">
                <MoreHorizontal />
              </summary>
              <nav aria-label="Liên kết thêm">
                <Link href="/products">Tất cả sản phẩm</Link>
                <Link href="/flash-sale">Flash Sale</Link>
                <Link href="/account/orders">Tra cứu đơn hàng</Link>
                <Link href="/account/notifications">Thông báo</Link>
                <Link href="/help">Trung tâm hỗ trợ</Link>
              </nav>
            </details>
            <Link
              className="account-entry"
              href={visibleUser ? "/account" : "/login"}
              aria-label={visibleUser ? `Tài khoản ${visibleUser.fullName}` : "Đăng nhập"}
            >
              <UserRound className="mobile-only" />
              <span>{visibleUser ? visibleUser.fullName : "Đăng nhập"}</span>
            </Link>
            <button
              ref={wishlistTrigger}
              type="button"
              className="wishlist-entry"
              aria-label={`Mở sản phẩm yêu thích, ${wishlistCount} sản phẩm`}
              onClick={() => {
                setWishlistOpen(true);
                wishlistDialog.current?.showModal();
              }}
            >
              <Heart />
              {wishlistCount > 0 && <span className="header-count">{wishlistCount}</span>}
            </button>
            <button
              ref={cartTrigger}
              type="button"
              className="cart-entry"
              aria-label={`Mở giỏ hàng, ${cartCount} sản phẩm`}
              onClick={() => cartDialog.current?.showModal()}
            >
              <ShoppingBag />
              {cartCount > 0 && <span className="header-count">{cartCount}</span>}
            </button>
          </div>
        </div>
        <div className="navigation-row">
          <nav className="desktop-nav site-container" aria-label="Điều hướng chính">
            <div ref={pills} className="nav-pills">
              {navigation.map((item) => (
                <div className="nav-group" key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={activeNavigation(item) ? "page" : undefined}
                    className={`nav-pill pill-${item.tone}`}
                  >
                    {item.label}
                  </Link>
                  {item.links.length > 0 && (
                    <div
                      className={`nav-dropdown${item.href === routes.brands ? " nav-dropdown-brands" : ""}`}
                    >
                      <div className="nav-dropdown-inner">
                        <Link className="nav-dropdown-all" href={item.href}>
                          Xem tất cả {item.label.toLowerCase()} <ChevronRight size={15} />
                        </Link>
                        <div className="nav-dropdown-links">
                          {item.links.map((link) => (
                            <Link key={link.id} href={link.href}>
                              {link.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="nav-next"
              aria-label="Xem tiếp danh mục"
              onClick={() => {
                const list = pills.current;
                if (list) {
                  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  list.scrollTo({
                    left:
                      list.scrollLeft >= list.scrollWidth - list.clientWidth - 1
                        ? 0
                        : list.scrollLeft + 280,
                    behavior: reduced ? "instant" : "smooth",
                  });
                }
              }}
            >
              <ChevronRight size={18} />
            </button>
          </nav>
        </div>
      </header>
      <dialog
        id="mobile-navigation"
        aria-label="Điều hướng di động"
        ref={dialog}
        className="mobile-drawer"
        onCancel={close}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="drawer-heading">
          <Logo />
          <button className="icon-button" onClick={close} aria-label="Đóng menu">
            <X />
          </button>
        </div>
        <nav aria-label="Điều hướng di động">
          {navigation.map((item) =>
            item.links.length ? (
              <details className="drawer-category" key={item.href}>
                <summary>{item.label}</summary>
                <Link onClick={close} href={item.href}>
                  Xem tất cả {item.label.toLowerCase()}
                </Link>
                {item.links.map((link) => (
                  <Link onClick={close} key={link.id} href={link.href}>
                    {link.name}
                  </Link>
                ))}
              </details>
            ) : (
              <Link
                onClick={close}
                key={item.href}
                href={item.href}
                aria-current={activeNavigation(item) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ),
          )}
          {[
            { href: "/products", label: "Tất cả sản phẩm" },
            { href: "/stores", label: "Hệ thống cửa hàng" },
            { href: "/blog", label: "Góc làm đẹp" },
            { href: "/account", label: "Tài khoản của tôi" },
            { href: "/account/orders", label: "Tra cứu đơn hàng" },
            { href: "/wishlist", label: "Sản phẩm yêu thích" },
            { href: "/account/notifications", label: "Thông báo" },
          ].map((item) => (
            <Link
              onClick={close}
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </dialog>
      <dialog
        ref={wishlistDialog}
        className="wishlist-drawer"
        aria-label="Sản phẩm yêu thích"
        onClose={() => {
          setWishlistOpen(false);
          wishlistTrigger.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) wishlistDialog.current?.close();
        }}
      >
        {hydrated && (
          <WishlistDrawer open={wishlistOpen} onNavigate={() => wishlistDialog.current?.close()} />
        )}
      </dialog>
      <dialog
        ref={cartDialog}
        className="mini-cart-drawer"
        aria-label="Giỏ hàng"
        onClose={() => cartTrigger.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) cartDialog.current?.close();
        }}
      >
        <div className="drawer-heading">
          <h2>Giỏ hàng của bạn</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Đóng giỏ hàng"
            onClick={() => cartDialog.current?.close()}
          >
            <X />
          </button>
        </div>
        {hydrated && <CartContents compact onNavigate={() => cartDialog.current?.close()} />}
      </dialog>
    </>
  );
}

const footerGroups = [
  {
    title: "Khám phá",
    links: [
      ["Tất cả sản phẩm", "/products"],
      ["Chăm sóc da toàn diện", "/categories/cham-soc-da"],
      ["Trang điểm & Mỹ phẩm", "/categories/trang-diem"],
      ["Săn deal Flash Sale", "/flash-sale"],
      ["Chương trình khuyến mãi", "/promotions"],
      ["Thương hiệu được yêu thích", "/brands"],
    ],
  },
  {
    title: "Hỗ trợ khách hàng",
    links: [
      ["Hướng dẫn đặt hàng", "/help"],
      ["Câu hỏi thường gặp (FAQ)", "/faq"],
      ["Tra cứu tình trạng đơn hàng", "/account/orders"],
      ["Trung tâm hỗ trợ", "/help"],
      ["Chính sách đổi trả", "/chinh-sach-doi-tra"],
    ],
  },
  {
    title: "Về GlowUp",
    links: [
      ["Hệ thống cửa hàng", "/stores"],
      ["Góc làm đẹp & Bí quyết dưỡng da", "/blog"],
    ],
  },
  {
    title: "Tài khoản & Quyền lợi",
    links: [
      ["Đăng nhập / Đăng ký", "/login"],
      ["Lịch sử & Theo dõi đơn mua", "/account/orders"],
      ["GlowUp Rewards & Tích điểm", "/account/loyalty"],
      ["Đổi ưu đãi", "/account/loyalty/rewards"],
      ["Sổ địa chỉ nhận hàng", "/account/addresses"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-services">
        <div>
          <ShieldCheck />
          <span>
            <strong>Chăm sóc vẻ đẹp</strong>
            <small>Khám phá sản phẩm phù hợp với bạn</small>
          </span>
        </div>
        <div>
          <RefreshCcw />
          <span>
            <strong>Đổi trả 7 ngày</strong>
            <small>Theo điều kiện của chính sách đổi trả</small>
          </span>
        </div>
        <div>
          <ShoppingBag />
          <span>
            <strong>Mua sắm thuận tiện</strong>
            <small>Theo dõi đơn hàng trong tài khoản</small>
          </span>
        </div>
        <div>
          <Headset />
          <span>
            <strong>Hỗ trợ khách hàng</strong>
            <small>
              <Link href="/help">Đồng hành cùng hành trình làm đẹp</Link>
            </small>
          </span>
        </div>
      </div>
      <div className="site-container footer-grid">
        {footerGroups.map((group) => (
          <div key={group.title}>
            <h2>{group.title}</h2>
            {group.links.map(([label, href]) => (
              <Link key={label} href={href}>
                {label}
              </Link>
            ))}
            {group.title === "Tài khoản & Quyền lợi" && (
              <p className="payment-methods">
                <span>VNPAY</span>
                <span>COD</span>
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="footer-bottom site-container">
        <span>© 2026 GlowUp Beauty Retail.</span>
        <span>Chăm sóc vẻ đẹp của bạn.</span>
      </div>
    </footer>
  );
}
