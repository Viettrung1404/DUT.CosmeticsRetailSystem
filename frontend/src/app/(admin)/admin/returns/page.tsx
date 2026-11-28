import React from "react";
import { RmaQueues } from "@/features/admin-returns/rma-queues";

export const metadata = {
  title: "Hàng Đợi Đổi Trả & KCS (RMA) | GlowUp Operations Portal",
  description: "Xử lý hồ sơ đổi trả, tiếp nhận showroom, kiểm định KCS và quyết toán tài chính",
};

export default function AdminReturnsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Quản Lý Đổi Trả, Thu Hồi & Kiểm Định Chất Lượng (RMA)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quy trình 4 bước khép kín: CS duyệt hồ sơ và video unboxing $\rightarrow$ Tiếp nhận tại Showroom/Kho $\rightarrow$ KCS kiểm định tem seal $\rightarrow$ Quyết toán tài chính hoàn tiền.
        </p>
      </div>

      <RmaQueues />
    </div>
  );
}
