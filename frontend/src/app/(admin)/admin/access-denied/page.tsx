import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Từ Chối Quyền Truy Cập</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Phân hệ <strong>GlowUp Admin Operations Portal</strong> chỉ dành cho tài khoản nhân viên và quản lý nội bộ. Tài khoản khách hàng thông thường không được cấp quyền truy cập.
        </p>
        <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left border border-slate-100 text-xs text-slate-600 space-y-1">
          <p>• Nếu bạn là nhân viên cửa hàng hoặc kho: Vui lòng liên hệ IT Quản trị để được cấp quyền.</p>
          <p>• Nếu bạn đang đăng nhập tài khoản mua sắm: Vui lòng quay về trang chủ.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#C85A70] hover:bg-[#b04a5e] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay Về Trang Chủ Mua Sắm
        </Link>
      </div>
    </div>
  );
}
