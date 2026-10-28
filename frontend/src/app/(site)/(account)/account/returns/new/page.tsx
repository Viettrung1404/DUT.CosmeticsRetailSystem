import { Suspense } from "react";
import { NewReturnPage } from "@/features/post-purchase/returns-pages";
export const metadata = { title: "Tạo yêu cầu đổi trả | GlowUp" };
export default function Page() {
  return (
    <Suspense fallback={<p>Đang tải…</p>}>
      <NewReturnPage />
    </Suspense>
  );
}
