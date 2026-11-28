"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Package,
  FileCheck,
} from "lucide-react";
import { adminClient } from "@/shared/api/admin-client";
import { ReturnOrder } from "./contracts";

interface InspectionFormProps {
  returnOrderId: string;
}

export function InspectionForm({ returnOrderId }: InspectionFormProps) {
  const [rma, setRma] = useState<ReturnOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inspection states per item
  const [inspections, setInspections] = useState<
    Record<
      string,
      {
        sealCondition: "INTACT" | "BROKEN" | "MISSING";
        packagingCondition: "INTACT" | "TORN" | "DAMAGED";
        disposition: "RESTOCK" | "QUARANTINE" | "SCRAP" | "RETURN_TO_CUSTOMER";
        inspectorNote: string;
      }
    >
  >({});
  const [generalNotes, setGeneralNotes] = useState<string>(
    "Kiểm định bao bì và chất lượng cảm quan đạt yêu cầu."
  );
  const [submittingInspection, setSubmittingInspection] = useState<boolean>(false);
  const [inspectionResult, setInspectionResult] = useState<any | null>(null);

  // Refund states
  const [refundPreview, setRefundPreview] = useState<any | null>(null);
  const [calculatingRefund, setCalculatingRefund] = useState<boolean>(false);
  const [createdRefund, setCreatedRefund] = useState<any | null>(null);
  const [executingRefund, setExecutingRefund] = useState<boolean>(false);

  useEffect(() => {
    async function loadRma() {
      try {
        setLoading(true);
        setError(null);
        const data = await adminClient.get<ReturnOrder>(`/admin/returns/${returnOrderId}`);
        setRma(data);
        if ((data as any).refunds && (data as any).refunds.length > 0) {
          setCreatedRefund((data as any).refunds[0]);
        }

        // Khởi tạo state kiểm định cho từng mặt hàng
        const initialMap: any = {};
        (data.items || []).forEach((it) => {
          initialMap[it.id] = {
            sealCondition: "INTACT",
            packagingCondition: "INTACT",
            disposition: "RESTOCK",
            inspectorNote: "Nguyên vẹn tem phụ và seal nhà sản xuất.",
          };
        });
        setInspections(initialMap);
      } catch (err: any) {
        setError(err?.message || "Không thể tải chi tiết hồ sơ đổi trả.");
      } finally {
        setLoading(false);
      }
    }
    loadRma();
  }, [returnOrderId]);

  // Gửi biên bản kiểm định KCS
  const handleCompleteInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rma) return;

    try {
      setSubmittingInspection(true);
      setError(null);

      const itemsPayload = (rma.items || []).map((it) => {
        const itemState = inspections[it.id] || {
          sealCondition: "INTACT",
          packagingCondition: "INTACT",
          disposition: "RESTOCK",
          inspectorNote: "",
        };
        const isPassed = itemState.disposition !== "RETURN_TO_CUSTOMER";
        const isSealIntact = itemState.sealCondition === "INTACT";
        return {
          returnItemId: it.id,
          passedQuantity: isPassed ? it.quantity : 0,
          failedQuantity: isPassed ? 0 : it.quantity,
          isSealIntact,
          remainingPercentage: 100,
          disposition: itemState.disposition,
          reasonDetail: itemState.inspectorNote || undefined,
        };
      });

      const res = await adminClient.post(`/admin/returns/${returnOrderId}/complete-inspection`, {
        inspectorNotes: generalNotes,
        items: itemsPayload,
      });

      setInspectionResult(res);
      // Reload RMA details to update status
      const updatedRma = await adminClient.get<ReturnOrder>(`/admin/returns/${returnOrderId}`);
      setRma(updatedRma);
      alert("Đã lưu biên bản kiểm định KCS thành công! Trạng thái chuyển sang RESOLUTION_PENDING.");
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu biên bản kiểm định.");
    } finally {
      setSubmittingInspection(false);
    }
  };

  // Tính toán phân bổ tiền hoàn (Preview Refund)
  const handleCalculateRefund = async () => {
    try {
      setCalculatingRefund(true);
      const res = await adminClient.post(`/admin/returns/${returnOrderId}/calculate-refund`, {});
      setRefundPreview(res);
    } catch (err: any) {
      alert("Lỗi tính tiền hoàn: " + err.message);
    } finally {
      setCalculatingRefund(false);
    }
  };

  // Khởi tạo lệnh hoàn tiền (Create Refund)
  const handleCreateRefund = async () => {
    try {
      setCalculatingRefund(true);
      const res: any = await adminClient.post(`/admin/returns/${returnOrderId}/create-refund`, {
        note: "Quyết toán hoàn tiền sau kiểm định KCS",
      });
      const refundObj = res?.data?.refund || res?.refund || res;
      setCreatedRefund(refundObj);
      alert("Đã khởi tạo lệnh hoàn tiền thành công!");
    } catch (err: any) {
      alert("Lỗi khởi tạo hoàn tiền: " + err.message);
    } finally {
      setCalculatingRefund(false);
    }
  };

  // Duyệt và Giải ngân hoàn tiền tự động (Approve & Execute)
  const handleExecuteRefund = async (refundId: string) => {
    try {
      setExecutingRefund(true);
      // 1. Phê duyệt
      await adminClient.post(`/admin/returns/refunds/${refundId}/approve`, {
        note: "Kế toán phê duyệt giải ngân",
      });
      // 2. Thực thi giải ngân
      await adminClient.post(`/admin/returns/refunds/${refundId}/execute`, {
        manualSettlementNote: "Chuyển khoản hoàn tiền qua cổng SePay/VNPay",
      });

      alert("Đã giải ngân hoàn tiền thành công tới khách hàng!");
      window.location.reload();
    } catch (err: any) {
      alert("Lỗi giải ngân hoàn tiền: " + err.message);
    } finally {
      setExecutingRefund(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Đang tải hồ sơ đổi trả...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button */}
      <div>
        <Link
          href="/admin/returns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Hàng Đợi RMA</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Mã RMA: {rma?.returnCode || returnOrderId}
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Kiểm Định KCS & Quyết Toán Hoàn Tiền
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Khách hàng: <strong>{rma?.customer?.fullName || "Khách hàng"}</strong> • Hình thức:{" "}
              <strong>{rma?.returnChannel === "STORE_DROPOFF" ? "Trả tại Showroom" : "Gửi bưu điện"}</strong>
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 self-start sm:self-auto">
            {rma?.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: QC Inspection Form */}
      <form onSubmit={handleCompleteInspection} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="w-5 h-5 text-[#C85A70]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            1. Đánh Giá Từng Sản Phẩm & Định Đoạt Tồn Kho (Disposition)
          </h2>
        </div>

        <div className="space-y-4">
          {(rma?.items || []).map((it) => {
            const current = inspections[it.id] || {
              sealCondition: "INTACT",
              packagingCondition: "INTACT",
              disposition: "RESTOCK",
              inspectorNote: "",
            };

            return (
              <div key={it.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">
                    {it.productVariant?.product?.name || it.productName || "Mỹ phẩm"} (SKU: {it.productVariant?.sku || it.sku})
                  </span>
                  <span className="text-xs font-bold text-slate-600">SL: {it.quantity}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Tình trạng Tem Seal:</label>
                    <select
                      value={current.sealCondition}
                      onChange={(e: any) =>
                        setInspections({
                          ...inspections,
                          [it.id]: { ...current, sealCondition: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="INTACT">Nguyên vẹn (INTACT)</option>
                      <option value="BROKEN">Đã rách seal (BROKEN)</option>
                      <option value="MISSING">Mất tem niêm phong (MISSING)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Tình trạng Bao bì:</label>
                    <select
                      value={current.packagingCondition}
                      onChange={(e: any) =>
                        setInspections({
                          ...inspections,
                          [it.id]: { ...current, packagingCondition: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="INTACT">Nguyên vẹn (INTACT)</option>
                      <option value="TORN">Hơi rách vỏ hộp (TORN)</option>
                      <option value="DAMAGED">Bể vỡ / Biến dạng (DAMAGED)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Quyết định tồn kho:</label>
                    <select
                      value={current.disposition}
                      onChange={(e: any) =>
                        setInspections({
                          ...inspections,
                          [it.id]: { ...current, disposition: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-rose-800"
                    >
                      <option value="RESTOCK">Nhập lại kho bán (RESTOCK)</option>
                      <option value="QUARANTINE">Cách ly kiểm tra lại (QUARANTINE)</option>
                      <option value="SCRAP">Tiêu hủy / Hàng hỏng (SCRAP)</option>
                      <option value="RETURN_TO_CUSTOMER">Trả lại khách (RETURN_TO_CUSTOMER)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Ghi chú thẩm định cho dòng sản phẩm này..."
                    value={current.inspectorNote}
                    onChange={(e) =>
                      setInspections({
                        ...inspections,
                        [it.id]: { ...current, inspectorNote: e.target.value },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <label className="block font-semibold text-slate-700 text-xs mb-1">
            Kết luận chung biên bản KCS:
          </label>
          <textarea
            rows={2}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submittingInspection}
            className="px-5 py-2.5 rounded-xl bg-[#C85A70] hover:bg-[#b04a5e] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{submittingInspection ? "Đang lưu..." : "Lưu Biên Bản Kiểm Định KCS"}</span>
          </button>
        </div>
      </form>

      {/* Section 2: Financial Settlement & Refund */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Quyết Toán Tài Chính & Hoàn Tiền (Financial Settlement)
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={calculatingRefund}
            onClick={handleCalculateRefund}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 transition"
          >
            {calculatingRefund ? "Đang tính..." : "Tính Phân Bổ Tiền Hoàn Thực Trả"}
          </button>

          <button
            type="button"
            disabled={calculatingRefund}
            onClick={handleCreateRefund}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
          >
            Khởi Tạo Lệnh Hoàn Tiền
          </button>
        </div>

        {/* Refund preview breakdown */}
        {refundPreview && (
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs space-y-2">
            <span className="font-bold text-emerald-900 block">Dự Tính Hoàn Tiền & Điểm Thưởng:</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-slate-500">Tiền hàng hoàn:</span>
                <p className="font-bold text-slate-900">
                  {(refundPreview.refundAmount || refundPreview.totalRefund || 0).toLocaleString("vi-VN")} đ
                </p>
              </div>
              <div>
                <span className="text-slate-500">Khấu trừ cước thu hồi:</span>
                <p className="font-bold text-rose-600">
                  {(refundPreview.returnShippingFee || 0).toLocaleString("vi-VN")} đ
                </p>
              </div>
              <div>
                <span className="text-slate-500">Thực hoàn tài khoản:</span>
                <p className="font-bold text-emerald-700">
                  {(refundPreview.netRefundAmount || refundPreview.refundAmount || 0).toLocaleString("vi-VN")} đ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Created Refund & Approve/Execute Action */}
        {createdRefund && (() => {
          const refundId = createdRefund?.refund?.id || createdRefund?.id || createdRefund?.refundId;
          const refundStatus = createdRefund?.refund?.status || createdRefund?.status || "PENDING";
          const refundAmount = Number(createdRefund?.refund?.amount || createdRefund?.amount || 0);

          return (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">
                    Lệnh hoàn tiền #{refundId || "NEW"}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Số tiền: <strong>{refundAmount.toLocaleString("vi-VN")} ₫</strong> • Trạng thái:{" "}
                    <span className={`font-semibold ${refundStatus === "COMPLETED" ? "text-emerald-600" : "text-amber-600"}`}>
                      {refundStatus}
                    </span>
                  </span>
                </div>
                {refundStatus !== "COMPLETED" && (
                  <button
                    type="button"
                    disabled={executingRefund || !refundId}
                    onClick={() => handleExecuteRefund(refundId)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                  >
                    {executingRefund ? "Đang giải ngân..." : "Duyệt & Giải Ngân Ngay"}
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
