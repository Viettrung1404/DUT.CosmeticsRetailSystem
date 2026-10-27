"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountNavigation } from "@/shared/config/navigation";
import type { AuthUser } from "@/shared/auth/contracts";
import { LogoutButton } from "@/features/authentication/logout-button";
export function AccountSidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  return <aside className="account-sidebar"><div className="account-person"><span className="avatar">{user.fullName.charAt(0).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>Tài khoản GlowUp</small></div></div><details className="account-menu" open><summary>Điều hướng tài khoản</summary><nav aria-label="Tài khoản">{accountNavigation.map((group) => <div key={group.label}><h2>{group.label}</h2>{group.items.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}</div>)}</nav><LogoutButton/><Link className="support-link" href="/help">Trung tâm hỗ trợ →</Link></details></aside>;
}
