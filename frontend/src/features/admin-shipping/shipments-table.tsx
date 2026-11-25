"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Truck,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Search,
  ExternalLink,
  History,
  CheckCircle,
  XCircle,
  ShieldAlert,
  ArrowRight,
  PackageCheck,
} from "lucide-react";
import { adminClient } from "@/shared/api/admin-client";
import { useAdminScope } from "@/shared/auth/admin-guard";
import { ShipmentItem, ShipmentAttempt } from "./contracts";

export function ShipmentsTable() {
  const { activeStoreId } = useAdminScope();
  const [tab, setTab] = useState<"all" | "incident" | "rto">("all");
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [carrierFilter, setCarrierFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Reconcile dialog
  const [reconcileTarget, setReconcileTarget] = useState<ShipmentItem | null>(null);
  const [carrierFound, setCarrierFound] = useState<boolean>(true);
  const [reconcileTracking, setReconcileTracking] = useState<string>("");
  const [reconciling, setReconciling] = useState<boolean>(false);

  // Attempts drawer
  const [attemptsTarget, setAttemptsTarget] = useState<ShipmentItem | null>(null);
  const [attempts, setAttempts] = useState<ShipmentAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState<boolean>(false);

  // RTO dialog
  const [rtoTarget, setRtoTarget] = useState<ShipmentItem | null>(null);
  const [rtoCondition, setRtoCondition] = useState<"INTACT" | "DAMAGED">("INTACT");
  const [rtoNotes, setRtoNotes] = useState<string>("Bao bì còn nguyên vẹn khi hàng hoàn về kho.");
  const [submittingRto, setSubmittingRto] = useState<boolean>(false);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);

  const handleDeliver = async (item: ShipmentItem) => {
    if (!window.confirm(`Xác nhận kiện hàng ${item.shipmentCode} (${item.trackingCode || ""}) đã giao thành công cho khách hàng?`)) return;
    setDeliveringId(item.id);
    try {
      await adminClient.post(`/admin/shipments/${item.id}/deliver`, {});
      fetchShipments();
    } catch (err: any) {
      alert(`Lỗi xác nhận giao hàng: ${err?.message || "Không thể cập nhật"}`);
    } finally {
      setDeliveringId(null);
    }
  };

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Tra cứu danh sách shipments từ API admin
      const params = new URLSearchParams();
      if (carrierFilter) params.set("carrier", carrierFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (tab === "incident") params.set("status", "CREATION_UNKNOWN");
      if (tab === "rto") params.set("status", "RETURNING");

      const res = await adminClient.get<any>(`/admin/shipments?${params.toString()}`).catch(async () => {
        // Fallback tra cứu qua fulfillment tasks nếu route direct chưa bọc
        const fallback = await adminClient.get<any>("/admin/fulfillment/tasks/handover");
        const mapped = (fallback.items || []).map((it: any) => ({
          id: it.id,
          shipmentCode: it.fulfillmentOrderNumber,
          orderNumber: it.orderNumber,
          carrierCode: it.shippingServiceCode,
          trackingCode: it.trackingCode,
          status: it.status,
          codAmount: 0,
          shippingFee: 22000,
          recipientName: it.recipientName,
          recipientPhone: it.recipientPhone,
          createdAt: it.allocatedAt || new Date().toISOString(),
          attemptCount: 0,
        }));
        return { items: mapped };
      });

      const list: ShipmentItem[] = res.items || res.data || (Array.isArray(res) ? res : []);
      setShipments(list);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách vận đơn.");
    } finally {
      setLoading(false);
    }
  }, [tab, carrierFilter, statusFilter]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // Xem lịch sử delivery attempts
  const handleOpenAttempts = async (item: ShipmentItem) => {
    try {
      setAttemptsTarget(item);
      setLoadingAttempts(true);
      const res = await adminClient.get<ShipmentAttempt[]>(`/admin/shipments/${item.id}/attempts`);
      setAttempts(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setAttempts([]);
    } finally {
      setLoadingAttempts(false);
    }
  };

  // Xác nhận đối soát sự cố CREATION_UNKNOWN
  const handleConfirmReconcile = async () => {
    if (!reconcileTarget) return;
    try {
      setReconciling(true);
      await adminClient.post(`/admin/shipments/${reconcileTarget.id}/reconcile`, {
        carrierFound,
        trackingCode: carrierFound ? reconcileTracking.trim() || undefined : undefined,
      });
      setReconcileTarget(null);
      fetchShipments();
    } catch (err: any) {
      alert(err?.message || "Lỗi khi đối soát vận đơn");
    } finally {
      setReconciling(false);
    }
  };

  // Tiếp nhận hàng hoàn RTO
  const handleConfirmRto = async () => {
    if (!rtoTarget) return;
    try {
      setSubmittingRto(true);
      await adminClient.post(`/admin/shipments/${rtoTarget.id}/receive-rto`, {
        condition: rtoCondition,
        notes: rtoNotes,
      });
      setRtoTarget(null);
      fetchShipments();
    } catch (err: any) {
      alert(err?.message || "Lỗi tiếp nhận hàng hoàn");
    } finally {
      setSubmittingRto(false);
    }
  };

  const filtered = shipments.filter((it) => {
    if (tab === "incident" && it.status !== "CREATION_UNKNOWN") return false;
    if (tab === "rto" && !["RETURNING", "RETURNED_TO_ORIGIN"].includes(it.status)) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      it.shipmentCode.toLowerCase().includes(q) ||
      (it.trackingCode && it.trackingCode.toLowerCase().includes(q)) ||
      (it.orderNumber && it.orderNumber.toLowerCase().includes(q)) ||
      (it.recipientName && it.recipientName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Tab Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full flex-nowrap">
          <button
            onClick={() => setTab("all")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
              tab === "all"
                ? "bg-[#C85A70] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span>Tất Cả Vận Đơn</span>
          </button>

          <button
            onClick={() => setTab("incident")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
              tab === "incident"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Sự Cố CREATION_UNKNOWN</span>
          </button>

          <button
            onClick={() => setTab("rto")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
              tab === "rto"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Kiện Chuyển Hoàn (RTO)</span>
          </button>
        </div>

        <button
          onClick={fetchShipments}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã vận đơn, tracking, người nhận..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C85A70]/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700"
          >
            <option value="">Tất cả đối tác 3PL</option>
            <option value="GHN">Giao Hàng Nhanh (GHN)</option>
            <option value="AHAMOVE">Ahamove Express</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C85A70]" />
            <p>Đang tải danh sách vận đơn...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-800 text-sm">Không tìm thấy vận đơn</p>
            <p className="text-slate-400 mt-1">Không có kiện hàng nào khớp với điều kiện lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Mã Kiện / Vận Đơn</th>
                  <th className="py-3.5 px-4">Đối Tác 3PL</th>
                  <th className="py-3.5 px-4">Tracking Code</th>
                  <th className="py-3.5 px-4">COD / Cước</th>
                  <th className="py-3.5 px-4">Người Nhận</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {item.shipmentCode}
                      {item.orderNumber && (
                        <div className="text-[11px] text-slate-400 font-normal">
                          Đơn: {item.orderNumber}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {item.carrierCode}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      {item.trackingCode || (
                        <span className="text-slate-400 font-normal italic">Chưa có mã</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        COD: <strong className="text-slate-900">{item.codAmount.toLocaleString("vi-VN")} đ</strong>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Cước: {item.shippingFee.toLocaleString("vi-VN")} đ
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{item.recipientName || "Khách hàng"}</div>
                      <div className="text-[11px] text-slate-400">{item.recipientPhone}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          item.status === "DELIVERED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : item.status === "CREATION_UNKNOWN"
                            ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                            : item.status === "RETURNING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {/* Xem lịch sử giao */}
                      <button
                        onClick={() => handleOpenAttempts(item)}
                        title="Xem lịch sử các lần giao hàng"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      {/* Nút xác nhận giao hàng DELIVERED */}
                      {["HANDED_OVER", "IN_TRANSIT", "DELIVERING", "PICKED_UP", "CREATED"].includes(item.status) && (
                        <button
                          onClick={() => handleDeliver(item)}
                          disabled={deliveringId === item.id}
                          title="Xác nhận giao hàng thành công (DELIVERED)"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold transition shadow-sm inline-flex items-center gap-1"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>{deliveringId === item.id ? "Đang lưu…" : "Giao thành công"}</span>
                        </button>
                      )}

                      {/* Nút đối soát phục hồi CREATION_UNKNOWN */}
                      {item.status === "CREATION_UNKNOWN" && (
                        <button
                          onClick={() => {
                            setReconcileTarget(item);
                            setCarrierFound(true);
                            setReconcileTracking("");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition shadow-sm"
                        >
                          Đối soát phục hồi
                        </button>
                      )}

                      {/* Nút tiếp nhận RTO khi đang RETURNING */}
                      {item.status === "RETURNING" && (
                        <button
                          onClick={() => {
                            setRtoTarget(item);
                            setRtoCondition("INTACT");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition shadow-sm"
                        >
                          Nhận RTO
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Reconcile CREATION_UNKNOWN */}
      {reconcileTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Đối Soát Vận Đơn Gián Đoạn (CREATION_UNKNOWN)
                </h3>
                <p className="text-xs text-slate-500">Mã kiện: {reconcileTarget.shipmentCode}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Khi tạo vận đơn sang đối tác, yêu cầu bị timeout quá 15s. Hãy kiểm tra trên cổng quản lý của đối tác 3PL xem đơn đã thực sự phát sinh hay chưa:
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="carrierFound"
                    checked={carrierFound}
                    onChange={() => setCarrierFound(true)}
                  />
                  <span>Đơn <strong>ĐÃ TỒN TẠI</strong> trên hệ thống đối tác $\rightarrow$ chuyển trạng thái sang <strong>CREATED</strong></span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="carrierFound"
                    checked={!carrierFound}
                    onChange={() => setCarrierFound(false)}
                  />
                  <span>Đơn <strong>CHƯA TỒN TẠI</strong> $\rightarrow$ đưa về <strong>PENDING_CREATION</strong> để phát lệnh lại an toàn</span>
                </label>
              </div>

              {carrierFound && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã vận đơn đối tác cấp (Tracking Code):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: GHN123456 hoặc AHA..."
                    value={reconcileTracking}
                    onChange={(e) => setReconcileTracking(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReconcileTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={reconciling}
                onClick={handleConfirmReconcile}
                className="px-4 py-2 rounded-xl bg-[#C85A70] hover:bg-[#b04a5e] text-white text-xs font-bold transition disabled:opacity-50"
              >
                {reconciling ? "Đang xử lý..." : "Xác nhận đối soát"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Receive RTO */}
      {rtoTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Tiếp Nhận Kiện Hàng Hoàn Về Kho (Receive RTO)
                </h3>
                <p className="text-xs text-slate-500">Mã kiện: {rtoTarget.shipmentCode}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Kiểm tra hiện trạng hộp hàng khi bưu tá mang trả lại kho:
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="rtoCondition"
                    checked={rtoCondition === "INTACT"}
                    onChange={() => setRtoCondition("INTACT")}
                  />
                  <span>Hàng <strong>NGUYÊN VẸN (INTACT)</strong> $\rightarrow$ Nhập lại Tồn kho bán được (Sellable Stock)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="rtoCondition"
                    checked={rtoCondition === "DAMAGED"}
                    onChange={() => setRtoCondition("DAMAGED")}
                  />
                  <span>Hàng <strong>HỎNG / RÁCH SEAL (DAMAGED)</strong> $\rightarrow$ Chuyển vào Kho cách ly (Quarantined)</span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú kiểm tra:</label>
                <textarea
                  rows={2}
                  value={rtoNotes}
                  onChange={(e) => setRtoNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRtoTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submittingRto}
                onClick={handleConfirmRto}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {submittingRto ? "Đang ghi nhận..." : "Xác nhận nhập kho hoàn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Lịch sử Delivery Attempts */}
      {attemptsTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-50">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Lịch Sử Các Lần Thử Giao Hàng</h3>
                  <p className="text-xs text-slate-500">Mã: {attemptsTarget.shipmentCode}</p>
                </div>
                <button
                  onClick={() => setAttemptsTarget(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {loadingAttempts ? (
                <div className="p-8 text-center text-xs text-slate-400">Đang tải lịch sử...</div>
              ) : attempts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Chưa ghi nhận lần thử giao thất bại nào.
                </div>
              ) : (
                <div className="space-y-3">
                  {attempts.map((att) => (
                    <div key={att.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>Lần thử #{att.attemptNumber}</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {new Date(att.attemptedAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <p className="text-rose-700 font-semibold">Lý do: {att.reason || "Khách hẹn lại"}</p>
                      {att.notes && <p className="text-slate-500">Ghi chú: {att.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => setAttemptsTarget(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
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
