"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Truck,
  Receipt,
  RotateCcw,
  BarChart3,
  Building2,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useAdminScope } from "@/shared/auth/admin-guard";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Tổng quan Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "WMS Fulfillment",
    href: "/admin/fulfillment",
    icon: Boxes,
  },
  {
    name: "Quản lý Vận đơn (Shipments)",
    href: "/admin/shipments",
    icon: Truck,
  },
  {
    name: "Đối soát COD",
    href: "/admin/finance/cod",
    icon: Receipt,
  },
  {
    name: "Đổi trả & KCS (RMA)",
    href: "/admin/returns",
    icon: RotateCcw,
  },
  {
    name: "Phân tích Logistics & SLA",
    href: "/admin/logistics/dashboard",
    icon: BarChart3,
  },
  {
    name: "Chất lượng theo Lô (Lot BI)",
    href: "/admin/returns/analytics",
    icon: ShieldCheck,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { activeStore, user } = useAdminScope();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#C85A70] flex items-center justify-center text-white font-black text-sm tracking-tighter">
          GU
        </div>
        <div>
          <span className="font-bold text-white text-base tracking-wide">GlowUp Ops</span>
          <span className="block text-[10px] text-rose-400 font-semibold uppercase tracking-wider">
            Portal Quản Trị
          </span>
        </div>
      </div>

      {/* Active Store Indicator */}
      <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-slate-800/60 border border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Building2 className="w-3.5 h-3.5 text-rose-400" />
          <span>Chi nhánh làm việc:</span>
        </div>
        <p className="text-xs font-bold text-white mt-1 truncate">
          {activeStore?.name || "Tất cả chi nhánh (Scope Tổng)"}
        </p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Phân Hệ Vận Hành
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? "bg-[#C85A70] text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span className="truncate">{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-rose-200 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info & Quick Link */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            Xem Storefront Khách
          </span>
        </Link>
        <div className="px-3 py-2 text-[11px] text-slate-500 border-t border-slate-800/50">
          <span>Đang đăng nhập: </span>
          <span className="text-slate-300 font-semibold block truncate">
            {user?.fullName || user?.email || "Nhân viên"}
          </span>
          <span className="text-rose-400 text-[10px] uppercase font-bold tracking-wider">
            {user?.roleName || "STORE_STAFF"}
          </span>
        </div>
      </div>
    </aside>
  );
}
