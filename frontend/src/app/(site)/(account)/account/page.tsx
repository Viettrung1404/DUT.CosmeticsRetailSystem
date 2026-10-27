import Link from "next/link";
import { requireUser } from "@/shared/auth/guard";
import { MergeCartNotice } from "@/features/authentication/merge-cart-notice";
export default async function AccountPage() {
  const user = await requireUser();
  return <><section className="panel"><p className="eyebrow">TÀI KHOẢN CỦA BẠN</p><h1>Xin chào, {user.fullName}</h1><p className="muted">Chào mừng bạn trở lại với GlowUp.</p><p>{user.email}</p><Link className="button" href="/account/addresses">Quản lý sổ địa chỉ →</Link></section><MergeCartNotice/></>;
}
