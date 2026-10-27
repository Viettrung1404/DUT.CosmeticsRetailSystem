"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Heart, Menu, Search, ShoppingBag, Truck, UserRound, X, Sparkles } from "lucide-react";
import { siteNavigation } from "@/shared/config/navigation";
import { useQuery } from "@tanstack/react-query";
import { userSchema } from "@/shared/auth/contracts";
import { ApiError } from "@/shared/api/errors";
import { readBff } from "@/shared/api/browser";
import { z } from "zod";
import { useHydrated } from "@/shared/lib/use-hydrated";

export function Logo() { return <Link href="/" className="logo" aria-label="GlowUp — Trang chủ"><span className="logo-mark" aria-hidden="true">G<span>✧</span></span><span>GlowUp<small>BEAUTY RETAIL</small></span></Link>; }
export function SiteHeader() {
  const hydrated = useHydrated();
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { data: user } = useQuery({ queryKey: ["session"], queryFn: async ({ signal }) => {
    try { return (await readBff("/api/auth/session", z.object({ user: userSchema }), signal)).user; }
    catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; }
  } });
  useEffect(() => { if (open) { dialog.current?.showModal(); document.body.style.overflow = "hidden"; } else { dialog.current?.close(); document.body.style.overflow = ""; } return () => { document.body.style.overflow = ""; }; }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <><a href="#main-content" className="skip-link">Bỏ qua điều hướng</a><header className="site-header">
    <div className="announcement"><Sparkles size={14}/> GlowUp — Chăm sóc vẻ đẹp của bạn <span>Khám phá vẻ đẹp theo cách riêng</span></div>
    <div className="header-main site-container"><button ref={trigger} className="icon-button mobile-only" aria-label="Mở menu" aria-expanded={open} aria-controls="mobile-navigation" disabled={!hydrated} onClick={() => setOpen(true)}><Menu/></button><Logo/>
      <form action="/search" className="header-search" role="search"><Search size={20}/><input name="q" aria-label="Tìm kiếm sản phẩm" placeholder="Tìm kiếm son môi, serum, kem chống nắng…" required maxLength={200}/><button>Tìm kiếm</button></form>
      <div className="header-actions"><Link href="/account/orders" className="desktop-action"><Truck/><span>Tra cứu</span></Link><Link href="/account/wishlist" className="desktop-action"><Heart/><span>Yêu thích</span></Link><Link href="/account/notifications" className="desktop-action"><Bell/><span>Thông báo</span></Link><Link href={user ? "/account" : "/login"} aria-label={user ? `Tài khoản ${user.fullName}` : "Đăng nhập"}><UserRound/><span>{user ? user.fullName : "Đăng nhập"}</span></Link><Link href="/cart" aria-label="Giỏ hàng"><ShoppingBag/><span>Giỏ hàng</span></Link></div>
    </div><nav className="desktop-nav site-container" aria-label="Điều hướng chính"><details className="category-menu" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}><summary>☰ Danh mục</summary><div className="mega-menu">{siteNavigation.map((item) => <Link key={item.href} href={item.href} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>{item.label}<span>Khám phá →</span></Link>)}</div></details>{siteNavigation.map((item) => <Link key={item.href} href={item.href} aria-current={path === item.href ? "page" : undefined}>{item.label}</Link>)}<Link href="/flash-sale" className="sale-link">⚡ Flash Sale</Link></nav>
  </header><dialog id="mobile-navigation" aria-label="Điều hướng di động" ref={dialog} className="mobile-drawer" onCancel={close} onClick={(e) => { if (e.target === e.currentTarget) close(); }}><div className="drawer-heading"><Logo/><button className="icon-button" onClick={close} aria-label="Đóng menu"><X/></button></div><nav aria-label="Điều hướng di động">{[...siteNavigation, { href: "/account", label: "Tài khoản của tôi" }, { href: "/account/orders", label: "Tra cứu đơn hàng" }, { href: "/account/wishlist", label: "Sản phẩm yêu thích" }, { href: "/account/notifications", label: "Thông báo" }].map((item) => <Link onClick={close} key={item.href} href={item.href}>{item.label}</Link>)}</nav></dialog></>;
}
export function SiteFooter() {
  const groups = [
    { title: "Khám phá", links: [["Tất cả sản phẩm", "/products"], ["Hàng mới về", "/new-arrivals"], ["Thương hiệu", "/brands"]] },
    { title: "Hỗ trợ khách hàng", links: [["Câu hỏi thường gặp", "/faq"], ["Tra cứu đơn hàng", "/account/orders"], ["Trung tâm hỗ trợ", "/help"]] },
    { title: "Về GlowUp", links: [["Hệ thống cửa hàng", "/stores"], ["Góc làm đẹp", "/blog"]] },
    { title: "Tài khoản & Quyền lợi", links: [["Đăng nhập / Đăng ký", "/login"], ["Sổ địa chỉ", "/account/addresses"], ["Đổi ưu đãi", "/account/loyalty/rewards"]] },
  ] as const;
  return <footer className="site-footer"><div className="site-container footer-brand"><Logo/><p>Vẻ đẹp bắt đầu từ sự chăm sóc mỗi ngày.</p></div><div className="site-container footer-grid">{groups.map((group) => <div key={group.title}><h2>{group.title}</h2>{group.links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>)}</div><div className="footer-bottom site-container">© 2026 GlowUp <span>Chăm sóc vẻ đẹp của bạn.</span></div></footer>;
}
