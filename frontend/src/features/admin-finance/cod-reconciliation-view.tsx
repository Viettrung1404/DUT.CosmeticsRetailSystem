"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  Eye,
  TrendingDown,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { adminClient } from "@/shared/api/admin-client";
import { CodReconciliationBatch, CodReconciliationItem } from "./contracts";

export function CodReconciliationView() {
  const [batches, setBatches] = useState<CodReconciliationBatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Upload dialog state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [reconciliationCode, setReconciliationCode] = useState<string>(
    `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-01`
  );
  const [carrierCode, setCarrierCode] = useState<"GHN" | "AHAMOVE">("GHN");
  const [reconciliationDate, setReconciliationDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [bankStatementRef, setBankStatementRef] = useState<string>("");
  const [csvContent, setCsvContent] = useState<string>(
    "trackingCode,carrierPaidCodAmount,carrierFeeCharged\nGHN123456,250000,22000\nAHA998877,320000,30000"
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Batch detail inspection modal
  const [selectedBatch, setSelectedBatch] = useState<CodReconciliationBatch | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminClient.get<any>("/admin/cod/reconciliations").catch(() => {
        // Fallback default list if no reconciliations yet
        return [];
      });
      const list = Array.isArray(res) ? res : res.items || res.data || [];
      setBatches(list);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách đối soát.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleOpenDetail = async (batchId: string) => {
    try {
      setLoadingDetail(true);
      const res = await adminClient.get<CodReconciliationBatch>(
        `/admin/cod/reconciliations/${batchId}`
      );
      setSelectedBatch(res);
    } catch (err: any) {
      alert("Không thể tải chi tiết bảng kê: " + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUploadBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      // Parse CSV client-side
      const lines = csvContent
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const items: any[] = [];
      const firstLine = lines[0];
      const startIndex = firstLine && firstLine.toLowerCase().includes("tracking") ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const parts = line.split(",").map((s) => s.trim());
        const trk = parts[0];
        const paidStr = parts[1];
        const feeStr = parts[2];
        if (trk && paidStr !== undefined) {
          items.push({
            trackingCode: trk,
            carrierPaidCodAmount: parseFloat(paidStr) || 0,
            carrierFeeCharged: feeStr ? parseFloat(feeStr) : 0,
          });
        }
      }

      if (items.length === 0) {
        alert("Dữ liệu bảng kê trống hoặc định dạng không đúng!");
        return;
      }

      const payload = {
        reconciliationCode: reconciliationCode.trim(),
        carrierCode,
        reconciliationDate,
        bankStatementRef: bankStatementRef.trim() || undefined,
        items,
      };

      const res = await adminClient.post("/admin/cod/reconcile-batch", payload);

      setShowUploadModal(false);
      fetchBatches();
      alert(
        `Đã đối soát thành công bảng kê ${payload.reconciliationCode}! Kết quả: ${
          (res as any)?.status || "ĐÃ XỬ LÝ"
        }`
      );
    } catch (err: any) {
      alert(err?.message || "Lỗi khi nhập bảng kê đối soát");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 4-Stage COD Lifecycle Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">1. COD Dự Kiến</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-900">COD_EXPECTED</p>
          <p className="text-[11px] text-slate-500 mt-1">Đơn đã giao shipper, đang chờ phát cho khách</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">2. Đã Thu Tiền Mặt</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-slate-900">COD_COLLECTED</p>
          <p className="text-[11px] text-slate-500 mt-1">Khách đã nhận hàng và thanh toán tiền cho shipper</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">3. Chờ Đối Tác Chuyển</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-900">SETTLEMENT_PENDING</p>
          <p className="text-[11px] text-slate-500 mt-1">Hãng 3PL tổng hợp kỳ đối soát và chuẩn bị thanh toán</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">4. Đã Quyết Toán</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700">SETTLED</p>
          <p className="text-[11px] text-slate-500 mt-1">Tiền COD đã khớp 100% và vào tài khoản GlowUp</p>
        </div>
      </div>

      {/* Action Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Danh Sách Bảng Kê Đối Soát Định Kỳ
          </h2>
          <p className="text-xs text-slate-500">
            Tự động đối chiếu số dư, cấn trừ cước phí và phát hiện chênh lệch (Discrepancy).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBatches}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C85A70] hover:bg-[#b04a5e] text-white text-xs font-bold transition shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Nhập Bảng Kê Đối Soát (CSV)</span>
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C85A70]" />
            <p>Đang tải danh sách bảng kê...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-800 text-sm">Chưa có bảng kê đối soát nào</p>
            <p className="text-slate-400 mt-1">Bấm nút "Nhập Bảng Kê Đối Soát" để tải lên sao kê từ GHN / Ahamove.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Mã Bảng Kê</th>
                  <th className="py-3.5 px-4">Đối Tác 3PL</th>
                  <th className="py-3.5 px-4">Ngày Đối Soát</th>
                  <th className="py-3.5 px-4">Số Kiện</th>
                  <th className="py-3.5 px-4">COD Đã Nhận</th>
                  <th className="py-3.5 px-4">Sai Lệch</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {b.reconciliationCode}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {b.carrierCode}
                    </td>

                    <td className="py-3.5 px-4">
                      {b.reconciliationDate}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {b.totalOrdersCount || (b.items ? b.items.length : 0)} đơn
                    </td>

                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      {(b.totalPaidCod || 0).toLocaleString("vi-VN")} đ
                    </td>

                    <td className="py-3.5 px-4">
                      {b.totalDiscrepancy && b.totalDiscrepancy !== 0 ? (
                        <span className="font-bold text-rose-600">
                          {b.totalDiscrepancy.toLocaleString("vi-VN")} đ
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Khớp 100%</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          b.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(b.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chi tiết</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Upload CSV Batch */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleUploadBatch}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#C85A70] flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Nhập Bảng Kê Đối Soát Định Kỳ (Reconcile Batch)
                </h3>
                <p className="text-xs text-slate-500">Đối chiếu tiền COD và cấn trừ cước vận chuyển 3PL</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã bảng kê *</label>
                  <input
                    type="text"
                    required
                    value={reconciliationCode}
                    onChange={(e) => setReconciliationCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đối tác 3PL *</label>
                  <select
                    value={carrierCode}
                    onChange={(e: any) => setCarrierCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  >
                    <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                    <option value="AHAMOVE">Ahamove Express</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày đối soát *</label>
                  <input
                    type="date"
                    required
                    value={reconciliationDate}
                    onChange={(e) => setReconciliationDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã sao kê ngân hàng</label>
                  <input
                    type="text"
                    placeholder="VD: FT261116892301"
                    value={bankStatementRef}
                    onChange={(e) => setBankStatementRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung bảng kê (Định dạng CSV: trackingCode, carrierPaidCodAmount, carrierFeeCharged) *
                </label>
                <textarea
                  rows={5}
                  required
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#C85A70] hover:bg-[#b04a5e] text-white text-xs font-bold transition disabled:opacity-50"
              >
                {submitting ? "Đang xử lý đối soát..." : "Thực Thi Đối Soát"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Batch Detail & Discrepancies Inspection */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Chi Tiết Bảng Kê: {selectedBatch.reconciliationCode}
                </h3>
                <p className="text-xs text-slate-500">
                  Đối tác: <strong>{selectedBatch.carrierCode}</strong> • Ngày: {selectedBatch.reconciliationDate}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedBatch.status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {selectedBatch.status}
              </span>
            </div>

            {/* Items list */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {(selectedBatch.items || []).map((it, idx) => {
                const isDiscrepancy = it.status === "DISCREPANCY" || it.discrepancyAmount !== 0;

                return (
                  <div
                    key={it.id || idx}
                    className={`p-3.5 rounded-xl border text-xs ${
                      isDiscrepancy
                        ? "bg-rose-50/70 border-rose-300"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Vận đơn: {it.trackingCode}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isDiscrepancy
                            ? "bg-rose-600 text-white"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {it.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">COD Khai Báo:</span>
                        <p className="font-semibold text-slate-800">
                          {it.declaredCodAmount.toLocaleString("vi-VN")} đ
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">COD 3PL Đã Thu:</span>
                        <p className="font-semibold text-emerald-700">
                          {it.carrierPaidCodAmount.toLocaleString("vi-VN")} đ
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Sai Lệch:</span>
                        <p className={`font-bold ${isDiscrepancy ? "text-rose-600" : "text-slate-700"}`}>
                          {it.discrepancyAmount.toLocaleString("vi-VN")} đ
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
