import React from "react";
import { ShipmentsTable } from "@/features/admin-shipping/shipments-table";

export const metadata = {
  title: "Quản Lý Vận Đơn & Sự Cố | GlowUp Operations Portal",
  description: "Theo dõi bưu kiện 3PL, khắc phục sự cố CREATION_UNKNOWN và tiếp nhận kiện RTO",
};

export default function ShipmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Quản Lý Vận Đơn & Phục Hồi Sự Cố Logistics
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi trạng thái các bưu kiện trên mạng lưới Ahamove / GHN, đối soát phục hồi sự cố mạng `CREATION_UNKNOWN` và xử lý hàng hoàn `RETURNING` về kho.
        </p>
      </div>

      <ShipmentsTable />
    </div>
  );
}
