"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  Package,
  Truck,
  Search,
  RefreshCw,
  Flame,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Check,
  X,
  Calendar,
  Layers,
} from "lucide-react";
import { adminClient } from "@/shared/api/admin-client";
import { useAdminScope } from "@/shared/auth/admin-guard";
import { TaskQueueItem, TaskQueueResponse, PickListResponse } from "./contracts";

type QueueType = "picking" | "packing" | "handover";

export function FulfillmentQueueTables() {
  const { activeStoreId, activeStore } = useAdminScope();
  const [activeTab, setActiveTab] = useState<QueueType>("picking");
  const [items, setItems] = useState<TaskQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Picking Modal State
  const [pickingTarget, setPickingTarget] = useState<TaskQueueItem | null>(null);
  const [pickList, setPickList] = useState<PickListResponse | null>(null);
  const [loadingPickList, setLoadingPickList] = useState<boolean>(false);
  const [actionProcessing, setActionProcessing] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (activeStoreId) {
        params.set("storeId", activeStoreId);
      }

      const res = await adminClient.get<TaskQueueResponse>(
        `/admin/fulfillment/tasks/${activeTab}?${params.toString()}`
      );

      setItems(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || "Không thể tải dữ liệu hàng đợi.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeStoreId, page]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Open Picking Modal & Load Pick List
  const handleOpenPickingModal = async (item: TaskQueueItem) => {
    setPickingTarget(item);
    setPickList(null);
    setActionSuccessMsg(null);
    try {
      setLoadingPickList(true);
      const data = await adminClient.get<PickListResponse>(
        `/admin/fulfillment-orders/${item.id}/pick-list`
      );
      setPickList(data);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách nhặt hàng.");
    } finally {
      setLoadingPickList(false);
    }
  };

  // Execute Start Picking
  const handleStartPicking = async () => {
    if (!pickingTarget) return;
    try {
      setActionProcessing(true);
      await adminClient.post(
        `/admin/fulfillment-orders/${pickingTarget.id}/start-picking`,
        {}
      );
      setActionSuccessMsg("Đã chuyển trạng thái sang PICKING (Đang nhặt hàng).");
      // Reload pick list
      const data = await adminClient.get<PickListResponse>(
        `/admin/fulfillment-orders/${pickingTarget.id}/pick-list`
      );
      setPickList(data);
      fetchQueue();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi bắt đầu nhặt hàng.");
    } finally {
      setActionProcessing(false);
    }
  };

  // Execute Complete Picking with FEFO
  const handleCompletePicking = async () => {
    if (!pickingTarget || !pickList) return;
    try {
      setActionProcessing(true);

      // If status is still ALLOCATED, start picking first
      if (pickList.status === "ALLOCATED" || pickingTarget.status === "ALLOCATED") {
        await adminClient.post(
          `/admin/fulfillment-orders/${pickingTarget.id}/start-picking`,
          {}
        );
      }

      // Complete picking with assigned FEFO lots
      const payload = {
        items: pickList.items.map((it) => ({
          variantId: it.variantId,
          batchCode: it.batchCode,
          quantity: it.quantity,
          barcode: it.barcode,
        })),
      };

      await adminClient.post(
        `/admin/fulfillment-orders/${pickingTarget.id}/complete-picking`,
        payload
      );

      setActionSuccessMsg("Đã hoàn tất nhặt hàng theo chuẩn FEFO! Chuyển sang PICKED.");
      setTimeout(() => {
        setPickingTarget(null);
        setActiveTab("packing");
        fetchQueue();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || "Lỗi khi hoàn tất nhặt hàng.");
    } finally {
      setActionProcessing(false);
    }
  };

  // Confirm Handover
  const handleConfirmHandover = async (foId: string) => {
    try {
      setActionProcessing(true);
      setError(null);
      await adminClient.post(
        `/admin/fulfillment-orders/${foId}/confirm-handover`,
        {}
      );
      await fetchQueue();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi xác nhận bàn giao.");
    } finally {
      setActionProcessing(false);
    }
  };

  // Helper check for Ahamove 2H
  const isAhamove2HCheck = (item: TaskQueueItem) => {
    const sCode = (item.shippingServiceCode || "").toUpperCase();
    const dMethod = (item.deliveryMethod || "").toUpperCase();
    return (
      sCode.includes("2H") ||
      sCode.includes("AHAMOVE") ||
      sCode.includes("EXPRESS") ||
      dMethod.includes("2H")
    );
  };

  // Lọc tìm kiếm local theo mã FO hoặc mã đơn & Ưu tiên Ahamove 2H lên đầu
  const filteredItems = items
    .filter((it) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        it.fulfillmentOrderNumber.toLowerCase().includes(q) ||
        (it.orderNumber && it.orderNumber.toLowerCase().includes(q)) ||
        (it.recipientName && it.recipientName.toLowerCase().includes(q)) ||
        (it.trackingCode && it.trackingCode.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const aExpress = isAhamove2HCheck(a) ? 1 : 0;
      const bExpress = isAhamove2HCheck(b) ? 1 : 0;
      return bExpress - aExpress;
    });

  return (
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("picking");
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === "picking"
                ? "bg-[#C85A70] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>1. Hàng Đợi Nhặt Hàng (Picking)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("packing");
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === "packing"
                ? "bg-[#C85A70] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>2. Hàng Đợi Đóng Gói (Packing)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("handover");
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === "handover"
                ? "bg-[#C85A70] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>3. Hàng Đợi Bàn Giao (Handover)</span>
          </button>
        </div>

        {/* Refresh & Store indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã FO, mã đơn, tên khách hoặc mã vận đơn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C85A70]/20 focus:border-[#C85A70] transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Hiển thị <strong>{filteredItems.length}</strong> / <strong>{total}</strong> đơn
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C85A70]" />
            <p>Đang tải hàng đợi...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-800 text-sm">Hàng đợi hiện đang trống</p>
            <p className="text-slate-400 mt-1">Không có đơn hàng nào cần xử lý tại mục này.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Mã Fulfillment (FO)</th>
                  <th className="py-3.5 px-4">Mã Đơn Gốc</th>
                  <th className="py-3.5 px-4">Phương Thức Giao</th>
                  <th className="py-3.5 px-4">SL Món</th>
                  <th className="py-3.5 px-4">Người Nhận</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isAhamove2H = isAhamove2HCheck(item);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isAhamove2H ? "bg-rose-50/20" : ""
                      }`}
                    >
                      {/* Mã FO */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {item.fulfillmentOrderNumber}
                      </td>

                      {/* Mã Đơn Gốc */}
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {item.orderNumber || "—"}
                      </td>

                      {/* Phương Thức Giao (Ahamove 2H vs GHN) */}
                      <td className="py-3.5 px-4">
                        {isAhamove2H ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            <Flame className="w-3.5 h-3.5 text-rose-600" />
                            Ahamove 2H (Hỏa tốc)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {item.shippingServiceCode || "GHN Standard"}
                          </span>
                        )}
                      </td>

                      {/* SL Món */}
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {item.totalItemsCount} sp
                      </td>

                      {/* Người Nhận */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{item.recipientName || "Khách hàng"}</div>
                        {item.recipientPhone && (
                          <div className="text-[11px] text-slate-400">{item.recipientPhone}</div>
                        )}
                      </td>

                      {/* Trạng Thái */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {item.status}
                        </span>
                      </td>

                      {/* Thao Tác */}
                      <td className="py-3.5 px-4 text-right">
                        {activeTab === "packing" ? (
                          <Link
                            href={`/admin/fulfillment/${item.id}/packing`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C85A70] hover:bg-[#b04a5e] text-white text-xs font-bold transition shadow-sm"
                          >
                            <span>Đóng gói cân đo</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : activeTab === "picking" ? (
                          <button
                            onClick={() => handleOpenPickingModal(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                            <span>Nhặt hàng FEFO</span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {item.trackingCode && (
                              <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                {item.trackingCode}
                              </span>
                            )}
                            <button
                              onClick={() => handleConfirmHandover(item.id)}
                              disabled={actionProcessing}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Xác nhận bàn giao</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50 hover:bg-slate-50 font-medium"
              >
                Trước
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50 hover:bg-slate-50 font-medium"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Picking Modal */}
      {pickingTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-[#C85A70]" />
                  <span>Xác Nhận Nhặt Hàng (FEFO Picking)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đơn: <strong className="font-mono">{pickingTarget.fulfillmentOrderNumber}</strong> • Kho:{" "}
                  <strong>{pickingTarget.sourceLocationName || "Kho xuất"}</strong>
                </p>
              </div>
              <button
                onClick={() => setPickingTarget(null)}
                className="text-slate-400 hover:text-slate-600 transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}

            {loadingPickList ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#C85A70]" />
                Đang tải danh sách lô FEFO đã giữ chỗ...
              </div>
            ) : pickList && pickList.items && pickList.items.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700">
                  Danh sách sản phẩm & số lô xuất kho FEFO (Hạn dùng gần nhất xuất trước):
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {pickList.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">{it.productName}</div>
                        <div className="text-[11px] text-slate-500">
                          SKU: <span className="font-mono text-slate-700">{it.sku}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            Lô FEFO: {it.batchCode}
                          </span>
                          {it.expiryDate && (
                            <span className="text-slate-400 flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" />
                              HSD: {new Date(it.expiryDate).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          x{it.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Không tìm thấy danh sách sản phẩm hoặc đã hoàn tất.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPickingTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCompletePicking}
                disabled={actionProcessing || loadingPickList}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{actionProcessing ? "Đang xử lý..." : "Hoàn Tất Nhặt Hàng (FEFO)"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
