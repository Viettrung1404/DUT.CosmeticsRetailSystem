import { Suspense } from "react";
import { ReturnsPage } from "@/features/post-purchase/returns-pages";
export const metadata = { title: "Đổi trả | GlowUp" };
export default function Page() {
  return (
    <Suspense fallback={<p>Đang tải…</p>}>
      <ReturnsPage />
    </Suspense>
  );
}
