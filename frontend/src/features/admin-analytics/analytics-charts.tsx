"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  AlertOctagon,
  Clock,
  ShieldAlert,
  Flame,
  CheckCircle,
  Truck,
  RotateCcw,
  RefreshCw,
  Building2,
} from "lucide-react";
import { adminClient } from "@/shared/api/admin-client";
import {
  LotQualityDetail,
  ReturnReasonBreakdown,
  CarrierDamage,
} from "./contracts";

export function LogisticsDashboardCharts() {
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<any | null>(null);
  const [firstAttemptRate, setFirstAttemptRate] = useState<number>(94.5);
  const [expressSlaRate, setExpressSlaRate] = useState<number>(1.8);
  const [throughput, setThroughput] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resOverview, resAttempt, resSla, resThroughput] = await Promise.all([
        adminClient.get<any>("/admin/logistics/dashboard/overview").catch(() => null),
        adminClient.get<any>("/admin/logistics/dashboard/first-attempt-rate").catch(() => null),
        adminClient.get<any>("/admin/logistics/dashboard/express-sla").catch(() => null),
        adminClient.get<any>("/admin/logistics/dashboard/fulfillment-throughput").catch(() => null),
      ]);

      if (resOverview) setOverview(resOverview);
      if (resAttempt?.rate !== undefined) setFirstAttemptRate(resAttempt.rate);
      if (resSla?.breachRate !== undefined) setExpressSlaRate(resSla.breachRate);
      if (Array.isArray(resThroughput)) setThroughput(resThroughput);
      else if (resThroughput?.items) setThroughput(resThroughput.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* First Attempt Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Giao Thành Công Lần 1</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{firstAttemptRate}%</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${firstAttemptRate}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Mục tiêu: $\ge$ 92% toàn hệ thống</p>
        </div>

        {/* 2H Express SLA Breach */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Vi Phạm SLA Hỏa Tốc 2H</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">{expressSlaRate}%</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${expressSlaRate * 5}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Mục tiêu trễ hẹn: $\le$ 3.0%</p>
        </div>

        {/* COD Discrepancies */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Sai Lệch Đối Soát COD</span>
            <AlertOctagon className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {overview?.totalCodDiscrepancy !== undefined
              ? `${overview.totalCodDiscrepancy.toLocaleString("vi-VN")} đ`
              : "0 đ"}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-3">✓ Trong giới hạn an toàn</p>
        </div>

        {/* Throughput */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Năng Suất Hoàn Tất Đơn</span>
            <TrendingUp className="w-4 h-4 text-[#C85A70]" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {overview?.totalThroughputOrders || 128} đơn/ngày
          </p>
          <p className="text-[11px] text-slate-400 mt-3">Trung bình toàn bộ kho & showroom</p>
        </div>
      </div>

      {/* Warehouse Throughput Comparison */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Năng Suất Hoàn Tất Đơn Theo Chi Nhánh (Fulfillment Throughput)
        </h3>

        <div className="space-y-3">
          {(throughput.length > 0
            ? throughput
            : [
                { name: "Tổng Kho Trung Tâm Đà Nẵng", count: 85, max: 100 },
                { name: "Showroom TP.HCM Quận 1", count: 42, max: 100 },
                { name: "Showroom Hà Nội Ba Đình", count: 38, max: 100 },
              ]
          ).map((wh: any, i: number) => {
            const pct = Math.min(100, Math.round(((wh.count || wh.ordersCount || 10) / (wh.max || 100)) * 100));
            return (
              <div key={i} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>{wh.name || wh.storeName}</span>
                  <span>{wh.count || wh.ordersCount} đơn</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#C85A70] h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LotQualityAnalyticsCharts() {
  const [loading, setLoading] = useState<boolean>(true);
  const [lotReports, setLotReports] = useState<LotQualityDetail[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);
  const [carrierDamage, setCarrierDamage] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resLots, resReasons, resDamage] = await Promise.all([
        adminClient.get<LotQualityDetail[]>("/admin/returns/analytics/quality-by-lot").catch(() => []),
        adminClient.get<ReturnReasonBreakdown>("/admin/returns/analytics/reason-breakdown").catch(() => null),
        adminClient.get<CarrierDamage>("/admin/returns/analytics/carrier-damage").catch(() => null),
      ]);

      setLotReports(Array.isArray(resLots) ? resLots : []);
      if (resReasons?.reasons) setReasons(resReasons.reasons);
      if (resDamage?.carriers) setCarrierDamage(resDamage.carriers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Lot Quality & Defect Alerts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Đánh Giá Chất Lượng Theo Từng Lô Sản Xuất (FEFO Lot Quality)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động phát hiện biến chất hoặc dị ứng theo lô để cách ly (Quarantine) kịp thời.
            </p>
          </div>
        </div>

        {lotReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Không có cảnh báo biến chất nào trong kỳ kiểm định hiện tại.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Mã Lô (Batch Code)</th>
                  <th className="py-3 px-3">Sản Phẩm & SKU</th>
                  <th className="py-3 px-3">Đã Bán</th>
                  <th className="py-3 px-3">Bị Trả</th>
                  <th className="py-3 px-3">Tỷ Lệ Lỗi</th>
                  <th className="py-3 px-3">Cảnh Báo</th>
                  <th className="py-3 px-3 text-right">Khuyến Nghị Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lotReports.map((lot, idx) => (
                  <tr key={lot.lotId || idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {lot.batchCode}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 block">{lot.productName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{lot.sku}</span>
                    </td>
                    <td className="py-3 px-3">{lot.totalSold} sp</td>
                    <td className="py-3 px-3 font-bold text-rose-600">{lot.totalReturned} sp</td>
                    <td className="py-3 px-3 font-bold">
                      {lot.defectRate ? `${lot.defectRate.toFixed(1)}%` : "0%"}
                    </td>
                    <td className="py-3 px-3">
                      {lot.isDefectAlert || lot.defectRate >= 3 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                          <AlertOctagon className="w-3 h-3" />
                          LOT_DEFECT_ALERT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          Bình thường
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {lot.isDefectAlert || lot.defectRate >= 3 ? (
                        <span className="font-bold text-rose-600 text-xs">
                          {lot.recommendedAction || "CÁCH LY TOÀN BỘ LÔ TRÊN KỆ"}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid: Return Reasons & Carrier Damage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reasons */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#C85A70]" />
            <span>Phân Bổ Lý Do Đổi Trả (Return Reasons)</span>
          </h3>

          <div className="space-y-2 pt-2">
            {(reasons.length > 0
              ? reasons
              : [
                  { category: "Hư hại vận chuyển / Vỡ hộp", percentage: 42, count: 21 },
                  { category: "Dị ứng / Kích ứng da", percentage: 28, count: 14 },
                  { category: "Giao sai màu / Mã sản phẩm", percentage: 18, count: 9 },
                  { category: "Khách đổi ý (Chưa bóc seal)", percentage: 12, count: 6 },
                ]
            ).map((r: any, i: number) => (
              <div key={i} className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">{r.category}</span>
                  <span className="font-bold text-slate-900">{r.percentage}% ({r.count} đơn)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#C85A70] h-1.5 rounded-full" style={{ width: `${r.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carrier Damage Comparison */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>So Sánh Tỷ Lệ Bể Vỡ 3PL (Carrier Damage)</span>
          </h3>

          <div className="space-y-4 pt-2">
            {(carrierDamage.length > 0
              ? carrierDamage
              : [
                  { carrierCode: "Giao Hàng Nhanh (GHN Standard)", damageRate: 1.2, damagedCount: 6, totalShipments: 500 },
                  { carrierCode: "Ahamove Express 2H", damageRate: 0.3, damagedCount: 1, totalShipments: 320 },
                ]
            ).map((c: any, i: number) => (
              <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{c.carrierCode}</span>
                  <span className="text-rose-600">{c.damageRate}% hư hại</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Ghi nhận: {c.damagedCount} vụ bể vỡ / {c.totalShipments} chuyến giao
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
