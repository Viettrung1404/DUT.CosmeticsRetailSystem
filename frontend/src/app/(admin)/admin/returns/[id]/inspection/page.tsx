import React from "react";
import { InspectionForm } from "@/features/admin-returns/inspection-form";

export const metadata = {
  title: "Biên Bản Kiểm Định KCS & Quyết Toán | GlowUp Operations Portal",
  description: "Kiểm định chất lượng tem seal, vỏ hộp và giải ngân hoàn tiền",
};

export default async function ReturnInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <InspectionForm returnOrderId={id} />
    </div>
  );
}
