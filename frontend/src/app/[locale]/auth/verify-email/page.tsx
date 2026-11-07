"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Mail, CheckCircle2, XCircle, Loader2, RefreshCw, KeyRound } from "lucide-react";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [email, setEmail] = useState(emailFromUrl);
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  // Auto verify if token is in URL query
  useEffect(() => {
    if (tokenFromUrl) {
      handleVerify(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleVerify = async (tokenToVerify?: string) => {
    const t = tokenToVerify || token;
    if (!t.trim()) {
      toast.error("Vui lòng nhập mã token xác thực");
      return;
    }

    setStatus("verifying");
    setErrorMessage("");

    try {
      await authApi.verifyEmail(t.trim());
      setStatus("success");
      toast.success("Xác thực email thành công!");
    } catch (err: unknown) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Mã xác thực không hợp lệ hoặc đã hết hạn";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error("Vui lòng nhập email cần gửi lại");
      return;
    }

    setIsResending(true);
    try {
      await authApi.resendVerification(email.trim());
      toast.success("Đã gửi lại email xác thực! Vui lòng kiểm tra hộp thư");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể gửi lại email";
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-nude/40 bg-surface p-8 md:p-10 shadow-sm text-center">
        {status === "verifying" && (
          <div className="py-8 space-y-4 animate-in fade-in">
            <div className="inline-flex p-4 rounded-full bg-primary-pink/20 text-primary-rose">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Đang xác thực email...</h2>
            <p className="text-sm text-text-secondary">Vui lòng chờ trong giây lát</p>
          </div>
        )}

        {status === "success" && (
          <div className="py-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="inline-flex p-4 rounded-full bg-status-success/15 text-status-success">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Xác thực thành công!</h2>
            <p className="text-sm text-text-secondary">
              Email của bạn đã được kích hoạt thành công. Bây giờ bạn có thể đăng nhập để trải nghiệm GlowUp.
            </p>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary-rose py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-rose/90"
            >
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="py-6 space-y-5 animate-in fade-in">
            <div className="inline-flex p-4 rounded-full bg-status-danger/15 text-status-danger">
              <XCircle className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Xác thực thất bại</h2>
            <p className="text-sm text-status-danger bg-status-danger/10 p-3 rounded-xl">
              {errorMessage || "Mã token không hợp lệ hoặc đã hết hạn"}
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-left text-xs font-semibold text-text-secondary mb-1">
                  Nhập lại mã Token xác thực
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Dán mã token vào đây..."
                    className="w-full rounded-xl border border-nude/60 bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-rose"
                  />
                </div>
              </div>

              <button
                onClick={() => handleVerify()}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-text-primary py-3 text-sm font-semibold text-white hover:bg-primary-rose transition"
              >
                Thử kích hoạt lại
              </button>
            </div>
          </div>
        )}

        {status === "idle" && (
          <div className="space-y-6">
            <div className="inline-flex p-4 rounded-full bg-primary-pink/20 text-primary-rose">
              <Mail className="h-10 w-10" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-text-primary">Xác thực tài khoản</h1>
              <p className="mt-2 text-sm text-text-secondary">
                {email ? (
                  <>Một liên kết xác thực đã được gửi đến <span className="font-semibold text-text-primary">{email}</span>.</>
                ) : (
                  "Vui lòng nhập mã token xác thực nhận được qua email để kích hoạt tài khoản."
                )}
              </p>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Mã Token xác thực
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Nhập mã token..."
                    className="w-full rounded-xl border border-nude/60 bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary-rose transition"
                  />
                </div>
              </div>

              <button
                onClick={() => handleVerify()}
                disabled={!token}
                className="w-full flex items-center justify-center rounded-full bg-primary-rose py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-rose/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Kích hoạt tài khoản
              </button>
            </div>

            <div className="border-t border-nude/40 pt-4 space-y-3">
              <p className="text-xs text-text-secondary">Không tìm thấy mã hoặc chưa nhận được email?</p>
              
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn..."
                  className="flex-1 rounded-xl border border-nude/60 bg-background px-3 py-2 text-xs outline-none focus:border-primary-rose"
                />
                <button
                  onClick={handleResend}
                  disabled={isResending || !email}
                  className="flex items-center gap-1.5 rounded-xl border border-nude/60 px-3 py-2 text-xs font-semibold text-text-primary hover:border-primary-rose hover:text-primary-rose transition disabled:opacity-50"
                >
                  {isResending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Gửi lại
                </button>
              </div>
            </div>

            <div className="pt-2 text-sm text-text-secondary">
              Đã kích hoạt xong?{" "}
              <Link href="/login" className="font-bold text-primary-rose hover:underline">
                Đăng nhập
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-rose" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
