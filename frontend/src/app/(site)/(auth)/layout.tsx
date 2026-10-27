import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Heart, ShoppingBag, MapPin } from "lucide-react";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="site-container auth-main"><Link href="/" className="back-link">← Quay lại trang chủ</Link><div className="auth-card"><aside className="auth-story"><span className="eyebrow">GLOWUP BEAUTY RETAIL</span><span className="club-label"><Sparkles size={18}/> GLOW MEMBER CLUB</span><h2>Chạm vào vẻ đẹp<br/>tỏa sáng của bạn</h2><p>Một chút yêu thương bản thân, một hành trình làm đẹp mang dấu ấn riêng.</p><div className="member-benefits"><h3>Không gian dành riêng cho bạn</h3><p><ShoppingBag/> Theo dõi đơn hàng dễ dàng</p><p><Heart/> Lưu những sản phẩm yêu thích</p><p><MapPin/> Quản lý địa chỉ nhận hàng</p></div><span className="story-signature">Your beauty. Your way.</span></aside>{children}</div></main>;
}
