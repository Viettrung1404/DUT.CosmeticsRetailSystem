"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  User,
} from "lucide-react";
import { useAdminScope } from "@/shared/auth/admin-guard";

export function AdminHeader({
  onToggleSidebar,
}: {
  onToggleSidebar?: () => void;
}) {
  const { activeStoreId, setActiveStoreId, stores, setStores, activeStore, user } =
    useAdminScope();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Tải danh sách cửa hàng nếu chưa có
  useEffect(() => {
    async function loadStores() {
      try {
        // Có thể gọi endpoint /stores
        const res = await fetch("/api/stores").catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.data || [];
          if (items.length > 0) setStores(items);
        } else {
          // Danh sách chi nhánh thực tế từ database
          setStores([
            { id: "3fcf5798-69e2-42dc-90e6-28e145d0b3a7", name: "GlowUp Hải Châu", code: "STORE-04" },
            { id: "7c5e22d9-90a6-450d-8742-c6fd647d16aa", name: "GlowUp Showroom Quận 1", code: "STORE-03" },
            { id: "5dc2ddcc-5b9d-42bf-972f-975d4ccc980e", name: "GlowUp Hai Bà Trưng", code: "STORE-01" },
            { id: "c7863c34-d735-4363-b08c-e60384138915", name: "Kho Tổng Hà Nội - GlowUp Northern DC", code: "WH-HN", isWarehouse: true },
            { id: "19285c39-8f7c-4a84-9c50-65722b968c48", name: "Tổng kho Tân Bình - GlowUp Central DC", code: "WH-TB", isWarehouse: true },
          ]);
        }
      } catch {
        // ignore error
      }
    }

    if (stores.length === 0) {
      loadStores();
    }
  }, [setStores, stores.length]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      const { getWebBehaviorTracker } = await import("@/shared/recommendations/web-tracker");
      await getWebBehaviorTracker().resetAnonymousIdOnLogout().catch(() => {});
    } finally {
      window.location.href = "/login?returnTo=/admin";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Store Scope Selector */}
      <div className="flex items-center gap-2 sm:gap-4">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Mở menu quản trị"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden border border-slate-200 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition"
          >
            <Building2 className="w-4 h-4 text-[#C85A70] shrink-0" />
            <span className="max-w-[130px] sm:max-w-[200px] truncate">
              {activeStore ? activeStore.name : "Tất cả chi nhánh"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Chọn Phạm Vi Chi Nhánh (x-store-id)
              </div>
              <button
                onClick={() => {
                  setActiveStoreId(null);
                  setDropdownOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 transition flex items-center justify-between ${
                  !activeStoreId ? "text-[#C85A70] font-bold bg-rose-50/50" : "text-slate-700"
                }`}
              >
                <span>Tất cả chi nhánh (Không lọc)</span>
              </button>
              {stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveStoreId(s.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 transition flex items-center justify-between ${
                    activeStoreId === s.id
                      ? "text-[#C85A70] font-bold bg-rose-50/50"
                      : "text-slate-700"
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  {s.code && (
                    <span className="text-[10px] text-slate-400 font-mono ml-2">
                      {s.code}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* User Card */}
        <div className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-[#C85A70]/10 text-[#C85A70] flex items-center justify-center font-bold text-xs shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {user?.fullName || user?.email || "Admin Operator"}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              {user?.roleName || "STORE_STAFF"}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Đăng xuất khỏi phiên quản trị"
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
