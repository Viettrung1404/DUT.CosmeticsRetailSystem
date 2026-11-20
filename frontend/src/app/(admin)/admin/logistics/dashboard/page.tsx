import React from "react";
import { LogisticsDashboardCharts } from "@/features/admin-analytics/analytics-charts";

export const metadata = {
  title: "Giám Sát Logistics & SLA Vận Chuyển | GlowUp Operations Portal",
  description: "Theo dõi tỷ lệ giao hàng thành công lần đầu, SLA 2H và năng suất kho",
};

export default function LogisticsDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Phân Tích Hiệu Suất Logistics & Giám Sát SLA Thời Gian Thực
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi sát sao cam kết giao hỏa tốc 2H Ahamove, tỷ lệ giao hàng thành công lần đầu và chênh lệch đối soát tiền mặt.
        </p>
      </div>

      <LogisticsDashboardCharts />
    </div>
  );
}
