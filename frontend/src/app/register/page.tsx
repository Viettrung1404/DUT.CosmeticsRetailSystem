"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "@/store/useAuthStore";

const registerSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.string().min(1, "Vui lòng nhập email").email("Email không đúng định dạng"),
  phone: z.string().min(9, "Số điện thoại không hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (data: RegisterFormValues) => {
    login({ email: data.email, role: "Customer", name: data.fullName });
    router.push("/");
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">GlowUp</p>
        <h1 className="mt-3 text-center text-3xl font-bold text-gray-900">Đăng ký tài khoản</h1>
        <p className="mt-2 text-center text-sm text-gray-500">Tạo tài khoản để lưu lịch sử mua hàng và nhận ưu đãi đặc biệt</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Họ và tên</label>
            <input {...register("fullName")} className={`w-full rounded-xl border px-3 py-2.5 outline-none focus:border-rose-400 ${errors.fullName ? "border-red-400" : "border-gray-300"}`} placeholder="Nguyễn Văn A" />
            {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input {...register("email")} type="email" className={`w-full rounded-xl border px-3 py-2.5 outline-none focus:border-rose-400 ${errors.email ? "border-red-400" : "border-gray-300"}`} placeholder="you@example.com" />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Số điện thoại</label>
            <input {...register("phone")} type="tel" className={`w-full rounded-xl border px-3 py-2.5 outline-none focus:border-rose-400 ${errors.phone ? "border-red-400" : "border-gray-300"}`} placeholder="0901234567" />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input {...register("password")} type="password" className={`w-full rounded-xl border px-3 py-2.5 outline-none focus:border-rose-400 ${errors.password ? "border-red-400" : "border-gray-300"}`} placeholder="Ít nhất 8 ký tự" />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <button type="submit" className="w-full rounded-full bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-600">
            Tạo tài khoản
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Đã có tài khoản? <Link href="/login" className="font-semibold text-rose-500">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}