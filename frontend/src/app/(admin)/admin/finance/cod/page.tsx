import React from "react";
import { CodReconciliationView } from "@/features/admin-finance/cod-reconciliation-view";

export const metadata = {
  title: "Đối Soát COD & Cước Vận Chuyển | GlowUp Operations Portal",
  description: "Bảng kê đối soát định kỳ GHN, Ahamove và phát hiện sai lệch tài chính",
};

export default function CodFinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Đối Soát Tiền Thu Hộ COD & Cước Phí 3PL
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quản lý 4 giai đoạn vòng đời COD, nhập bảng kê sao kê định kỳ của GHN / Ahamove, cấn trừ cước phí và phát hiện chênh lệch tài chính.
        </p>
      </div>

      <CodReconciliationView />
    </div>
  );
}
