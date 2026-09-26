"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";

export default function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-violet-500 text-lg font-bold text-white">G</div>
          <div>
            <p className="text-lg font-black tracking-tight text-gray-900">GlowUp</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Beauty Store</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-700 md:flex">
          <Link href="/" className="transition hover:text-rose-500">Trang chủ</Link>
          <Link href="/products" className="transition hover:text-rose-500">Sản phẩm</Link>
          <Link href="/category/skin-care" className="transition hover:text-rose-500">Chăm sóc da</Link>
          <Link href="/category/make-up" className="transition hover:text-rose-500">Trang điểm</Link>
          <Link href="/cart" className="transition hover:text-rose-500">Giỏ hàng</Link>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="hidden rounded-full bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600 md:inline-block">{user?.name || user?.email || "Khách hàng"}</span>
              <button onClick={logout} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-rose-400 hover:text-rose-500">
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-rose-400 hover:text-rose-500">Đăng nhập</Link>
              <Link href="/register" className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}