"use client";

import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { Mail, Lock, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const tAuth = useTranslations("auth");
  const { apiLogin } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    setIsLoading(true);
    setUnverifiedEmail(null);

    try {
      // Try real API first
      await apiLogin({ email, password });
      toast.success("Đăng nhập thành công!");
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại";
      if (
        msg.includes("ECONNREFUSED") ||
        msg.includes("fetch failed") ||
        msg.includes("Failed to fetch") ||
        msg.includes("Network Error")
      ) {
        toast.error("Lỗi kết nối đến máy chủ. Vui lòng kiểm tra lại dịch vụ Backend!");
      } else if (msg.toLowerCase().includes("chưa được xác thực") || msg.toLowerCase().includes("unverified")) {
        setUnverifiedEmail(email);
        toast.error("Tài khoản chưa được xác thực email. Vui lòng kích hoạt tài khoản!");
      } else {
        toast.error(msg || "Email hoặc mật khẩu không đúng");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] bg-transparent">
      {/* Left side - Image */}
      <div className="relative hidden w-1/2 lg:block">
        <div className="absolute inset-0 bg-primary-rose/10 z-10"></div>
        <Image 
          src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=2000" 
          alt="Glow-Up Login" 
          fill 
          className="object-cover" 
        />
        <div className="absolute bottom-12 left-12 z-20 max-w-md text-white font-poppins">
          <h2 className="text-3xl font-bold font-serif">Your Radiant Ritual Awaits.</h2>
          <p className="mt-4 text-sm font-medium opacity-90 leading-relaxed">
            {tAuth("loginSubtitle")}
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-32">
        <div className="mx-auto w-full max-w-sm font-poppins">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-text-primary">{tAuth("loginTitle")}</h1>
            <p className="mt-2 text-sm text-text-secondary">{tAuth("loginSubtitle")}</p>
          </div>

          <form onSubmit={handleLogin} className="mt-10 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">{tAuth("email")}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-nude/60 bg-surface py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary-rose" 
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">{tAuth("password")}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-nude/60 bg-surface py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary-rose" 
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-nude/60 text-primary-rose accent-primary-rose" />
                <span className="text-text-secondary font-medium">{tAuth("rememberMe")}</span>
              </label>
              <Link href="/forgot-password" className="font-semibold text-primary-rose hover:underline">
                {tAuth("forgotPassword")}
              </Link>
            </div>

            {unverifiedEmail && (
              <div className="rounded-xl border border-status-warning/40 bg-status-warning/10 p-3.5 text-xs animate-in fade-in">
                <p className="font-semibold text-status-warning mb-1">Tài khoản chưa xác thực email</p>
                <p className="text-text-secondary mb-2">Vui lòng kích hoạt email để có thể đăng nhập vào GlowUp.</p>
                <Link
                  href={`/auth/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                  className="font-bold text-primary-rose hover:underline inline-flex items-center"
                >
                  Bấm vào đây để xác thực ngay
                </Link>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-text-primary py-3.5 text-sm font-semibold text-white transition hover:bg-primary-rose disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-95"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {tAuth("signIn")}...</>
              ) : (
                <>{tAuth("signIn")}</>
              )}
            </button>

            <div className="relative flex items-center justify-center">
              <div className="absolute w-full border-t border-nude/60"></div>
              <span className="relative bg-background px-4 text-xs font-medium uppercase tracking-wider text-text-secondary">{tAuth("orContinueWith")}</span>
            </div>

            <button type="button" className="flex w-full items-center justify-center gap-3 rounded-full border border-nude/60 bg-surface py-3.5 text-sm font-semibold text-text-primary transition hover:border-primary-rose hover:shadow-sm">
              <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={18} height={18} />
              Google
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-text-secondary">
            {tAuth("dontHaveAccount")}{" "}
            <Link href="/register" className="font-bold text-primary-rose hover:underline">
              {tAuth("signUp")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
