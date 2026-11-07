"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";

type ForgotPasswordForm = {
  email: string;
};

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setIsLoading(true);
      setServerError(null);
      await authApi.forgotPassword(data.email);
      setIsSubmitted(true);
      toast.success("Đã gửi liên kết khôi phục mật khẩu vào email của bạn!");
    } catch (err: any) {
      setServerError(err.message || "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.");
      toast.error(err.message || "Gửi yêu cầu thất bại.");
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
          src="https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=2000" 
          alt="Glow-Up Forgot Password" 
          fill 
          className="object-cover" 
        />
        <div className="absolute bottom-12 left-12 z-20 max-w-md text-white">
          <h2 className="text-3xl font-bold">Don&apos;t worry.</h2>
          <p className="mt-4 text-sm font-medium opacity-90">We will help you recover your access so you can continue your radiant journey.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-32">
        <div className="mx-auto w-full max-w-sm">
          
          <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary-rose transition">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>

          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-text-primary">Forgot password</h1>
            <p className="mt-2 text-sm text-text-secondary">Enter your email and we&apos;ll send you a link to reset your password.</p>
          </div>

          <div className="mt-10">
            {isSubmitted ? (
              <div className="rounded-2xl border border-status-success/30 bg-status-success/5 p-6 text-center">
                <Mail className="mx-auto h-8 w-8 text-status-success mb-3" />
                <h3 className="text-base font-semibold text-text-primary">Check your email</h3>
                <p className="mt-2 text-sm text-text-secondary">We have sent a password recovery link to your email address.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
                    <input 
                      type="email" 
                      {...register("email", { required: "Email is required" })}
                      className={`w-full rounded-xl border bg-surface py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary-rose ${errors.email ? 'border-status-danger' : 'border-nude/60'}`}
                      placeholder="Enter your email"
                    />
                  </div>
                  {errors.email && <p className="mt-1.5 text-xs text-status-danger">{errors.email.message}</p>}
                </div>

                {serverError && (
                  <div className="rounded-xl bg-status-danger/10 p-3 text-xs text-status-danger">
                    {serverError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-text-primary py-3.5 text-sm font-semibold text-white transition hover:bg-primary-rose disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang gửi yêu cầu...
                    </>
                  ) : (
                    <>
                      Send reset link
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
