import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Heart, MapPin, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { BrandLogo } from "@/shared/ui/brand-logo";

type AuthVariant = "login" | "register" | "recovery" | "verification" | "oauth";

const benefits = [
  { icon: ShoppingBag, title: "Theo dõi đơn hàng", description: "Quản lý và xem lại hành trình mua sắm của bạn." },
  { icon: Heart, title: "Lưu sản phẩm yêu thích", description: "Lưu giữ những lựa chọn làm đẹp dành riêng cho bạn." },
  { icon: MapPin, title: "Nhận hàng thuận tiện", description: "Quản lý địa chỉ giao hàng trong tài khoản." },
];

function AuthStory({ registration }: { registration: boolean }) {
  return <aside className={`auth-story ${registration ? "registration-story" : "login-story"}`}>
    {!registration && <Image className="story-background" src="/images/stitch/login-editorial.webp" alt="" fill loading="eager" sizes="(min-width: 1024px) 40vw, 1px"/>}
    <div className="story-intro">
      <BrandLogo caption="BEAUTY RETAIL"/>
      <span className="club-label"><Sparkles size={17}/> {registration ? "TRẢI NGHIỆM THÀNH VIÊN GLOWUP" : "GLOW MEMBER CLUB"}</span>
      <h2>{registration ? <>Gia nhập <span>GlowUp Club</span></> : <>Chạm vào vẻ đẹp<br/>tỏa sáng của bạn</>}</h2>
      <p>{registration ? "Đắm chìm trong thế giới làm đẹp, lưu những sản phẩm yêu thích và tận hưởng hành trình mua sắm dành riêng cho bạn." : "Khám phá không gian mua sắm mỹ phẩm và chăm sóc sắc đẹp, cùng những lựa chọn mang dấu ấn riêng của bạn."}</p>
    </div>
    {registration && <figure className="registration-editorial"><Image src="/images/stitch/register-editorial.webp" width={512} height={279} alt="Bộ mỹ phẩm GlowUp tông hồng với phấn phủ, son và tinh chất" loading="eager" sizes="(min-width: 1024px) 35vw, 1px"/><figcaption><strong>Vẻ đẹp theo cách của bạn</strong><span>Khám phá những điều bạn yêu thích cùng GlowUp.</span></figcaption></figure>}
    <div className="member-benefits"><h3>{registration ? "KHÔNG GIAN THÀNH VIÊN" : "TRẢI NGHIỆM DÀNH RIÊNG CHO BẠN"}</h3>{benefits.map(({ icon: Icon, title, description }) => <div className="member-benefit" key={title}><span className="benefit-icon"><Icon size={20}/></span><div><strong>{title}</strong><p>{description}</p></div></div>)}</div>
    {!registration && <p className="story-signature">GlowUp Beauty Retail <span><Sparkles size={15}/> Your beauty. Your way.</span></p>}
  </aside>;
}

export function AuthFrame({ variant, children }: { variant: AuthVariant; children: React.ReactNode }) {
  const split = variant === "login" || variant === "register";
  return <div className={`auth-frame auth-${variant}`}>
    {split && <div className="auth-topline"><Link href="/" className="back-link"><ArrowLeft size={17}/> Quay lại trang chủ</Link><span className="auth-security"><ShieldCheck size={15}/> Bảo vệ thông tin tài khoản</span></div>}
    {!split && variant === "recovery" && <div className="recovery-heading"><BrandLogo caption="BEAUTY RETAIL"/><p className="eyebrow">BẢO MẬT TÀI KHOẢN</p><h2>GlowUp Beauty</h2><p>Đồng hành cùng hành trình làm đẹp của bạn</p></div>}
    <div className={split ? "auth-card" : "auth-centered-card"}>{split && <AuthStory registration={variant === "register"}/>}{children}</div>
    {split && <div className="auth-assurances"><span><ShieldCheck/> Bảo vệ thông tin tài khoản</span><span><ShoppingBag/> Theo dõi đơn hàng dễ dàng</span><span><Heart/> Lưu giữ sản phẩm yêu thích</span><Link href="/help"><ShieldCheck/> Hỗ trợ khách hàng</Link></div>}
  </div>;
}
