"use client";

import React from "react";
import Link from "next/link";
import {
  Boxes,
  Truck,
  Receipt,
  RotateCcw,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAdminScope } from "@/shared/auth/admin-guard";

const ACTION_MODULES = [
  {
    title: "1. WMS Fulfillment Queues",
    desc: "Điều hành 3 hàng đợi kho: Nhặt hàng (Picking), Đóng gói (Packing) & Bàn giao (Handover). Ưu tiên đơn Hỏa tốc 2H.",
    href: "/admin/fulfillment",
    icon: Boxes,
    color: "bg-blue-50 text-blue-600 border-blue-200",
    badge: "FE-06",
  },
  {
    title: "2. Quản lý Vận đơn & Khắc phục Sự cố",
    desc: "Tra cứu kiện hàng 3PL, xử lý đơn gián đoạn CREATION_UNKNOWN, ghi nhận lịch sử giao thất bại và tiếp nhận hàng hoàn RTO.",
    href: "/admin/shipments",
    icon: Truck,
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    badge: "FE-08",
  },
  {
    title: "3. Đối soát Tiền Thu Hộ COD",
    desc: "Nhập bảng kê sao kê định kỳ GHN / Ahamove, tự động đối chiếu số dư, cấn trừ cước phí và gắn cờ cảnh báo sai lệch.",
    href: "/admin/finance/cod",
    icon: Receipt,
    color: "bg-amber-50 text-amber-600 border-amber-200",
    badge: "FE-09",
  },
  {
    title: "4. Quy trình Đổi trả & Kiểm định KCS (RMA)",
    desc: "Hàng đợi CS Review hồ sơ & video unboxing, tiếp nhận tại quầy Showroom, biên bản KCS định đoạt tồn kho và hoàn tiền.",
    href: "/admin/returns",
    icon: RotateCcw,
    color: "bg-rose-50 text-rose-600 border-rose-200",
    badge: "FE-10",
  },
  {
    title: "5. Phân tích Logistics & Giám sát SLA",
    desc: "Báo cáo thời gian thực: Tỷ lệ giao thành công lần đầu, vi phạm cam kết 2H, thất thoát COD và năng suất xử lý kho.",
    href: "/admin/logistics/dashboard",
    icon: BarChart3,
    color: "bg-purple-50 text-purple-600 border-purple-200",
    badge: "FE-11",
  },
  {
    title: "6. Chất lượng theo Lô (Lot Quality BI)",
    desc: "Báo cáo tỷ lệ biến chất theo từng lô sản xuất FEFO, cảnh báo khẩn cấp LOT_DEFECT_ALERT và so sánh tỷ lệ hư hại đối tác 3PL.",
    href: "/admin/returns/analytics",
    icon: ShieldCheck,
    color: "bg-indigo-50 text-indigo-600 border-indigo-200",
    badge: "FE-11",
  },
];

export default function AdminDashboardPage() {
  const { user, activeStore } = useAdminScope();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#C85A70] text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>GlowUp Omnichannel Operations</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Xin chào, {user?.fullName || "Quản trị viên"}!
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Vai trò: <strong className="text-slate-800">{user?.roleName || "STORE_STAFF"}</strong> • Chi nhánh hiện tại:{" "}
              <strong className="text-rose-600">
                {activeStore?.name || "Tất cả chi nhánh (Không lọc)"}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link
              href="/admin/fulfillment"
              className="px-4 py-2 rounded-xl bg-[#C85A70] hover:bg-[#b04a5e] text-white text-xs font-bold transition shadow-sm flex items-center gap-2"
            >
              <span>Vào hàng đợi WMS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Action Modules Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Các Phân Hệ Vận Hành Nghiệp Vụ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTION_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#C85A70]/40 hover:shadow-md transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border ${mod.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                      {mod.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#C85A70] transition mb-1">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{mod.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#C85A70]">
                  <span>Mở phân hệ</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
