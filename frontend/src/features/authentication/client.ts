"use client";
import { ApiError } from "@/shared/api/errors";
import { z } from "zod";
import { requestBff } from "@/shared/api/browser";
const authResponse = z.object({ success: z.boolean().optional(), cart: z.enum(["none", "merged", "pending"]).optional(), revoked: z.boolean().optional(), code: z.enum(["ACCOUNT_LINK_REQUIRED", "EMAIL_VERIFICATION_REQUIRED"]).optional() });
export async function authPost(action: string, body: unknown) {
  return requestBff(`/api/auth/${action}`, authResponse, { method: "POST", body });
}
export function authMessage(error: unknown, login = false) {
  if (!(error instanceof ApiError)) return "Đã có lỗi xảy ra. Vui lòng thử lại.";
  if (error.code === "PHONE_VERIFICATION_REQUIRED") return "Số điện thoại này cần được xác minh. Bạn có thể đăng ký bằng email và bổ sung số điện thoại sau.";
  if (error.status === 429) return "Bạn đã thử nhiều lần. Vui lòng chờ trước khi thử lại.";
  if (error.code === "SESSION_RECOVERY_REQUIRED") return "Phiên đăng nhập cần được xác nhận lại. Vui lòng đăng nhập.";
  if (error.status === 401) return login ? "Email hoặc mật khẩu không đúng." : "Liên kết hoặc phiên xác thực đã hết hạn hay đã được sử dụng.";
  if (error.status === 403) return "Chưa thể tiếp tục. Hãy xác thực email và kiểm tra tài khoản đăng nhập.";
  if (error.status === 409) return "Thông tin này đã được sử dụng. Hãy đăng nhập hoặc kiểm tra email đã nhận.";
  if (error.status === 400 || error.status === 422) return "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại biểu mẫu hoặc yêu cầu liên kết mới.";
  return "Chưa thể kết nối dịch vụ. Thông tin bạn nhập vẫn được giữ lại để thử lại.";
}
export function retryDelay(value: string | null) {
  if (!value) return 60;
  const seconds = /^\d+$/.test(value) ? Number(value) : Math.ceil((Date.parse(value) - Date.now()) / 1000);
  return Number.isFinite(seconds) ? Math.max(1, seconds) : 60;
}
