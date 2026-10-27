import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/widgets/site-shell";
export default function NotFound() {
  return <><SiteHeader/><main id="main-content" className="site-container state-main"><p className="error-number">404</p><h1>Trang này chưa được tìm thấy</h1><p>Đường dẫn có thể đã thay đổi hoặc nội dung chưa được mở.</p><Link className="button" href="/">Quay lại trang chủ</Link><form action="/search" className="state-search" role="search"><label htmlFor="lost-search">Tìm sản phẩm bạn yêu thích</label><input id="lost-search" name="q" required maxLength={200}/><button className="button secondary">Tìm kiếm</button></form></main><SiteFooter/></>;
}
