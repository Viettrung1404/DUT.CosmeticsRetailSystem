"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  FileCheck,
  Building2,
  DollarSign,
  AlertCircle,
  Video,
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { adminClient } from "@/shared/api/admin-client";
import { useAdminScope } from "@/shared/auth/admin-guard";
import { ReturnOrder } from "./contracts";

type RmaQueueType = "cs-review" | "store-dropoff" | "qc-inspection" | "settlement";

export function RmaQueues() {
  const { activeStoreId } = useAdminScope();
  const [activeQueue, setActiveQueue] = useState<RmaQueueType>("cs-review");
  const [returns, setReturns] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Detail & Evidence Modal
  const [selectedRma, setSelectedRma] = useState<ReturnOrder | null>(null);

  // CS Decision Dialog (Approve / Reject)
  const [decisionTarget, setDecisionTarget] = useState<{
    id: string;
    action: "APPROVE" | "REJECT";
    version?: number;
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState<string>("");
  const [submittingDecision, setSubmittingDecision] = useState<boolean>(false);

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let statusQuery = "";
      if (activeQueue === "cs-review") statusQuery = "SUBMITTED";
      else if (activeQueue === "store-dropoff") statusQuery = "APPROVED";
      else if (activeQueue === "qc-inspection") statusQuery = "RECEIVED";
      else if (activeQueue === "settlement") statusQuery = "INSPECTED";

      const params = new URLSearchParams();
      if (statusQuery) params.set("status", statusQuery);
      if (search.trim()) params.set("search", search.trim());

      const res = await adminClient.get<any>(`/admin/returns?${params.toString()}`);
      const list = res?.data || (Array.isArray(res) ? res : []);
      setReturns(list);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách hồ sơ đổi trả.");
    } finally {
      setLoading(false);
    }
  }, [activeQueue, search]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Xử lý duyệt / từ chối hồ sơ (CS Review)
  const handleConfirmDecision = async () => {
    if (!decisionTarget) return;
    try {
      setSubmittingDecision(true);
      await adminClient.post(`/admin/returns/${decisionTarget.id}/transition`, {
        targetStatus: decisionTarget.action === "APPROVE" ? "APPROVED" : "REJECTED",
        expectedVersion: decisionTarget.version || 1,
        note: decisionNote.trim() || undefined,
        reason: decisionTarget.action === "REJECT" ? decisionNote.trim() : undefined,
      });

      setDecisionTarget(null);
      setDecisionNote("");
      fetchReturns();
      alert(`Đã ${decisionTarget.action === "APPROVE" ? "chấp thuận" : "từ chối"} hồ sơ thành công!`);
    } catch (err: any) {
      alert(err?.message || "Lỗi xử lý hồ sơ");
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Xử lý tiếp nhận hàng hoàn tại Showroom (Store Dropoff)
  const handleReceiveAtStore = async (id: string) => {
    try {
      setLoading(true);
      await adminClient.post(`/admin/returns/${id}/receive-at-store`, {
        packageConditionNote: "Đã tiếp nhận sản phẩm tại showroom, đưa vào kho cách ly KCS.",
      });
      alert("Đã tiếp nhận hàng hoàn tại Showroom thành công! Chuyển sang hàng đợi KCS.");
      setActiveQueue("qc-inspection");
      fetchReturns();
    } catch (err: any) {
      alert(err?.message || "Lỗi tiếp nhận hàng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 4 Queues Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full flex-nowrap">
          <button
            onClick={() => setActiveQueue("cs-review")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
              activeQueue === "cs-review"
                ? "bg-[#C85A70] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <FileCheck className="w-4 h-4 shrink-0" />
            <span>1. CS Review Hồ Sơ</span>
          </button>

          <button
            onClick={() => setActiveQueue("store-dropoff")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
              activeQueue === "store-dropoff"
                ? "bg-[#C85A70] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>2. Tiếp Nhận Showroom</span>
          </button>

          <button
            onClick={() => setActiveQueue("qc-inspection")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
              activeQueue === "qc-inspection"
                ? "bg-[#C85A70] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>3. Kiểm Định KCS (QC)</span>
          </button>

          <button
            onClick={() => setActiveQueue("settlement")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
              activeQueue === "settlement"
                ? "bg-[#C85A70] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span>4. Quyết Toán Tài Chính</span>
          </button>
        </div>

        <button
          onClick={fetchReturns}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition self-end lg:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã RMA (RET-...), mã đơn, tên khách..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C85A70]/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C85A70]" />
            <p>Đang tải hàng đợi đổi trả...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-800 text-sm">Hàng đợi hiện không có hồ sơ</p>
            <p className="text-slate-400 mt-1">Không có yêu cầu nào đang chờ xử lý ở giai đoạn này.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Mã RMA</th>
                  <th className="py-3.5 px-4">Hình Thức</th>
                  <th className="py-3.5 px-4">Khách Hàng</th>
                  <th className="py-3.5 px-4">Sản Phẩm Trả</th>
                  <th className="py-3.5 px-4">Bằng Chứng</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.map((rma) => (
                  <tr key={rma.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {rma.returnCode || rma.id}
                      <div className="text-[10px] text-slate-400 font-normal">
                        {new Date(rma.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">
                        {rma.returnChannel === "STORE_DROPOFF" ? "Showroom Drop-off" : "Bưu cục / Thu hồi"}
                      </span>
                      {rma.dropoffLocation && (
                        <span className="text-[11px] text-rose-600 block">
                          {rma.dropoffLocation.name}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {rma.customer?.fullName || rma.customerName || "Khách hàng"}
                      </div>
                      {rma.customer?.phone && (
                        <div className="text-[11px] text-slate-400">{rma.customer.phone}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800">
                        {(rma.items || []).reduce((s, it) => s + (it.quantity || 1), 0)} món
                      </span>
                      <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                        {rma.items?.[0]?.productName || rma.items?.[0]?.productVariant?.product?.name || "Sản phẩm"}
                      </div>
                    </td>

                    {/* Bằng chứng Unboxing */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedRma(rma)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-[#C85A70]" />
                        <span>Xem ảnh/video</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {rma.status}
                      </span>
                    </td>

                    {/* Thao Tác Theo Hàng Đợi */}
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {activeQueue === "cs-review" && (
                        <>
                          <button
                            onClick={() => {
                              setDecisionTarget({
                                id: rma.id,
                                action: "APPROVE",
                                version: rma.version || 1,
                              });
                              setDecisionNote("Hồ sơ và video unboxing hợp lệ theo chính sách.");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-sm"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => {
                              setDecisionTarget({
                                id: rma.id,
                                action: "REJECT",
                                version: rma.version || 1,
                              });
                              setDecisionNote("Sản phẩm đã quá hạn đổi trả 7 ngày hoặc tem seal đã rách.");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition shadow-sm"
                          >
                            Từ chối
                          </button>
                        </>
                      )}

                      {activeQueue === "store-dropoff" && (
                        <button
                          onClick={() => handleReceiveAtStore(rma.id)}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition shadow-sm inline-flex items-center gap-1"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Tiếp nhận hàng</span>
                        </button>
                      )}

                      {activeQueue === "qc-inspection" && (
                        <Link
                          href={`/admin/returns/${rma.id}/inspection`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#C85A70] hover:bg-[#b04a5e] text-white text-[11px] font-bold transition shadow-sm"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Kiểm Định KCS</span>
                        </Link>
                      )}

                      {activeQueue === "settlement" && (
                        <Link
                          href={`/admin/returns/${rma.id}/inspection`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-sm"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Quyết Toán Hoàn Tiền</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: CS Decision Dialog */}
      {decisionTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              {decisionTarget.action === "APPROVE" ? "Chấp Thuận Yêu Cầu Đổi Trả" : "Từ Chối Yêu Cầu Đổi Trả"}
            </h3>
            <p className="text-xs text-slate-500">
              Vui lòng nhập lý do / ghi chú của nhân viên CS để phản hồi tới khách hàng:
            </p>

            <textarea
              rows={3}
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDecisionTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submittingDecision}
                onClick={handleConfirmDecision}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition ${
                  decisionTarget.action === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {submittingDecision ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Evidence Media Viewer */}
      {selectedRma && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                Bằng Chứng Video / Ảnh Khách Hàng ({selectedRma.returnCode})
              </h3>
              <button
                onClick={() => setSelectedRma(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs text-slate-600">
              {/* Images */}
              <div>
                <span className="font-bold block text-slate-800 mb-2">Ảnh chụp hiện trạng:</span>
                {selectedRma.proofImages && selectedRma.proofImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRma.proofImages.map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noreferrer">
                        <img src={img} alt="Bằng chứng" className="rounded-lg object-cover w-full h-36 border border-slate-200" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Không có ảnh đính kèm.</p>
                )}
              </div>

              {/* Videos */}
              <div>
                <span className="font-bold block text-slate-800 mb-2">Video mở hộp (Unboxing):</span>
                {selectedRma.proofVideos && selectedRma.proofVideos.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRma.proofVideos.map((vid, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <span className="truncate max-w-[240px] font-mono text-[11px]">{vid}</span>
                        <a
                          href={vid}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-[#C85A70] text-white text-[11px] font-bold"
                        >
                          Mở video
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Không có video unboxing.</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedRma(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
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
