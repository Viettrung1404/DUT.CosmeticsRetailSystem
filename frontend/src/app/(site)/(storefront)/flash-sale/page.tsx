import Link from "next/link";
import { FlashGrid } from "@/features/catalog/components";
import { getFlashCards } from "@/features/catalog/server";
export const metadata = { title: "Flash Sale | GlowUp" };
export default async function FlashSalePage() {
  const cards = await getFlashCards();
  return (
    <main id="main-content" className="catalog-page site-container">
      <nav className="catalog-breadcrumb">
        <Link href="/">Trang chủ</Link> / Flash Sale
      </nav>
      <div className="catalog-heading">
        <div>
          <p className="catalog-overline">GLOWUP BEAUTY RETAIL</p>
          <h1>DEAL ĐẸP CÓ HẠN ⚡</h1>
          <p>Ưu đãi đang diễn ra. Giá và quota được xác nhận khi đặt hàng.</p>
        </div>
      </div>
      <FlashGrid cards={cards} />
    </main>
  );
}
export const dynamic = "force-dynamic";
