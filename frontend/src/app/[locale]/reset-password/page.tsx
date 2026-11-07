"use client";

import Image from "next/image";
import { Lock, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState, Suspense } from "react";
import { Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordForm>();

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setServerError("Không tìm thấy mã xác nhận (token). Vui lòng kiểm tra lại liên kết trong email.");
      toast.error("Thiếu token xác nhận");
      return;
    }

    try {
      setIsLoading(true);
      setServerError(null);
      await authApi.resetPassword({
        token,
        newPassword: data.password,
      });
      setIsSuccess(true);
      toast.success("Đặt lại mật khẩu thành công!");
    } catch (err: any) {
      setServerError(err.message || "Đặt lại mật khẩu thất bại. Token có thể đã hết hạn.");
      toast.error(err.message || "Đổi mật khẩu thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] bg-background">
      {/* Left side - Image */}
      <div className="relative hidden w-1/2 lg:block">
        <div className="absolute inset-0 bg-primary-rose/10 z-10"></div>
        <Image 
          src="https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&q=80&w=2000" 
          alt="Glow-Up Reset Password" 
          fill 
          className="object-cover" 
        />
        <div className="absolute bottom-12 left-12 z-20 max-w-md text-white">
          <h2 className="text-3xl font-bold">Secure your account.</h2>
          <p className="mt-4 text-sm font-medium opacity-90">Choose a strong password to protect your GlowUp experience.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-32">
        <div className="mx-auto w-full max-w-sm">
          
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-text-primary">Set new password</h1>
            <p className="mt-2 text-sm text-text-secondary">Your new password must be at least 8 characters, containing uppercase, lowercase and numbers.</p>
          </div>

          <div className="mt-8">
            {!token && (
              <div className="mb-6 rounded-2xl border border-status-warning/40 bg-status-warning/10 p-4 text-xs text-status-warning flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>Không tìm thấy token trên đường dẫn. Nếu bạn vừa yêu cầu đặt lại mật khẩu, hãy nhấp vào đường link trong email gửi về.</p>
              </div>
            )}

            {isSuccess ? (
               <div className="rounded-2xl border border-status-success/30 bg-status-success/5 p-6 text-center">
                 <CheckCircle2 className="mx-auto h-8 w-8 text-status-success mb-3" />
                 <h3 className="text-base font-semibold text-text-primary">Đổi mật khẩu thành công!</h3>
                 <p className="mt-2 mb-6 text-sm text-text-secondary">Bạn có thể dùng mật khẩu mới để đăng nhập ngay bây giờ.</p>
                 <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-full bg-text-primary py-3.5 text-sm font-semibold text-white transition hover:bg-primary-rose">
                   Đăng nhập ngay
                 </Link>
               </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
                    <input 
                      type="password" 
                      {...register("password", { 
                        required: "Vui lòng nhập mật khẩu mới",
                        minLength: { value: 8, message: "Mật khẩu phải từ 8 ký tự trở lên" },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                          message: "Phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số"
                        }
                      })}
                      className={`w-full rounded-xl border bg-surface py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary-rose ${errors.password ? 'border-status-danger' : 'border-nude/60'}`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.password && <p className="mt-1.5 text-xs text-status-danger">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Confirm new password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
                    <input 
                      type="password" 
                      {...register("confirmPassword", { 
                        required: "Vui lòng xác nhận lại mật khẩu",
                        validate: (val) => {
                          if (watch('password') != val) {
                            return "Mật khẩu xác nhận không khớp";
                          }
                        }
                      })}
                      className={`w-full rounded-xl border bg-surface py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary-rose ${errors.confirmPassword ? 'border-status-danger' : 'border-nude/60'}`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.confirmPassword && <p className="mt-1.5 text-xs text-status-danger">{errors.confirmPassword.message}</p>}
                </div>

                {serverError && (
                  <div className="rounded-xl bg-status-danger/10 p-3 text-xs text-status-danger">
                    {serverError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-text-primary py-3.5 text-sm font-semibold text-white transition hover:bg-primary-rose disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang cập nhật...
                    </>
                  ) : (
                    <>
                      Đặt lại mật khẩu
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center">Đang tải...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

