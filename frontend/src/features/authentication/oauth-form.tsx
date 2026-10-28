"use client";
import Link from "next/link";
import Image from "next/image";
import { Link2, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { FormField } from "@/shared/ui/form-field";
import { authPost, authMessage } from "./client";
import { sessionChanged } from "./session-change";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { safeReturnTo } from "@/shared/auth/contracts";
export function OAuthForm({ code, returnTo }: { code: string | null; returnTo?: string }) {
  const hydrated = useHydrated();
  const [message, setMessage] = useState(""); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false);
  const { register, handleSubmit } = useForm<{ email: string; verificationToken: string }>(); const query = useQueryClient();
  if (!code) return <section className="auth-form" aria-busy={!hydrated}><Image className="auth-emblem" src="/images/stitch/glowup-logo.webp" width={64} height={64} alt="GlowUp"/><span className="auth-state-icon"><ShieldCheck size={30}/></span><p className="eyebrow">BẢO VỆ TÀI KHOẢN GLOWUP</p><h1>Phiên xác thực đã hết hạn</h1><p className="muted">Hãy bắt đầu lại từ trang đăng nhập trên cùng trình duyệt.</p><Link className="button" href="/login">Về trang đăng nhập</Link></section>;
  const linking = code === "ACCOUNT_LINK_REQUIRED";
  return <section className="auth-form" aria-busy={!hydrated || busy}><Image className="auth-emblem" src="/images/stitch/glowup-logo.webp" width={64} height={64} alt="GlowUp"/><p className="eyebrow"><ShieldCheck size={16}/> BẢO VỆ TÀI KHOẢN GLOWUP</p><h1>{linking ? "Thêm một bước để liên kết tài khoản" : "Xác nhận email của bạn"}</h1><p className="muted">Xác nhận thông tin kết nối để bảo vệ tài khoản của bạn.</p><ol className="recovery-steps"><li aria-current={!sent ? "step" : undefined}><Mail size={16}/>1. Xác nhận email</li><li aria-current={sent ? "step" : undefined}><Link2 size={16}/>2. Liên kết GlowUp</li></ol><p className="notice">Nhập email để nhận mã xác nhận. Mã chỉ có hiệu lực trong thời gian xác thực, tối đa 10 phút.</p>{linking && <p>Đăng nhập vào tài khoản cần liên kết trước khi xác nhận. <Link href="/login?returnTo=/oauth/continue">Đăng nhập tài khoản →</Link></p>}
    {message && <p role="status" className="notice">{message}</p>}<form method="post" onSubmit={(event) => { void handleSubmit(async (values) => { setBusy(true); setMessage(""); try {
      if (!sent) { await authPost("oauth/email", { email: values.email }); setSent(true); setMessage("Email xác nhận đã được gửi."); }
      else { const result = await authPost(linking ? "oauth/link" : "oauth/complete", { verificationToken: values.verificationToken }); await sessionChanged(query, result.cart === "pending" ? "/account?cartMerge=pending" : safeReturnTo(returnTo)); }
    } catch (e) { setMessage(authMessage(e)); } finally { setBusy(false); } })(event); }}>
      {!sent ? <FormField id="oauth-email" label="Email tài khoản" type="email" required autoComplete="email" {...register("email")}/> : <FormField id="oauth-proof" label="Mã xác nhận nhận qua email" required minLength={64} maxLength={64} autoComplete="one-time-code" {...register("verificationToken")}/>}
      <button className="button full" disabled={!hydrated || busy}>{busy ? "Đang xử lý…" : sent ? "Xác nhận" : "Gửi email xác nhận"}</button></form></section>;
}
