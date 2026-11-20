import React from "react";
import { FulfillmentQueueTables } from "@/features/admin-fulfillment/queue-tables";

export const metadata = {
  title: "WMS Fulfillment Queues | GlowUp Operations Portal",
  description: "Điều hành 3 hàng đợi kho nhặt hàng, đóng gói và bàn giao",
};

export default function AdminFulfillmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Hàng Đợi Hoàn Tất Đơn Hàng (WMS Work Queues)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi và điều phối 3 giai đoạn hoàn tất đơn hàng: Nhặt hàng (Picking), Đóng gói cân đo (Packing), và Bàn giao cho bưu tá (Handover).
        </p>
      </div>

      <FulfillmentQueueTables />
    </div>
  );
}
