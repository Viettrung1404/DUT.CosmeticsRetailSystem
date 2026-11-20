import React from "react";
import { PackingForm } from "@/features/admin-fulfillment/packing-form";

export const metadata = {
  title: "Đóng Gói Cân Đo Kiện Hàng | GlowUp Operations Portal",
  description: "Nhập cân nặng, kích thước thực tế và xuất kiện hàng hoàn tất",
};

export default async function PackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <PackingForm fulfillmentOrderId={id} />
    </div>
  );
}
