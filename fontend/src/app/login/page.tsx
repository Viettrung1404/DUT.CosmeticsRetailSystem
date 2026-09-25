"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "@/store/useAuthStore";

const loginSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không đúng định dạng"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginFormValues) => {
    login({ email: data.email, role: "Customer" });
    router.push("/");
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">GlowUp</p>
        <h1 className="mt-3 text-center text-3xl font-bold text-gray-900">Đăng nhập</h1>
        <p className="mt-2 text-center text-sm text-gray-500">Chào mừng bạn quay lại với GlowUp</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              {...register("email")}
              type="email"
              className={`w-full rounded-xl border px-3 py-2.5 outline-none focus:border-rose-400 ${errors.email ? "border-red-400" : "border-gray-300"}`}
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input
              {...register("password")}
              type="password"
              className={`w-full rounded-xl border px-3 py-2.5 outline-none focus:border-rose-400 ${errors.password ? "border-red-400" : "border-gray-300"}`}
              placeholder="Nhập mật khẩu"
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400" />
              Ghi nhớ đăng nhập
            </label>
            <Link href="/forgot-password" className="font-medium text-rose-500 hover:text-rose-600">Quên mật khẩu?</Link>
          </div>

          <button type="submit" className="w-full rounded-full bg-gray-900 px-4 py-3 font-semibold text-white transition hover:bg-rose-500">
            Đăng nhập
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Chưa có tài khoản? <Link href="/register" className="font-semibold text-rose-500">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}