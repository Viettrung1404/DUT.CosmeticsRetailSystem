import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/widgets/site-shell";
import { ArrowRight, Grid2X2, House, Leaf } from "lucide-react";
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="site-container state-main">
        <div className="error-number" aria-label="404">
          <span>4</span>
          <Leaf aria-hidden="true" />
          <span>4</span>
        </div>
        <p className="state-label">TRANG KHÔNG TỒN TẠI</p>
        <h1>Ôi! Trang bạn tìm kiếm không tồn tại</h1>
        <p>
          Có vẻ như đường dẫn này đã thay đổi hoặc sản phẩm làm đẹp bạn đang tìm kiếm đã được chuyển
          sang danh mục mới. Đừng lo lắng, hãy để GlowUp đồng hành cùng bạn tiếp tục hành trình làm
          đẹp!
        </p>
        <form action="/search" className="state-search" role="search">
          <label htmlFor="lost-search" className="sr-only">
            Tìm sản phẩm bạn yêu thích
          </label>
          <input
            id="lost-search"
            name="q"
            placeholder="Tìm son kem lì, serum phục hồi, kem chống nắng…"
            required
            maxLength={200}
          />
          <button className="button">
            Tìm kiếm
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="state-suggestions">
          <Link href="/flash-sale">⚡ Flash Sale</Link>
          <Link href="/promotions">Khuyến mãi</Link>
          <Link href="/new-arrivals">Hàng mới về</Link>
        </div>
        <div className="state-actions">
          <Link className="button" href="/">
            <House size={18} /> Về trang chủ GlowUp
          </Link>
          <Link className="button secondary" href="/products">
            <Grid2X2 size={18} /> Xem tất cả sản phẩm
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
