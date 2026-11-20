import React from "react";
import { LotQualityAnalyticsCharts } from "@/features/admin-analytics/analytics-charts";

export const metadata = {
  title: "Chất Lượng Theo Lô & Cảnh Báo Lỗi | GlowUp Operations Portal",
  description: "Báo cáo chất lượng theo lô sản xuất FEFO, cảnh báo biến chất và so sánh tỷ lệ hư hại 3PL",
};

export default function LotQualityAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Phân Tích Chất Lượng Theo Lô & Cảnh Báo Hàng Biến Chất (Lot Quality BI)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi tỷ lệ khiếu nại dị ứng/biến chất theo từng lô sản xuất FEFO, kích hoạt `LOT_DEFECT_ALERT` và so sánh tỷ lệ bể vỡ giữa các hãng vận chuyển GHN vs Ahamove.
        </p>
      </div>

      <LotQualityAnalyticsCharts />
    </div>
  );
}
