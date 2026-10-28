"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountNavigation } from "@/shared/config/navigation";
import type { AuthUser } from "@/shared/auth/contracts";
import { LogoutButton } from "@/features/authentication/logout-button";
import { Bell, ChevronRight, CircleUserRound, Gift, Headset, Heart, House, MapPin, Package, RotateCcw, ShieldCheck, Star } from "lucide-react";
const menuIcons = { "/account": House, "/account/profile": CircleUserRound, "/account/orders": Package, "/account/addresses": MapPin, "/account/wishlist": Heart, "/account/returns": RotateCcw, "/account/security": ShieldCheck, "/account/loyalty/rewards": Gift, "/account/loyalty": Star, "/account/notifications": Bell };
function currentItem(pathname: string) {
  type MenuItem = (typeof accountNavigation)[number]["items"][number];
  return accountNavigation.flatMap<MenuItem>(group => [...group.items]).filter(item => pathname === item.href || (item.href !== "/account" && pathname.startsWith(`${item.href}/`))).sort((a, b) => b.href.length - a.href.length)[0];
}
export function AccountBreadcrumb() {
  const pathname = usePathname();
  const item = currentItem(pathname);
  return <nav className="breadcrumb" aria-label="Đường dẫn"><Link href="/">Trang chủ</Link><ChevronRight size={12}/><Link href="/account">Tài khoản</Link>{item && item.href !== "/account" && <><ChevronRight size={12}/><span aria-current="page">{item.label}</span></>}</nav>;
}
export function AccountSidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const selected = currentItem(pathname)?.href;
  return <aside className="account-sidebar"><div className="account-person"><span className="avatar">{user.fullName.charAt(0).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>THÀNH VIÊN GLOWUP</small></div></div><details className="account-menu" open><summary>Điều hướng tài khoản</summary><nav aria-label="Tài khoản">{accountNavigation.map((group) => <div key={group.label}><h2>{group.label}</h2>{group.items.map((item) => { const Icon = menuIcons[item.href]; return <Link key={item.href} href={item.href} aria-current={selected === item.href ? "page" : undefined}><Icon/>{item.label}</Link>; })}</div>)}</nav><LogoutButton/><Link className="support-link" href="/help"><Headset size={20}/><span>HỖ TRỢ NHANH<strong>Trung tâm hỗ trợ →</strong></span></Link></details></aside>;
}
