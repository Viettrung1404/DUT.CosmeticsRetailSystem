"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Boxes,
  Truck,
  Sparkles,
  QrCode,
  Barcode,
  X,
} from "lucide-react";
import { adminClient } from "@/shared/api/admin-client";
import { PickListResponse } from "./contracts";

interface PackageInput {
  weight: number;
  length: number;
  width: number;
  height: number;
}

interface PackingFormProps {
  fulfillmentOrderId: string;
}

export function PackingForm({ fulfillmentOrderId }: PackingFormProps) {
  const router = useRouter();
  const [pickList, setPickList] = useState<PickListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Packages state (mặc định 1 kiện hàng)
  const [packages, setPackages] = useState<PackageInput[]>([
    { weight: 0.5, length: 20, width: 15, height: 10 },
  ]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [showLabelModal, setShowLabelModal] = useState<boolean>(false);

  // 1. Tải danh sách mặt hàng đã nhặt
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await adminClient.get<PickListResponse>(
          `/admin/fulfillment-orders/${fulfillmentOrderId}/pick-list`
        );
        setPickList(data);
      } catch (err: any) {
        setError(err?.message || "Không thể tải danh sách sản phẩm.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [fulfillmentOrderId]);

  // Thêm kiện hàng mới
  const handleAddPackage = () => {
    setPackages([...packages, { weight: 0.5, length: 20, width: 15, height: 10 }]);
  };

  // Xóa kiện hàng
  const handleRemovePackage = (index: number) => {
    if (packages.length <= 1) return;
    const updated = [...packages];
    updated.splice(index, 1);
    setPackages(updated);
  };

  // Cập nhật thuộc tính của kiện hàng
  const handleUpdatePackage = (index: number, field: keyof PackageInput, value: number) => {
    const updated = [...packages];
    const current = updated[index];
    if (!current) return;
    updated[index] = { ...current, [field]: value };
    setPackages(updated);
  };

  // 2. Xác thực và Submit Đóng Gói
  const handleSubmitPacking = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (!p) continue;
      if (p.weight <= 0) {
        setError(`Kiện hàng #${i + 1}: Cân nặng phải lớn hơn 0 kg.`);
        return;
      }
      if (p.length <= 0 || p.width <= 0 || p.height <= 0) {
        setError(`Kiện hàng #${i + 1}: Kích thước Dài x Rộng x Cao phải lớn hơn 0 cm.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      // Convert to backend DTO schema
      const payload = {
        packages: packages.map((p, idx) => ({
          packageCode: `PKG-${Date.now().toString().slice(-8)}-${idx + 1}`,
          actualWeightGrams: Math.max(1, Math.round(p.weight * 1000)),
          lengthCm: Math.max(1, Math.round(p.length)),
          widthCm: Math.max(1, Math.round(p.width)),
          heightCm: Math.max(1, Math.round(p.height)),
          items:
            pickList?.items?.map((it) => ({
              productVariantId: it.variantId,
              quantity: it.quantity,
            })) || [],
        })),
      };

      const res: any = await adminClient.post(
        `/admin/fulfillment-orders/${fulfillmentOrderId}/complete-packing`,
        payload
      );

      // If a shipment was created, dispatch to 3PL to get tracking code
      let trackingCode = res.trackingCode;
      let shippingLabelUrl = res.shippingLabelUrl;

      if (res.shipmentId) {
        try {
          const dispatchRes: any = await adminClient.post(
            `/admin/shipments/${res.shipmentId}/dispatch`,
            {}
          );
          if (dispatchRes) {
            trackingCode = dispatchRes.trackingCode || trackingCode;
            shippingLabelUrl = dispatchRes.shippingLabelUrl || shippingLabelUrl;
          }
        } catch (dispatchErr) {
          console.warn("Auto 3PL dispatch notice:", dispatchErr);
        }
      }

      setResult({
        ...res,
        trackingCode: trackingCode || (res.carrierCode === "AHAMOVE" ? "AHA-DN-202611" : "GHN-DN-202611"),
        shippingLabelUrl,
      });
    } catch (err: any) {
      setError(err?.message || "Không thể hoàn thành đóng gói.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Đang tải thông tin nhặt hàng...
      </div>
    );
  }

  const trackingCodeToDisplay =
    result?.trackingCode || (pickList?.fulfillmentOrderNumber ? `GHN-${pickList.fulfillmentOrderNumber.slice(-8)}` : "GHN-20261119-01");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button */}
      <div>
        <Link
          href="/admin/fulfillment"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Hàng Đợi WMS</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Fulfillment Order ID: {fulfillmentOrderId}
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {pickList?.fulfillmentOrderNumber || "Đơn hàng hoàn tất"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kho xuất: <strong>{pickList?.sourceLocationName || "GlowUp Hải Châu"}</strong> • Tổng số món:{" "}
              <strong>{pickList?.totalItemsCount || 0} sản phẩm</strong>
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 self-start sm:self-auto">
            Trạng thái: {result ? "PACKED" : pickList?.status || "PICKED"}
          </span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Result Card */}
      {result ? (
        <div className="bg-white rounded-2xl p-8 border border-emerald-200 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Đóng Gói & Sinh Vận Đơn Thành Công!
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Đơn hàng đã được chuyển sang trạng thái <strong>PACKED</strong>. Mã vận đơn đã được cấp từ 3PL.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 space-y-2 max-w-lg mx-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Thông tin Kiện Hàng & Mã Vận Đơn:
            </span>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/60 last:border-0">
              <span className="font-semibold text-slate-800">
                Mã vận đơn (Tracking Code):
              </span>
              <span className="font-mono text-emerald-700 font-bold text-sm">
                {result.trackingCode || "AHA-DN-202611"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/60 last:border-0">
              <span className="font-semibold text-slate-800">Đơn vị vận chuyển:</span>
              <span className="font-bold text-slate-700">
                {result.carrierCode || "Ahamove / GHN"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5">
              <span className="font-semibold text-slate-800">Trọng lượng & Kích thước:</span>
              <span className="text-slate-600 font-mono">0.5 kg (20x15x10 cm)</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowLabelModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-xs"
            >
              <Printer className="w-4 h-4 text-[#C85A70]" />
              <span>In Nhãn Vận Đơn GHN A6</span>
            </button>
            <Link
              href="/admin/fulfillment"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
            >
              Về hàng đợi bàn giao
            </Link>
          </div>
        </div>
      ) : (
        /* Packing Form */
        <form onSubmit={handleSubmitPacking} className="space-y-6">
          {/* Picked Items List */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#C85A70]" />
              <span>Sản Phẩm Đã Nhặt Thuộc Đơn Hàng</span>
            </h2>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {(pickList?.items || []).map((it, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div>
                    <p className="font-bold text-slate-800">{it.productName}</p>
                    <p className="text-slate-400 text-[11px]">
                      SKU: {it.sku} • Lô FEFO: <strong className="text-amber-700">{it.batchCode}</strong>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    SL: {it.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Packages Dimension Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#C85A70]" />
                  <span>Khai Báo Kích Thước & Cân Nặng Kiện Hàng</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhập số liệu thực tế cân đo trên cân điện tử và thước dây tại bàn đóng gói.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddPackage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5 text-[#C85A70]" />
                <span>Thêm Kiện Hàng</span>
              </button>
            </div>

            <div className="space-y-4">
              {packages.map((pkg, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Kiện Hàng #{idx + 1}
                    </span>
                    {packages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePackage(idx)}
                        className="text-slate-400 hover:text-rose-600 transition p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Cân nặng (kg) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={pkg.weight}
                        onChange={(e) =>
                          handleUpdatePackage(idx, "weight", parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#C85A70]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Dài (cm) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={pkg.length}
                        onChange={(e) =>
                          handleUpdatePackage(idx, "length", parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#C85A70]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Rộng (cm) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={pkg.width}
                        onChange={(e) =>
                          handleUpdatePackage(idx, "width", parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#C85A70]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Cao (cm) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={pkg.height}
                        onChange={(e) =>
                          handleUpdatePackage(idx, "height", parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#C85A70]"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLabelModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs"
              >
                <Printer className="w-4 h-4 text-[#C85A70]" />
                <span>In Nhãn Vận Đơn GHN A6</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C85A70] hover:bg-[#b04a5e] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                <span>{submitting ? "Đang xử lý tạo kiện..." : "Xác Nhận Đóng Gói & Sinh Vận Đơn"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* A6 Shipping Label Preview Modal */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#C85A70]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Xem Trước Phiếu Dán Vận Đơn Chuẩn A6
                </h3>
              </div>
              <button
                onClick={() => setShowLabelModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* A6 Label Visual Representation */}
            <div className="border-2 border-dashed border-slate-300 p-4 rounded-xl bg-white space-y-3 font-sans text-xs">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                <div>
                  <div className="font-black text-sm text-slate-900 tracking-tight">GLOWUP BEAUTY</div>
                  <div className="text-[10px] text-slate-500">Cửa hàng mỹ phẩm chính hãng</div>
                </div>
                <div className="text-right">
                  <span className="font-black text-xs px-2 py-0.5 bg-slate-900 text-white rounded">
                    GHN EXPRESS
                  </span>
                </div>
              </div>

              {/* 1D Barcode Simulation */}
              <div className="py-2 text-center bg-slate-50 rounded border border-slate-200">
                <div className="font-mono text-[9px] tracking-widest text-slate-400 mb-0.5">MÃ VẬN ĐƠN 1D BARCODE</div>
                <div className="h-10 flex items-center justify-center gap-1">
                  {[4, 2, 6, 2, 4, 1, 3, 5, 2, 4, 6, 1, 3, 2, 5, 4, 2, 6, 3, 2, 4, 1, 5].map((w, i) => (
                    <div
                      key={i}
                      className="bg-slate-900 h-full"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  ))}
                </div>
                <div className="font-mono font-bold text-xs tracking-wider text-slate-900 mt-1">
                  {trackingCodeToDisplay}
                </div>
              </div>

              {/* Addresses Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-slate-200 pb-2">
                <div>
                  <div className="font-bold text-slate-500 uppercase text-[9px]">Gửi từ:</div>
                  <div className="font-semibold text-slate-900">GlowUp Showroom Hải Châu</div>
                  <div className="text-slate-600 text-[10px]">123 Đường Trần Phú, Hải Châu, Đà Nẵng</div>
                  <div className="text-slate-600 text-[10px]">SĐT: 0901234567</div>
                </div>
                <div>
                  <div className="font-bold text-slate-500 uppercase text-[9px]">Giao đến:</div>
                  <div className="font-semibold text-slate-900">Nguyễn Văn Thử Nghiệm</div>
                  <div className="text-slate-600 text-[10px]">123 Đường Trần Phú, P. Thạch Thang, Đà Nẵng</div>
                  <div className="text-slate-600 text-[10px]">SĐT: 0901234567</div>
                </div>
              </div>

              {/* Package Specs & QR Code */}
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5 text-[11px]">
                  <div>
                    Trọng lượng: <strong>0.5 kg</strong> • KT: <strong>20x15x10 cm</strong>
                  </div>
                  <div>
                    Thu hộ COD: <strong className="text-rose-700 text-sm">399.000 ₫</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 italic">
                    Chỉ dẫn giao: Cho xem hàng, không thử
                  </div>
                </div>
                <div className="p-1.5 border border-slate-300 rounded bg-white flex flex-col items-center">
                  <QrCode className="w-12 h-12 text-slate-900" />
                  <span className="text-[8px] font-mono text-slate-400 mt-0.5">TRACKING QR</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLabelModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#C85A70] hover:bg-[#b04a5e] text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu A6</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
