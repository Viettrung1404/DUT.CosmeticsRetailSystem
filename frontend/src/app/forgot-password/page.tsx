"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">Quên mật khẩu</p>
        <h1 className="mt-3 text-3xl font-bold text-gray-900">Khôi phục tài khoản</h1>
        <p className="mt-3 text-sm text-gray-500">Nhập email để nhận link đặt lại mật khẩu.</p>

        {submitted ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
            Link khôi phục đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" className="w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-rose-400" placeholder="you@example.com" required />
            </div>
            <button type="submit" className="w-full rounded-full bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-600">
              Gửi link khôi phục
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
