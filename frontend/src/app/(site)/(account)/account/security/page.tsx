import Link from "next/link";
import { LockKeyhole, ShieldCheck, Mail, ArrowRight } from "lucide-react";
import { AccountHeading } from "@/features/account/account-ui";
export const metadata = { title: "Bảo mật tài khoản | GlowUp" };
export default function Page() {
  return (
    <section className="account-screen">
      <AccountHeading
        title="Bảo mật tài khoản"
        description="Bảo vệ thông tin cá nhân và giữ quyền truy cập tài khoản an toàn."
      />
      <section className="account-surface">
        <div className="account-surface-header">
          <h2>
            <LockKeyhole size={22} style={{ display: "inline", marginRight: 10 }} />
            Đặt lại mật khẩu tài khoản
          </h2>
        </div>
        <div className="account-tip">
          <Mail size={22} />
          <p>
            Liên kết đặt lại mật khẩu sẽ được gửi đến email đăng ký. Mở liên kết từ email để xác
            nhận và tạo mật khẩu mới.
          </p>
        </div>
        <Link className="button" href="/forgot-password" style={{ marginTop: 24 }}>
          Gửi liên kết đặt lại mật khẩu <ArrowRight size={16} />
        </Link>
      </section>
      <div className="account-tip">
        <ShieldCheck size={22} />
        <p>
          Dùng mật khẩu riêng cho GlowUp, giữ kín liên kết xác thực và đăng xuất sau khi sử dụng
          thiết bị dùng chung.
        </p>
      </div>
    </section>
  );
}
