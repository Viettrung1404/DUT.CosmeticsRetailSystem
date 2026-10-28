import Link from "next/link";
export const metadata = { title: "Bảo mật tài khoản | GlowUp" };
export default function Page() {
  return (
    <section className="panel">
      <h1>Bảo mật tài khoản</h1>
      <p>Để đặt lại mật khẩu, hãy sử dụng email đăng ký tài khoản.</p>
      <Link className="button" href="/forgot-password">
        Đặt lại mật khẩu
      </Link>
    </section>
  );
}
